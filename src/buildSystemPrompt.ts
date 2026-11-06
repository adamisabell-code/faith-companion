// Assembles the system prompt for one chat turn.
// Order matters: shared rules first (they win conflicts), then tradition, then personality,
// then what the companion knows about this user right now.
import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sharedRules = readFileSync(join(import.meta.dirname, "..", "content", "shared-rules.md"), "utf8");

export async function buildSystemPrompt(db: SupabaseClient, userId: string, now = new Date()) {
  const { data: p, error } = await db
    .from("profiles")
    .select("first_name, faith_stage, focus_areas, translation_id, timezone, companions(*), traditions(*)")
    .eq("user_id", userId)
    .single();
  if (error) throw error;

  const today = now.toLocaleDateString("en-CA", { timeZone: p.timezone }); // YYYY-MM-DD

  const [commitments, prayers, memories] = await Promise.all([
    db.from("commitments").select("text, for_date, status")
      .eq("user_id", userId).order("for_date", { ascending: false }).limit(7),
    db.from("prayer_requests").select("id, text, follow_up_on, created_at")
      .eq("user_id", userId).eq("status", "open").order("created_at", { ascending: false }).limit(10),
    db.from("memories").select("fact")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
  ]);

  const companion = p.companions as any;
  const tradition = p.traditions as any;

  return [
    sharedRules,
    `# The user's tradition\n\n${tradition?.profile_md ?? "Unknown. Ask gently, and stick to beliefs shared by most Christians (the Apostles' and Nicene Creeds) until you know."}`,
    `# Your character\n\n${companion.system_prompt}`,
    `# About this user
- First name: ${p.first_name ?? "unknown"}
- Where they are with faith: ${p.faith_stage ?? "unknown"}
- What they want help with: ${(p.focus_areas ?? []).join(", ") || "not set"}
- Preferred translation: ${p.translation_id ?? tradition?.default_translation ?? "BSB"}
- Today's date in their time zone: ${today}

## Recent commitments
${(commitments.data ?? []).map((c) => `- ${c.for_date}: ${c.text} (${c.status})`).join("\n") || "- none yet"}

## Open prayer requests (follow up when due)
${(prayers.data ?? []).map((r) => `- [${r.id}] ${r.text}${r.follow_up_on ? ` (follow up ${r.follow_up_on})` : ""}`).join("\n") || "- none"}

## Things they've told you
${(memories.data ?? []).map((m) => `- ${m.fact}`).join("\n") || "- nothing yet"}`,
  ].join("\n\n---\n\n");
}
