// Lean product analytics: one row per meaningful moment, in our own database.
// No third-party trackers. NEVER pass anything the user typed (messages, prayers,
// names): only event names and small non-personal details like which buddy.
import { Platform } from "react-native";
import { supabase, supabaseConfigured } from "./supabase";

export type EventName =
  | "welcome_viewed"
  | "onboarding_buddy_picked"
  | "onboarding_focus_set"
  | "onboarding_about_done"
  | "signup_completed"
  | "onboarding_completed"
  | "first_message_sent"       // activation: they talked with their buddy
  | "message_sent"
  | "commitment_kept"
  | "prayer_pause_completed"
  | "prayer_marked_answered"
  | "chapter_finished"
  | "journal_opened"
  | "share_opened"
  | "share_completed"
  | "plus_viewed"
  | "plus_interest"
  | "free_limit_reached";

const store = (): Storage | undefined => {
  try { return globalThis.localStorage; } catch { return undefined; }
};

/** A random id for this device, so the pre-sign-up funnel can be counted. Not tied to a person. */
function anonId(): string | null {
  try {
    const s = store();
    if (!s) return null;
    let id = s.getItem("ab-anon-id");
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      s.setItem("ab-anon-id", id);
    }
    return id;
  } catch { return null; }
}

/** Record an event. Fire-and-forget: analytics must never slow down or break the app. */
export function track(name: EventName, props: Record<string, string | number | boolean | null> = {}) {
  if (!supabaseConfigured) return;
  (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      await supabase.from("events").insert({
        user_id: data.session?.user.id ?? null,
        anon_id: anonId(),
        name,
        props,
        platform: Platform.OS,
      });
    } catch { /* ignore */ }
  })();
}

/** Record an event only the first time on this device (e.g. the first message ever sent). */
export function trackOnce(name: EventName, props: Record<string, string | number | boolean | null> = {}) {
  try {
    const s = store();
    const key = `ab-once-${name}`;
    if (s?.getItem(key)) return;
    s?.setItem(key, "1");
  } catch { /* fall through and track */ }
  track(name, props);
}
