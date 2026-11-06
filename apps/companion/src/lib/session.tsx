// Who is signed in, and their profile row. Every screen reads from here.
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { CompanionId } from "./theme";

export type Profile = {
  user_id: string;
  first_name: string | null;
  tradition_id: string | null;
  tradition_choice: string | null;
  translation_id: string | null;
  companion_id: CompanionId | null;
  faith_stage: string | null;
  focus_areas: string[];
  morning_time: string;   // "07:00:00"
  evening_time: string;   // "20:30:00"
  timezone: string;
  push_token: string | null;
  onboarded_at: string | null;
  ai_consent_at: string | null;
};

type Ctx = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  /** True while the signed-in user's profile hasn't been fetched yet. */
  profileLoading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  saveProfile: (patch: Partial<Profile>) => Promise<{ error?: string }>;
};

const SessionContext = createContext<Ctx | null>(null);

export function deviceTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago"; } catch { return "America/Chicago"; }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Which user the current `profile` belongs to. Prevents routing on a stale/empty profile.
  const [profileFor, setProfileFor] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) { setProfile(null); setProfileFor(null); return null; }
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    setProfile((data as Profile) ?? null);
    setProfileFor(userId);
    return (data as Profile) ?? null;
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (alive) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      loadProfile(s?.user.id);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  // Keep the stored time zone current (people travel; check-ins follow them).
  useEffect(() => {
    const tz = deviceTimezone();
    if (profile?.onboarded_at && profile.timezone !== tz) {
      supabase.from("profiles").update({ timezone: tz }).eq("user_id", profile.user_id).then(() => {});
    }
  }, [profile]);

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session]);

  const saveProfile = useCallback(async (patch: Partial<Profile>) => {
    const userId = session?.user.id;
    if (!userId) return { error: "Not signed in." };
    const { error } = await supabase.from("profiles")
      .upsert({ user_id: userId, timezone: deviceTimezone(), ...patch }, { onConflict: "user_id" });
    if (error) return { error: error.message };
    await loadProfile(userId);
    return {};
  }, [session, loadProfile]);

  return (
    <SessionContext.Provider value={{
      ready, session, profile, refreshProfile, saveProfile,
      profileLoading: !!session && profileFor !== session.user.id,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
