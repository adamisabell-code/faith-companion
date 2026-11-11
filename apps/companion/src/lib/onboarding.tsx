// Answers collected across the onboarding screens, saved to the profile at the end.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CompanionId } from "./theme";

export type Draft = {
  firstName: string;
  tradition: string;        // what they picked, e.g. "methodist"
  faithStage: string;
  translation: string;      // "BSB" | "WEB" | "KJV" | "DRA"
  translationTouched: boolean; // user picked one themselves (don't auto-change it)
  companion: CompanionId;
  focus: string[];
  morning: string;          // "07:00"
  evening: string;          // "20:30"
  pushToken: string | null; // set on the times screen if they allow notifications
};

const initial: Draft = {
  firstName: "",
  tradition: "nondenominational",
  faithStage: "growing",
  translation: "BSB",
  translationTouched: false,
  companion: "pip",
  focus: [],
  morning: "07:00",
  evening: "20:30",
  pushToken: null,
};

const Ctx = createContext<{ draft: Draft; update: (p: Partial<Draft>) => void } | null>(null);

// People now meet their buddy before creating an account, so the answers are kept on
// the device until the account exists (they survive a refresh or confirming an email).
const KEY = "ab-onboarding-draft";

function loadDraft(): Draft {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return { ...initial, ...JSON.parse(raw), pushToken: null };
  } catch { /* start fresh */ }
  return initial;
}

/** True once they've picked a buddy and told us their name (ready to create the account). */
export const draftReady = (d: Draft) => d.firstName.trim().length > 0 && d.focus.length > 0;

export function clearDraft() {
  try { globalThis.localStorage?.removeItem(KEY); } catch { /* ignore */ }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  useEffect(() => {
    try { globalThis.localStorage?.setItem(KEY, JSON.stringify({ ...draft, pushToken: null })); } catch { /* ignore */ }
  }, [draft]);
  return <Ctx.Provider value={{ draft, update: (p) => setDraft((d) => ({ ...d, ...p })) }}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return c;
}
