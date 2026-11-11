// Chat endpoint: POST /functions/v1/chat
//
// App calls (Authorization: Bearer <user's access token>):
//   { "message": "..." }     the user typed something
//   { "open": true }         the chat screen opened; the server adds a check-in if one is due
// Dev test tool (Authorization: Bearer <secret key>):
//   { "dev_user_id": "<uuid>", "message": "..." }  or  { "dev_user_id": "...", "checkin": "evening" }
// Returns: { "reply": string | null, "message_id": string | null, "checkin": kind | null, "tools_used": [...] }
import { createClient } from "npm:@supabase/supabase-js@2";
import { admin, claimCheckin, dueCheckin, overFreeLimit, overRateLimit, releaseCheckin, runTurn } from "../_shared/engine.ts";
import { ConsentRequired, type CheckinKind } from "../_shared/prompt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Normal users send their access token. The dev tool sends the project's secret
// key plus dev_user_id; only a real secret key can call the admin API below.
async function resolveUser(token: string, devUserId?: unknown): Promise<{ id: string; dev: boolean } | null> {
  if (devUserId !== undefined) {
    if (typeof devUserId !== "string" || !UUID.test(devUserId)) return null;
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

  try {
    // deno-lint-ignore no-explicit-any
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing Authorization header." }, 401);
    const who = await resolveUser(token, body.dev_user_id);
    if (!who) return json({ error: "Not signed in." }, 401);

    const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";

    if (message) {
      if (!who.dev) {
        const limited = await overRateLimit(who.id);
        if (limited) return json({ error: limited }, 429);
        // Free plan (only when the paywall is switched on): a gentle stop, not an error.
        const { data: tzRow } = await admin.from("profiles").select("timezone").eq("user_id", who.id).maybeSingle();
        if (await overFreeLimit(who.id, tzRow?.timezone ?? null)) {
          return json({ error: "That's today's free conversation. Your check-ins, prayer and journal are still here, and we can talk again tomorrow.", code: "free_limit" }, 402);
        }
      }
      const r = await runTurn(who.id, { message });
      return json({ reply: r.reply, message_id: r.messageId, checkin: null, tools_used: r.toolsUsed });
    }

    // Check-in: forced by the dev tool, or decided by the server on app open.
    const { data: p } = await admin.from("profiles")
      .select("user_id, timezone, morning_time, evening_time, onboarded_at, ai_consent_at").eq("user_id", who.id).maybeSingle();
    if (!p) return json({ error: "No profile yet. Finish setup first." }, 400);
    if (!p.ai_consent_at) throw new ConsentRequired();

    let kind: CheckinKind | null = null;
    if (who.dev && ["first", "morning", "evening"].includes(body.checkin)) kind = body.checkin;
    else if (body.open) kind = await dueCheckin(p);
    else return json({ error: "Send a message, or open: true." }, 400);

    if (!kind) return json({ reply: null, message_id: null, checkin: null, tools_used: [] });

    // Dev tool may repeat check-ins; real users get each one once per day.
    if (!who.dev && !(await claimCheckin(who.id, kind, p.timezone))) {
      return json({ reply: null, message_id: null, checkin: null, tools_used: [] });
    }
    try {
      const r = await runTurn(who.id, { checkin: kind });
      return json({ reply: r.reply, message_id: r.messageId, checkin: kind, tools_used: r.toolsUsed });
    } catch (e) {
      if (!who.dev) await releaseCheckin(who.id, kind, p.timezone); // let it retry next open
      throw e;
    }
  } catch (e) {
    if (e instanceof ConsentRequired) return json({ error: e.message, code: "consent_required" }, 403);
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
