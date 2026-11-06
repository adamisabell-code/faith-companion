// Chat endpoint: POST /functions/v1/chat
//
// App calls (Authorization: Bearer <user's access token>):
//   { "message": "..." }     the user typed something
//   { "open": true }         the chat screen opened; the server adds a check-in if one is due
// Dev test tool (Authorization: Bearer <secret key>):
//   { "dev_user_id": "<uuid>", "message": "..." }  or  { "dev_user_id": "...", "checkin": "evening" }
// Returns: { "reply": string | null, "message_id": string | null, "checkin": kind | null, "tools_used": [...] }
import { createClient } from "npm:@supabase/supabase-js@2";
import { admin, claimCheckin, dueCheckin, runTurn } from "../_shared/engine.ts";
import type { CheckinKind } from "../_shared/prompt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Normal users send their access token. The dev tool sends a secret key plus
// dev_user_id, verified by using that key against the admin API.
async function resolveUser(token: string, devUserId?: string): Promise<{ id: string; dev: boolean } | null> {
  if (devUserId) {
    const asKey = createClient(SUPABASE_URL, token, { auth: { persistSession: false } });
    const { data, error } = await asKey.auth.admin.getUserById(devUserId);
    return !error && data?.user ? { id: data.user.id, dev: true } : null;
  }
  const { data, error } = await admin.auth.getUser(token);
  return !error && data?.user ? { id: data.user.id, dev: false } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing Authorization header." }, 401);
  const who = await resolveUser(token, body.dev_user_id);
  if (!who) return json({ error: "Not signed in." }, 401);

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";

  try {
    if (message) {
      const r = await runTurn(who.id, { message });
      return json({ reply: r.reply, message_id: r.messageId, checkin: null, tools_used: r.toolsUsed });
    }

    // Check-in: forced by the dev tool, or decided by the server on app open.
    let kind: CheckinKind | null = null;
    const { data: p } = await admin.from("profiles")
      .select("user_id, timezone, morning_time, evening_time, onboarded_at").eq("user_id", who.id).maybeSingle();
    if (!p) return json({ error: "No profile yet. Finish setup first." }, 400);

    if (who.dev && ["first", "morning", "evening"].includes(body.checkin)) kind = body.checkin;
    else if (body.open) kind = await dueCheckin(p);
    else return json({ error: "Send a message, or open: true." }, 400);

    if (!kind) return json({ reply: null, message_id: null, checkin: null, tools_used: [] });

    // Dev tool may repeat check-ins; real users get each one once per day.
    if (!who.dev && !(await claimCheckin(who.id, kind, p.timezone))) {
      return json({ reply: null, message_id: null, checkin: null, tools_used: [] });
    }
    const r = await runTurn(who.id, { checkin: kind });
    return json({ reply: r.reply, message_id: r.messageId, checkin: kind, tools_used: r.toolsUsed });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
