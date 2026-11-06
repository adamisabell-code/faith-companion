// Scheduled check-ins: POST /functions/v1/send-checkins
// Called every 10 minutes by a Supabase cron job (see supabase/cron.sql) with
//   Authorization: Bearer <CRON_SECRET>
// For each user with reminders on, if their morning or evening check-in time has
// passed (within the last 2 hours) and it hasn't happened today, the companion
// writes the opener and we send it as a push notification.
import { admin, claimCheckin, dueCheckin, runTurn } from "../_shared/engine.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const WINDOW_MINUTES = 120;
const MAX_PER_RUN = 60;
const PARALLEL = 5;

type Row = {
  user_id: string; timezone: string; morning_time: string; evening_time: string;
  push_token: string; companions: { name: string } | null;
};

async function sendPush(token: string, title: string, body: string) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { Accept: "application/json", "Accept-encoding": "gzip, deflate", "Content-Type": "application/json" },
    body: JSON.stringify({ to: token, title, body, sound: "default", data: { screen: "chat" }, channelId: "checkins" }),
  });
  const json = await res.json().catch(() => ({}));
  const ticket = Array.isArray(json?.data) ? json.data[0] : json?.data;
  return { ok: ticket?.status === "ok", error: ticket?.details?.error as string | undefined };
}

function preview(text: string) {
  const plain = text.replace(/\*+/g, "").replace(/\s+/g, " ").trim();
  return plain.length > 160 ? plain.slice(0, 157).trimEnd() + "…" : plain;
}

Deno.serve(async (req) => {
  const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!CRON_SECRET || auth !== CRON_SECRET) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await admin.from("profiles")
    .select("user_id, timezone, morning_time, evening_time, push_token, companions(name)")
    .not("push_token", "is", null).not("onboarded_at", "is", null)
    .limit(5000);
  if (error) return new Response(error.message, { status: 500 });

  const now = new Date();
  const due: { row: Row; kind: "morning" | "evening" }[] = [];
  for (const row of (data ?? []) as unknown as Row[]) {
    if (due.length >= MAX_PER_RUN) break;
    const kind = await dueCheckin(row, now, WINDOW_MINUTES);
    if (kind === "morning" || kind === "evening") due.push({ row, kind });
  }

  let sent = 0, skipped = 0, failed = 0;
  for (let i = 0; i < due.length; i += PARALLEL) {
    await Promise.all(due.slice(i, i + PARALLEL).map(async ({ row, kind }) => {
      try {
        if (!(await claimCheckin(row.user_id, kind, row.timezone, now))) { skipped++; return; }
        const { reply } = await runTurn(row.user_id, { checkin: kind });
        const push = await sendPush(row.push_token, row.companions?.name ?? "Your companion", preview(reply));
        if (push.ok) sent++;
        else {
          failed++;
          if (push.error === "DeviceNotRegistered") {
            await admin.from("profiles").update({ push_token: null }).eq("user_id", row.user_id);
          }
        }
      } catch (e) {
        failed++;
        console.error(`check-in failed for ${row.user_id}`, e);
      }
    }));
  }

  return new Response(JSON.stringify({ due: due.length, sent, skipped, failed }), { headers: { "Content-Type": "application/json" } });
});
