// Answers collected across the onboarding screens, saved to the profile at the end.
import { createContext, useContext, useState, type ReactNode } from "react";
import type { CompanionId } from "./theme";

export type Draft = {
  firstName: string;
  tradition: string;        // what they picked, e.g. "methodist"
  faithStage: string;
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
  companion: "pip",
  focus: [],
  morning: "07:00",
  evening: "20:30",
  pushToken: null,
};

const Ctx = createContext<{ draft: Draft; update: (p: Partial<Draft>) => void } | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(initial);
  return <Ctx.Provider value={{ draft, update: (p) => setDraft((d) => ({ ...d, ...p })) }}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return c;
}
