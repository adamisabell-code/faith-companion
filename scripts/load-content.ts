// Loads /content/companions/*.md and /content/traditions/*.md into Supabase.
// Re-run any time you edit a profile or a companion prompt.
//   npm run load-content
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { adminClient } from "./lib";

const root = join(import.meta.dirname, "..", "content");
const db = adminClient();

function readDir(dir: string) {
  return readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".md"))
    .map((f) => matter(readFileSync(join(root, dir, f), "utf8")));
}

const companions = readDir("companions").map(({ data, content }) => ({
  id: data.id,
  name: data.name,
  species: data.species,
  verse_ref: data.verse_ref,
  story: data.story,
  greeting: data.greeting,
  theme_color: data.theme_color,
  system_prompt: content.trim(),
}));

const traditions = readDir("traditions").map(({ data, content }) => ({
  id: data.id,
  name: data.name,
  default_translation: data.default_translation ?? null,
  uses_deuterocanon: Boolean(data.uses_deuterocanon),
  profile_md: content.trim(),
  reviewed_by: data.reviewed_by ?? null,
}));

const sharedRules = readFileSync(join(root, "shared-rules.md"), "utf8").trim();

const c = await db.from("companions").upsert(companions);
if (c.error) throw c.error;
const t = await db.from("traditions").upsert(traditions);
if (t.error) throw t.error;
const p = await db.from("prompts").upsert({ key: "shared_rules", body: sharedRules, updated_at: new Date().toISOString() });
if (p.error) {
  if (p.error.code === "PGRST205" || /prompts/.test(p.error.message)) {
    throw new Error("The prompts table is missing. Run supabase/migrations/20261106010000_prompts.sql in the SQL Editor, then try again.");
  }
  throw p.error;
}

console.log(`Loaded ${companions.length} companions, ${traditions.length} traditions, and the shared rules.`);
