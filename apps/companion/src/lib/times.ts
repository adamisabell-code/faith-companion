// Check-in times are "HH:MM". The morning check-in must come before the evening one
// (the scheduler relies on it), and both stay within the same day.
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function timesValid(morning: string, evening: string): boolean {
  return toMinutes(morning) < toMinutes(evening);
}
