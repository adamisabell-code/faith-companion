// Scheduled check-ins: POST /functions/v1/send-checkins
// Called every 10 minutes by a Supabase cron job (see supabase/cron.sql) with
//   Authorization: Bearer <CRON_SECRET>
// For each user with reminders on, if their morning or evening check-in time has
// passed (within the last 2 hours) and it hasn't happened today, the companion
// writes the opener and we send a push notification pointing to it.
import { admin, claimCheckin, dueCheckin, releaseCheckin, runTurn } from "../_shared/engine.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const WINDOW_MINUTES = 120;
const MAX_PER_RUN = 20;          // conversations generated per run; the rest go next run
const TIME_BUDGET_MS = 100_000;  // stop starting new work well before the function time limit
const PARALLEL = 5;

type Row = {
  user_id: string; timezone: string | null; morning_time: string; evening_time: string;
  push_token: string; companions: { name: string } | null;
};

// The notification text is deliberately generic: it shows on the lock screen,
// and replies can mention private things like prayer requests.
function notificationText(name: string, kind: "morning" | "evening") {
  return kind === "morning"
    ? { title: name, body: `Good morning. ${name} is here to help you plan today.` }
    : { title: name, body: `${name} is checking in on your day.` };
}

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

Deno.serve(async (req) => {
  const started = Date.now();
  const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!CRON_SECRET || auth !== CRON_SECRET) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await admin.from("profiles")
    .select("user_id, timezone, morning_time, evening_time, push_token, companions(name)")
    .not("push_token", "is", null).not("onboarded_at", "is", null).not("ai_consent_at", "is", null)
    .limit(5000);
  if (error) return new Response(error.message, { status: 500 });

  const now = new Date();
  const due: { row: Row; kind: "morning" | "evening" }[] = [];
  for (const row of (data ?? []) as unknown as Row[]) {
    if (due.length >= MAX_PER_RUN || Date.now() - started > TIME_BUDGET_MS / 3) break;
    try {
      const kind = await dueCheckin(row, now, WINDOW_MINUTES);
      if (kind === "morning" || kind === "evening") due.push({ row, kind });
    } catch (e) {
      console.error(`due check failed for ${row.user_id}`, e); // one bad profile never blocks the rest
    }
  }

  let sent = 0, skipped = 0, failed = 0, deferred = 0;
  for (let i = 0; i < due.length; i += PARALLEL) {
    if (Date.now() - started > TIME_BUDGET_MS) { deferred += due.length - i; break; }
    await Promise.all(due.slice(i, i + PARALLEL).map(async ({ row, kind }) => {
      let claimed = false;
      try {
        if (!(await claimCheckin(row.user_id, kind, row.timezone, now))) { skipped++; return; }
        claimed = true;
        await runTurn(row.user_id, { checkin: kind });
        const name = row.companions?.name ?? "Your companion";
        const { title, body } = notificationText(name, kind);
        const push = await sendPush(row.push_token, title, body);
        if (push.ok) { sent++; return; }
        failed++;
        if (push.error === "DeviceNotRegistered") {
          await admin.from("profiles").update({ push_token: null }).eq("user_id", row.user_id);
        }
        // The message is saved either way; they'll see it when they open the app.
      } catch (e) {
        failed++;
        console.error(`check-in failed for ${row.user_id}`, e);
        if (claimed) await releaseCheckin(row.user_id, kind, row.timezone, now).catch(() => {});
      }
    }));
  }

  return new Response(JSON.stringify({ due: due.length, sent, skipped, failed, deferred }), { headers: { "Content-Type": "application/json" } });
});
