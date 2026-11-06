// Streak and week view, worked out from the commitments table.

export type Commitment = { id: string; text: string; for_date: string; status: "pending" | "done" | "partial" | "skipped" };
export type DayMark = { date: string; letter: string; state: "done" | "partial" | "missed" | "today" | "future" };

/** YYYY-MM-DD for a date in the device's local time. */
export function localDate(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function bestByDay(list: Commitment[]) {
  const rank = { done: 3, partial: 2, pending: 1, skipped: 0 } as const;
  const map = new Map<string, Commitment["status"]>();
  for (const c of list) {
    const prev = map.get(c.for_date);
    if (!prev || rank[c.status] > rank[prev]) map.set(c.for_date, c.status);
  }
  return map;
}

/**
 * Days in a row with a commitment kept (done or partly done). Today counts once
 * it's done; if today is still open, the streak runs through yesterday.
 */
export function streak(list: Commitment[], now = new Date()): number {
  const days = bestByDay(list);
  const kept = (s?: string) => s === "done" || s === "partial";
  let n = 0;
  let cursor = kept(days.get(localDate(now))) ? now : addDays(now, -1);
  while (kept(days.get(localDate(cursor)))) { n++; cursor = addDays(cursor, -1); }
  return n;
}

/** The current week, Sunday to Saturday. */
export function week(list: Commitment[], now = new Date()): DayMark[] {
  const days = bestByDay(list);
  const today = localDate(now);
  const start = addDays(now, -now.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const key = localDate(d);
    const status = days.get(key);
    const letter = "SMTWTFS"[i];
    if (status === "done") return { date: key, letter, state: "done" };
    if (status === "partial") return { date: key, letter, state: "partial" };
    if (key === today) return { date: key, letter, state: "today" };
    if (key > today) return { date: key, letter, state: "future" };
    return { date: key, letter, state: "missed" };
  });
}

/** Growth stage for the companion: 0 new, 1 at 3 days, 2 at 7, 3 at 30. */
export function growthStage(days: number): 0 | 1 | 2 | 3 {
  if (days >= 30) return 3;
  if (days >= 7) return 2;
  if (days >= 3) return 1;
  return 0;
}

export const milestones = [3, 7, 30];
export function nextMilestone(days: number): number | null {
  return milestones.find((m) => m > days) ?? null;
}
