// Chat endpoint: POST /functions/v1/chat
//
// App calls:   Authorization: Bearer <user's Supabase access token>
//              body: { "message": "..." }  or  { "checkin": "morning" | "evening" }
// Dev testing: Authorization: Bearer <service/secret key>
//              body: { "dev_user_id": "<uuid>", "message": "..." }
// Returns:     { "reply": "...", "tools_used": ["get_passage", ...] }
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildContext, checkinCue } from "./prompt.ts";
import { runTool, toolDefs } from "./tools.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5";
const VOYAGE_KEY = Deno.env.get("VOYAGE_API_KEY") ?? undefined;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const HISTORY_LIMIT = 30;   // past messages sent to the model
const MAX_TOOL_ROUNDS = 6;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Figure out who is calling. Normal users send their access token; the dev
// tool sends a secret key plus dev_user_id, which we verify by using that key
// against the admin API (only a real secret key can do that).
async function resolveUser(token: string, devUserId?: string): Promise<string | null> {
  if (devUserId) {
    const asKey = createClient(SUPABASE_URL, token, { auth: { persistSession: false } });
    const { data, error } = await asKey.auth.admin.getUserById(devUserId);
    return !error && data?.user ? data.user.id : null;
  }
  const { data, error } = await admin.auth.getUser(token);
  return !error && data?.user ? data.user.id : null;
}

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };
type Msg = { role: "user" | "assistant"; content: string | Block[] };

async function callClaude(system: string, messages: Msg[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, tools: toolDefs, messages }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return await res.json() as { content: Block[]; stop_reason: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!ANTHROPIC_KEY) return json({ error: "ANTHROPIC_API_KEY secret is not set in Supabase." }, 500);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing Authorization header." }, 401);
  const userId = await resolveUser(token, body.dev_user_id);
  if (!userId) return json({ error: "Not signed in." }, 401);

  const message: string | undefined = typeof body.message === "string" ? body.message.trim() : undefined;
  const checkin: "morning" | "evening" | undefined =
    body.checkin === "morning" || body.checkin === "evening" ? body.checkin : undefined;
  if (!message && !checkin) return json({ error: "Send a message or a checkin." }, 400);

  try {
    const ctx = await buildContext(admin, userId);

    // Conversation history, oldest first. Keep only plain text turns.
    const { data: past } = await admin.from("messages").select("role, content")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(HISTORY_LIMIT);
    const history: Msg[] = (past ?? []).reverse().map((m) => ({ role: m.role, content: m.content }));

    // Store the user's message now so a safety log can point at it.
    let userMessageId: string | undefined;
    if (message) {
      const { data } = await admin.from("messages")
        .insert({ user_id: userId, role: "user", content: message }).select("id").single();
      userMessageId = data?.id;
    }

    const firstName = (ctx.system.match(/- First name: (.+)/)?.[1] ?? "the user").trim();
    const turn = message ?? checkinCue(checkin!, firstName);

    // The API needs alternating roles starting with user; merge any repeats.
    const messages: Msg[] = [];
    for (const m of [...history, { role: "user" as const, content: turn }]) {
      const last = messages[messages.length - 1];
      if (last && last.role === m.role && typeof last.content === "string" && typeof m.content === "string") {
        last.content += "\n\n" + m.content;
      } else {
        messages.push({ ...m });
      }
    }
    // History can start with a check-in opener from the companion; the API needs a user turn first.
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

    await admin.from("messages").insert({ user_id: userId, role: "assistant", content: reply });
    if (checkin) {
      await admin.from("check_ins").insert({
        user_id: userId, kind: checkin, scheduled_for: new Date().toISOString(), sent_at: new Date().toISOString(),
      });
    }

    return json({ reply, tools_used: toolsUsed });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
