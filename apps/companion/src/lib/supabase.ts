import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { sessionStorage } from "./storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // Shown in the dev console; the app renders a setup message instead of crashing.
  console.warn("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example)");
}

// Placeholder values (from .env.example / eas.json) count as "not configured".
export const supabaseConfigured = Boolean(url && key && !/YOUR-REF|REPLACE_ME|sb_publishable_xxx/.test(`${url}${key}`));

export const supabase = createClient(url ?? "https://placeholder.supabase.co", key ?? "placeholder", {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Keep the session fresh only while the app is open (native).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const functionsUrl = `${(url ?? "").replace(/\/+$/, "")}/functions/v1`;
