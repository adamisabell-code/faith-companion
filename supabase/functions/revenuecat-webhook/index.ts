// Store purchases -> the subscriptions table.  POST /functions/v1/revenuecat-webhook
//
// NOT LIVE YET. This only does anything once (1) RevenueCat is set up for the app,
// (2) its webhook points here, and (3) the REVENUECAT_WEBHOOK_SECRET secret is set.
// RevenueCat is told to use the Supabase user id as its "app user id", so each
// event says exactly which account it belongs to.
import { createClient } from "npm:@supabase/supabase-js@2";

const SECRET = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Constant-time comparison so the secret can't be guessed one character at a time. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type Status = "trialing" | "active" | "grace" | "cancelled" | "expired";

/** What an event means for access. null = nothing to change. */
export function statusFor(type: string, periodType?: string): Status | null {
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "NON_RENEWING_PURCHASE":
      return periodType === "TRIAL" ? "trialing" : "active";
    case "BILLING_ISSUE": return "grace";
    case "CANCELLATION": return "cancelled"; // keeps access until the paid period ends
    case "EXPIRATION": return "expired";
    default: return null; // TEST, TRANSFER, SUBSCRIBER_ALIAS, etc.
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!SECRET) return json({ error: "Webhook not configured." }, 503);
  const given = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!same(given, SECRET)) return json({ error: "Unauthorized" }, 401);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const ev = body?.event;
  if (!ev?.type) return json({ error: "No event." }, 400);

  const status = statusFor(String(ev.type), ev.period_type);
  const userId = String(ev.app_user_id ?? "");
  // Acknowledge events we don't act on so RevenueCat doesn't keep retrying them.
  if (!status || !UUID.test(userId)) return json({ ok: true, ignored: true });

  const end = Number(ev.expiration_at_ms);
  const { error } = await admin.from("subscriptions").upsert({
    user_id: userId,
    plan: "plus",
    status,
    source: "revenuecat",
    product_id: typeof ev.product_id === "string" ? ev.product_id.slice(0, 120) : null,
    current_period_end: Number.isFinite(end) && end > 0 ? new Date(end).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) {
    // 23503 = the account no longer exists (deleted). Nothing to do; don't retry forever.
    if (error.code === "23503") return json({ ok: true, ignored: true });
    console.error(error);
    return json({ error: "Could not save." }, 500);
  }
  return json({ ok: true });
});
