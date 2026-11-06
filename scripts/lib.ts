import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (see .env.example)`);
  return v;
}

// Accepts common copy-paste variants and reduces them to https://<ref>.supabase.co
function projectUrl(raw: string): string {
  const s = raw.trim().replace(/^["']|["']$/g, "");
  const dash = s.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) return `https://${dash[1]}.supabase.co`;
  const m = s.match(/^(https?:\/\/[^/]+)/i);
  if (!m) throw new Error(`SUPABASE_URL doesn't look like a URL: "${s}". Expected https://<project-ref>.supabase.co`);
  return m[1];
}

export function adminClient() {
  return createClient(projectUrl(env("SUPABASE_URL")), env("SUPABASE_SERVICE_ROLE_KEY").trim(), {
    auth: { persistSession: false },
  });
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
