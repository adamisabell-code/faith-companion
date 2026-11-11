// Assembles the system prompt for one chat turn.
// Order matters: shared rules first (they win conflicts), then tradition, then personality,
// then what the companion knows about this user right now.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** A valid IANA time zone, falling back to Central if the stored value is bad. */
export function safeTz(tz: string | null | undefined): string {
  if (!tz) return "America/Chicago";
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; } catch { return "America/Chicago"; }
}

export class ConsentRequired extends Error {
  constructor() { super("Please review and accept how your messages are handled before chatting."); }
}

export type UserContext = {
  system: string;
  /** Rules + tradition + character: identical turn after turn, so the AI provider can cache it. */
  systemStable: string;
  /** What the buddy knows about this user right now: changes every turn. */
  systemLive: string;
  firstName: string;
  translation: string;
  includeDeuterocanon: boolean;
  companionName: string;
  today: string;
};

export async function buildContext(db: SupabaseClient, userId: string, now = new Date()): Promise<UserContext> {
  const { data: p, error } = await db
    .from("profiles")
    .select("first_name, faith_stage, focus_areas, translation_id, timezone, morning_time, evening_time, ai_consent_at, companions(*), traditions(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!p) throw new Error("No profile for this user yet. Finish onboarding first.");
  // Nothing goes to the AI provider without the user's explicit permission.
  if (!p.ai_consent_at) throw new ConsentRequired();

  // deno-lint-ignore no-explicit-any
  const companion = p.companions as any;
  // deno-lint-ignore no-explicit-any
  const tradition = p.traditions as any;
  if (!companion) throw new Error("No companion picked yet.");

  const tz = safeTz(p.timezone);
  const today = now.toLocaleDateString("en-CA", { timeZone: tz });
  const localTime = now.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const weekday = now.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });

  const [rules, commitments, prayers, memories] = await Promise.all([
    db.from("prompts").select("body").eq("key", "shared_rules").maybeSingle(),
    db.from("commitments").select("text, for_date, status, note")
      .eq("user_id", userId).order("for_date", { ascending: false }).limit(7),
    db.from("prayer_requests").select("id, text, follow_up_on, created_at")
      .eq("user_id", userId).eq("status", "open").order("created_at", { ascending: false }).limit(10),
    db.from("memories").select("fact")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
  ]);
  if (!rules.data?.body) throw new Error("Shared rules missing. Run npm run load-content.");

  const translation = p.translation_id ?? tradition?.default_translation ?? "BSB";

  const systemStable = [
    rules.data.body,
    `# The user's tradition\n\n${tradition?.profile_md ?? "Unknown. Ask gently, and stick to beliefs shared by most Christians (the Apostles' and Nicene Creeds) until you know."}`,
    `# Your character\n\n${companion.system_prompt}`,
  ].join("\n\n---\n\n");

  const systemLive = `# About this user
- First name: ${p.first_name ?? "unknown"}
- Where they are with faith: ${p.faith_stage ?? "unknown"}
- What they want help with: ${(p.focus_areas ?? []).join(", ") || "not set"}
- Preferred translation: ${translation}
- Bible includes deuterocanonical books: ${tradition?.uses_deuterocanon ? "yes" : "no"}
- Check-in times: morning ${String(p.morning_time).slice(0, 5)}, evening ${String(p.evening_time).slice(0, 5)}
- Right now for them: ${weekday} ${today}, ${localTime} (${tz})

## Recent commitments (newest first)
${(commitments.data ?? []).map((c) => `- ${c.for_date}: ${c.text} (${c.status}${c.note ? `, note: ${c.note}` : ""})`).join("\n") || "- none yet"}

## Open prayer requests (follow up when due)
${(prayers.data ?? []).map((r) => `- [id ${r.id}] ${r.text}${r.follow_up_on ? ` (follow up ${r.follow_up_on})` : ""}`).join("\n") || "- none"}

## Things they've told you
${(memories.data ?? []).map((m) => `- ${m.fact}`).join("\n") || "- nothing yet"}`;

  const system = `${systemStable}\n\n---\n\n${systemLive}`;

  return {
    system,
    systemStable,
    systemLive,
    firstName: (p.first_name ?? "the user").trim() || "the user",
    translation,
    includeDeuterocanon: Boolean(tradition?.uses_deuterocanon),
    companionName: companion.name,
    today,
  };
}

export type CheckinKind = "first" | "morning" | "evening";

// Synthetic user turn for check-ins (not stored as a user message).
export function checkinCue(kind: CheckinKind, name: string): string {
  if (kind === "first") {
    return `[${name} just finished setting up the app and is opening the chat with you for the first time. Introduce yourself in character in 2-3 short sentences, set expectations (you'll check in each morning and evening), then help them pick one small, concrete commitment for today based on what they said they want help with. Keep it short.]`;
  }
  return kind === "morning"
    ? `[It's ${name}'s scheduled morning check-in. Open the conversation in character: greet them briefly, mention any prayer request due for follow-up today, and help them set one small, concrete commitment for today. Keep it short.]`
    : `[It's ${name}'s scheduled evening check-in. Open the conversation in character and ask how today's commitment went, naming it specifically. If there's no commitment for today, ask how their day went with God. Keep it short.]`;
}
