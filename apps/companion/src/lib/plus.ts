// Amen Buddy Plus: what it is, what it costs, and whether this account has it.
//
// PURCHASES_LIVE stays false until the store products exist and Adam says go.
// While it's false the Plus screen takes no money: it shows the offer and lets
// people say "I'd want this", which is recorded as a plus_interest event (a demand signal).
import { useEffect, useState } from "react";
import { useSession } from "./session";
import { supabase } from "./supabase";

export const PURCHASES_LIVE = false; // TODO(launch): flip only after RevenueCat + App Store products are set up

export type PlanId = "annual" | "monthly";

// Prices to test first. See docs/strategy.md for the reasoning.
export const plans: Record<PlanId, { title: string; price: string; per: string; note: string }> = {
  annual: { title: "Yearly", price: "$49.99", per: "a year", note: "7 days free, then about $4.17 a month" },
  monthly: { title: "Monthly", price: "$7.99", per: "a month", note: "Cancel anytime" },
};

export const freeForever = [
  "Your buddy and their world",
  "Morning and evening check-ins",
  "Today's words of Jesus, and sharing them",
  "Pause and pray",
  "Your journal",
  "A conversation with your buddy every day",
];

export const plusAdds: { title: string; body: string; soon?: boolean }[] = [
  { title: "Talk as long as you need", body: "No daily limit on conversations. Hard days don't run on a meter." },
  { title: "A Sunday letter", body: "Each week your buddy writes you a short look back: what you kept, what you carried, where God showed up.", soon: true },
  { title: "Read a book of the Bible together", body: "A chapter a day with your buddy, at your pace, in your translation.", soon: true },
];

/** Does the signed-in account have Plus right now? (false while loading or signed out) */
export function usePlus(): { plus: boolean; loaded: boolean } {
  const { session } = useSession();
  const [state, setState] = useState({ plus: false, loaded: false });
  const uid = session?.user.id;
  useEffect(() => {
    let alive = true;
    if (!uid) { setState({ plus: false, loaded: true }); return; }
    supabase.from("subscriptions").select("status, current_period_end").eq("user_id", uid).maybeSingle().then(({ data }) => {
      if (!alive) return;
      const row = data as { status: string; current_period_end: string | null } | null;
      const entitled = !!row && ["trialing", "active", "grace", "cancelled"].includes(row.status)
        && (!row.current_period_end || new Date(row.current_period_end).getTime() > Date.now());
      setState({ plus: entitled, loaded: true });
    });
    return () => { alive = false; };
  }, [uid]);
  return state;
}
