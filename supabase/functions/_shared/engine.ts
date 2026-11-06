// The companion "engine": one conversational turn, plus check-in timing.
// Used by the chat function (user messages, app opens) and send-checkins (scheduled pushes).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { buildContext, checkinCue, type CheckinKind } from "./prompt.ts";
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

async function callClaude(system: string, messages: Msg[]) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, tools: toolDefs, messages }),
    });
    if (res.ok) return await res.json() as { content: Block[]; stop_reason: string };
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

  const firstName = (ctx.system.match(/- First name: (.+)/)?.[1] ?? "the user").trim();
  const turn = opts.message ?? checkinCue(opts.checkin!, firstName);

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
  let reply = "";
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await callClaude(ctx.system, messages);
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
  return { reply, messageId: saved?.id ?? null, toolsUsed };
}

// ---------- Check-in timing ----------

export type ProfileTiming = { user_id: string; timezone: string | null; morning_time: string; evening_time: string };

export function localNow(tz: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
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
  const tz = p.timezone || "America/Chicago";
  const { date, minutes } = localNow(tz, now);

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
export async function claimCheckin(userId: string, kind: CheckinKind, tz: string, now = new Date()): Promise<boolean> {
  const { date } = localNow(tz || "America/Chicago", now);
  const { error } = await admin.from("check_ins").insert({
    user_id: userId, kind, local_date: date, scheduled_for: now.toISOString(), sent_at: now.toISOString(),
  });
  if (!error) return true;
  if (error.code === "23505") return false; // unique violation: already done today
  throw error;
}
