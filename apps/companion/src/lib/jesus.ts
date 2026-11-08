// The words of Jesus that open the home screen. Only references live here: every
// one is a verse spoken entirely by Jesus, and the text always comes from the
// Bible database in the user's chosen translation (never typed from memory).
import { supabase } from "./supabase";

type Ref = { book: string; chapter: number; verse: number };
const r = (book: string, chapter: number, verse: number): Ref => ({ book, chapter, verse });

const byFocus: Record<string, Ref[]> = {
  prayer: [r("MAT", 7, 7), r("MRK", 11, 24), r("MAT", 18, 20), r("MAT", 6, 6)],
  bible: [r("JHN", 15, 7), r("MAT", 24, 35), r("JHN", 15, 5)],
  worry: [r("MAT", 6, 34), r("MAT", 6, 27), r("MAT", 10, 31), r("JHN", 14, 27), r("LUK", 12, 32), r("MAT", 11, 28)],
  relationship: [r("JHN", 13, 34), r("MAT", 5, 44), r("MAT", 6, 14), r("MAT", 5, 9)],
  habit: [r("JHN", 8, 36), r("MAT", 26, 41), r("MAT", 11, 30), r("JHN", 10, 10)],
  grief: [r("MAT", 5, 4), r("JHN", 14, 1), r("JHN", 16, 33), r("MAT", 11, 28), r("JHN", 14, 27)],
  general: [r("JHN", 14, 27), r("JHN", 15, 5), r("MAT", 6, 33), r("MAT", 5, 16), r("JHN", 10, 11)],
};

function dayNumber(d: Date) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** Same words all day, new ones tomorrow, drawn from what the user is working on. */
export function pickWords(focus: string[], date = new Date()): Ref {
  const pool = [...new Set((focus.length ? focus : ["general"]).flatMap((f) => byFocus[f] ?? []).concat(byFocus.general))];
  return pool[dayNumber(date) % pool.length];
}

export type Words = { text: string; reference: string; translation: string };

export async function loadWords(ref: Ref, translation: string): Promise<Words | null> {
  const t = translation || "BSB";
  const { data, error } = await supabase.rpc("get_passage", {
    p_translation: t, p_book: ref.book, p_chapter: ref.chapter, p_verse_start: ref.verse, p_verse_end: ref.verse,
  });
  if (error || !data?.length) return null;
  const v = data[0] as { book_name: string; chapter: number; verse: number; text: string };
  // The verse may carry its own quotation marks; we add our own.
  let text = v.text.trim().replace(/^[“"‘']+/, "").replace(/[”"’']+$/, "").trim();
  // A verse can end mid-sentence (e.g. with a comma); close it cleanly for display.
  text = text.replace(/[,;:]$/, ".");
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return { text, reference: `${v.book_name} ${v.chapter}:${v.verse}`, translation: t };
}
