import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (see .env.example)`);
  return v;
}

export function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
