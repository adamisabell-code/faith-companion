// Permanently deletes the signed-in user's account: POST /functions/v1/delete-account
// with Authorization: Bearer <user's access token>.
// Every user table references auth.users with ON DELETE CASCADE, so deleting the
// auth user removes profiles, messages, commitments, prayer requests, memories,
// check-ins, reports and safety logs.
import { admin } from "../_shared/engine.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return json({ error: "Not signed in." }, 401);

  const { error: delErr } = await admin.auth.admin.deleteUser(data.user.id);
  if (delErr) return json({ error: delErr.message }, 500);
  return json({ deleted: true });
});
