// Talk to a companion from your terminal, through the deployed chat function.
//   npm run chat              (defaults: Bram, non-denominational)
//   npm run chat -- lumi catholic
//
// Commands while chatting:
//   /morning  /evening        trigger a scheduled check-in
//   /companion <pip|bram|sola|lumi>
//   /tradition <nondenominational|baptist|catholic>
//   /reset                    clear this test user's history, commitments, prayers, memories
//   /quit
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { adminClient, env } from "./lib";

const TEST_EMAIL = "test-companion@example.com";
const db = adminClient();
const url = env("SUPABASE_URL").replace(/\/+$/, "").match(/^https?:\/\/[^/]+/)![0];
const key = env("SUPABASE_SERVICE_ROLE_KEY").trim();

const [argCompanion = "bram", argTradition = "nondenominational"] = process.argv.slice(2);

async function testUserId(): Promise<string> {
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const found = list.users.find((u) => u.email === TEST_EMAIL);
  if (found) return found.id;
  const { data, error: e2 } = await db.auth.admin.createUser({ email: TEST_EMAIL, email_confirm: true });
  if (e2) throw e2;
  return data.user.id;
}

const userId = await testUserId();

async function setProfile(patch: Record<string, unknown>) {
  const { error } = await db.from("profiles").upsert({
    user_id: userId,
    first_name: "Jordan",
    faith_stage: "growing",
    focus_areas: ["prayer", "relationship"],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...patch,
  });
  if (error) throw error;
}

await setProfile({ companion_id: argCompanion, tradition_id: argTradition });
let companion = argCompanion;

async function send(body: Record<string, unknown>) {
  const res = await fetch(`${url}/functions/v1/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ dev_user_id: userId, ...body }),
  });
  const text = await res.text();
  let out: { reply?: string; tools_used?: string[]; error?: string };
  try { out = JSON.parse(text); } catch { out = { error: `${res.status}: ${text.slice(0, 300)}` }; }
  if (out.error) {
    console.log(`\n  [error] ${out.error}\n`);
    if (res.status === 404) console.log("  The chat function isn't deployed yet. See the README, 'Deploy the chat function'.\n");
    return;
  }
  const name = companion[0].toUpperCase() + companion.slice(1);
  console.log(`\n${name}: ${out.reply}`);
  if (out.tools_used?.length) console.log(`  (tools: ${out.tools_used.join(", ")})`);
  console.log();
}

console.log(`Chatting as Jordan with ${companion} (${argTradition}). Type /quit to exit, /evening or /morning for a check-in.\n`);

const rl = readline.createInterface({ input: stdin, output: stdout });
while (true) {
  const line = (await rl.question("You: ")).trim();
  if (!line) continue;
  if (line === "/quit") break;
  if (line === "/morning" || line === "/evening") { await send({ checkin: line.slice(1) }); continue; }
  if (line.startsWith("/companion ")) {
    companion = line.split(/\s+/)[1];
    await setProfile({ companion_id: companion });
    console.log(`  Switched to ${companion}.\n`);
    continue;
  }
  if (line.startsWith("/tradition ")) {
    const t = line.split(/\s+/)[1];
    await setProfile({ tradition_id: t });
    console.log(`  Tradition set to ${t}.\n`);
    continue;
  }
  if (line === "/reset") {
    for (const table of ["messages", "commitments", "prayer_requests", "memories", "check_ins", "safety_events"]) {
      await db.from(table).delete().eq("user_id", userId);
    }
    console.log("  Cleared test history.\n");
    continue;
  }
  await send({ message: line });
}
rl.close();
