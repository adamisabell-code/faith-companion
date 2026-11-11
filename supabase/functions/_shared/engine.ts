// The companion "engine": one conversational turn, plus check-in timing.
// Used by the chat function (user messages, app opens) and send-checkins (scheduled pushes).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { buildContext, checkinCue, safeTz, type CheckinKind } from "./prompt.ts";
import { runTool, toolDefs } from "./tools.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5";
const VOYAGE_KEY = Deno.env.get("VOYAGE_API_KEY") ?? undefined;
const HISTORY_LIMIT = 30;
const MAX_TOOL_ROUNDS = 6;

export const admin: SupabaseClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

export function assertConfigured() {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY secret is not set in Supabase.");
}

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };
type Msg = { role: "user" | "assistant"; content: string | Block[] };

type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
type ClaudeResponse = { content: Block[]; stop_reason: string; usage?: Usage };

// The rules, tradition and character are the same on every turn, so we mark them
// cacheable: the AI provider bills cached input at a fraction of the normal price.
// If the provider ever rejects the cached form, we fall back to the plain prompt.
let cachingOk = true;

async function callClaude(stable: string, live: string, messages: Msg[]): Promise<ClaudeResponse> {
  for (let attempt = 1; ; attempt++) {
    const system = cachingOk
      ? [{ type: "text", text: stable, cache_control: { type: "ephemeral" } }, { type: "text", text: live }]
      : `${stable}\n\n---\n\n${live}`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, tools: toolDefs, messages }),
    });
    if (res.ok) return await res.json() as ClaudeResponse;
    if (res.status === 400 && cachingOk) {
      const detail = await res.text();
      if (/cache/i.test(detail)) { cachingOk = false; console.warn("Prompt caching rejected; continuing without it.", detail); continue; }
      throw new Error(`Anthropic 400: ${detail}`);
    }
    // Retry briefly on overload / rate limits.
    if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
      continue;
    }
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
}

export type TurnResult = { reply: string; messageId: string | null; toolsUsed: string[] };

/**
 * Run one turn. Pass `message` for something the user typed, or `checkin` to
 * have the companion open the conversation. Stores the user message (if any)
 * and the companion's reply.
 */
export async function runTurn(userId: string, opts: { message?: string; checkin?: CheckinKind }): Promise<TurnResult> {
  assertConfigured();
  const ctx = await buildContext(admin, userId);

  const { data: past } = await admin.from("messages").select("role, content")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(HISTORY_LIMIT);
  const history: Msg[] = (past ?? []).reverse().map((m) => ({ role: m.role, content: m.content }));

  let userMessageId: string | undefined;
  if (opts.message) {
    const { data } = await admin.from("messages")
      .insert({ user_id: userId, role: "user", content: opts.message }).select("id").single();
    userMessageId = data?.id;
  }

  const turn = opts.message ?? checkinCue(opts.checkin!, ctx.firstName);

  // Alternate roles, starting with the user; merge any back-to-back turns.
  const messages: Msg[] = [];
  for (const m of [...history, { role: "user" as const, content: turn }]) {
    const last = messages[messages.length - 1];
    if (last && last.role === m.role && typeof last.content === "string" && typeof m.content === "string") {
      last.content += "\n\n" + m.content;
    } else {
      messages.push({ ...m });
    }
  }
  if (messages[0]?.role === "assistant") messages.unshift({ role: "user", content: "[Earlier conversation]" });

  const toolsUsed: string[] = [];
  const used = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, rounds: 0 };
  let reply = "";
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await callClaude(ctx.systemStable, ctx.systemLive, messages);
    used.rounds++;
    used.input += res.usage?.input_tokens ?? 0;
    used.output += res.usage?.output_tokens ?? 0;
    used.cacheRead += res.usage?.cache_read_input_tokens ?? 0;
    used.cacheWrite += res.usage?.cache_creation_input_tokens ?? 0;
    const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
    if (text) reply = text;
    if (res.stop_reason !== "tool_use") break;

    messages.push({ role: "assistant", content: res.content });
    const results: Block[] = [];
    for (const b of res.content) {
      if (b.type !== "tool_use") continue;
      toolsUsed.push(b.name);
      let out: unknown;
      try {
        out = await runTool(b.name, b.input, {
          db: admin, userId, translation: ctx.translation,
          includeDeuterocanon: ctx.includeDeuterocanon, voyageKey: VOYAGE_KEY,
        }, userMessageId);
      } catch (e) {
        out = { error: e instanceof Error ? e.message : String(e) };
      }
      results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out) });
    }
    messages.push({ role: "user", content: results });
  }
  if (!reply) reply = "Sorry, I lost my words for a second. Can you say that again?";

  const { data: saved } = await admin.from("messages")
    .insert({ user_id: userId, role: "assistant", content: reply }).select("id").single();

  // Record what this turn cost (token counts only, never content). Best-effort:
  // a missing table or failed write must never break the conversation.
  try {
    await admin.from("ai_usage").insert({
      user_id: userId, kind: opts.message ? "message" : "checkin", model: MODEL,
      input_tokens: used.input, output_tokens: used.output,
      cache_read_tokens: used.cacheRead, cache_write_tokens: used.cacheWrite, rounds: used.rounds,
    });
  } catch (e) { console.warn("ai_usage not recorded", e); }

  return { reply, messageId: saved?.id ?? null, toolsUsed };
}

// ---------- Check-in timing ----------

export type ProfileTiming = { user_id: string; timezone: string | null; morning_time: string; evening_time: string };

export function localNow(tz: string | null | undefined, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: safeTz(tz), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/**
 * Which check-in is due right now, if any.
 * `windowMinutes` limits how late a check-in may still go out (the scheduler uses
 * a window so nobody gets a "good morning" at noon; app opens use no limit).
 */
export async function dueCheckin(p: ProfileTiming, now = new Date(), windowMinutes?: number): Promise<CheckinKind | null> {
  const { date, minutes } = localNow(p.timezone, now);

  const [{ count: anyMessages }, { data: todays }] = await Promise.all([
    admin.from("messages").select("id", { count: "exact", head: true }).eq("user_id", p.user_id),
    admin.from("check_ins").select("kind").eq("user_id", p.user_id).eq("local_date", date),
  ]);
  if (!anyMessages) return "first";
  const done = new Set((todays ?? []).map((r) => r.kind as string));

  const morning = toMinutes(p.morning_time);
  const evening = toMinutes(p.evening_time);
  const within = (start: number) => minutes >= start && (windowMinutes === undefined || minutes - start <= windowMinutes);

  if (within(evening) && !done.has("evening")) return "evening";
  if (within(morning) && minutes < evening && !done.has("morning") && !done.has("first")) {
    // Skip the morning check-in if they've already been chatting today.
    const startOfDayUtc = new Date(now.getTime() - minutes * 60_000).toISOString();
    const { count } = await admin.from("messages").select("id", { count: "exact", head: true })
      .eq("user_id", p.user_id).eq("role", "user").gte("created_at", startOfDayUtc);
    if (!count) return "morning";
  }
  return null;
}

/** Reserve today's check-in so it only ever happens once. Returns false if already taken. */
export async function claimCheckin(userId: string, kind: CheckinKind, tz: string | null, now = new Date()): Promise<boolean> {
  const { date } = localNow(tz, now);
  const { error } = await admin.from("check_ins").insert({
    user_id: userId, kind, local_date: date, scheduled_for: now.toISOString(), sent_at: now.toISOString(),
  });
  if (!error) return true;
  if (error.code === "23505") return false; // unique violation: already done today
  throw error;
}

/** Undo a claim when the check-in couldn't be delivered, so it can be retried. */
export async function releaseCheckin(userId: string, kind: CheckinKind, tz: string | null, now = new Date()) {
  const { date } = localNow(tz, now);
  await admin.from("check_ins").delete().eq("user_id", userId).eq("kind", kind).eq("local_date", date);
}

// ---------- Free plan (switched off until PAYWALL_ENABLED=true) ----------

const PAYWALL_ENABLED = Deno.env.get("PAYWALL_ENABLED") === "true";
const FREE_DAILY_MESSAGES = Math.max(1, Number(Deno.env.get("FREE_DAILY_MESSAGES") ?? "12") || 12);

/**
 * Has a free user used up today's conversation? Returns false unless the paywall
 * is switched on. Check-ins are never counted, Plus members are never limited,
 * and nobody is cut off within a day of a safety concern being logged.
 */
export async function overFreeLimit(userId: string, tz: string | null): Promise<boolean> {
  if (!PAYWALL_ENABLED) return false;
  const now = new Date();
  const { minutes } = localNow(tz, now);
  const startOfDay = new Date(now.getTime() - minutes * 60_000).toISOString();
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString();
  const [{ count: today }, plus, { count: safety }] = await Promise.all([
    admin.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user").gte("created_at", startOfDay),
    admin.rpc("is_plus", { p_user: userId }),
    admin.from("safety_events").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayAgo),
  ]);
  if (plus.data === true) return false;
  if ((safety ?? 0) > 0) return false;
  return (today ?? 0) >= FREE_DAILY_MESSAGES;
}

/** Simple per-user limits so one account can't run up the AI bill. */
export async function overRateLimit(userId: string): Promise<string | null> {
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: perMinute }, { count: perDay }] = await Promise.all([
    admin.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user").gte("created_at", minuteAgo),
    admin.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user").gte("created_at", dayAgo),
  ]);
  if ((perMinute ?? 0) >= 8) return "You're sending messages really fast. Take a breath and try again in a minute.";
  if ((perDay ?? 0) >= 300) return "You've reached today's message limit. Your companion will be here tomorrow.";
  return null;
}
