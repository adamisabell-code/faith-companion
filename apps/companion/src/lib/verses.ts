// "Verse for today": a reference picked from a short list for what the user is
// working on. Only references live here. The text always comes from the Bible
// database in the user's translation, so nothing is ever typed from memory.
import { supabase } from "./supabase";

type Ref = { book: string; chapter: number; verse: number };
const r = (book: string, chapter: number, verse: number): Ref => ({ book, chapter, verse });

const byFocus: Record<string, Ref[]> = {
  prayer: [r("PHP", 4, 6), r("MAT", 6, 6), r("1TH", 5, 17), r("JAS", 5, 16), r("PSA", 145, 18)],
  bible: [r("PSA", 119, 105), r("JOS", 1, 8), r("2TI", 3, 16), r("HEB", 4, 12), r("PSA", 1, 2)],
  worry: [r("MAT", 6, 34), r("1PE", 5, 7), r("PHP", 4, 7), r("ISA", 41, 10), r("PSA", 55, 22)],
  relationship: [r("COL", 3, 13), r("EPH", 4, 32), r("1CO", 13, 4), r("ROM", 12, 18), r("PRO", 15, 1)],
  habit: [r("1CO", 10, 13), r("GAL", 5, 1), r("ROM", 12, 2), r("2CO", 5, 17), r("HEB", 12, 1)],
  grief: [r("PSA", 34, 18), r("MAT", 5, 4), r("REV", 21, 4), r("PSA", 23, 4), r("2CO", 1, 3)],
  general: [r("PSA", 46, 1), r("JHN", 14, 27), r("ISA", 40, 31), r("ROM", 8, 28), r("LAM", 3, 22)],
};

function dayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** Same verse all day, a new one tomorrow, rotating through the user's focus areas. */
export function pickVerse(focus: string[], date = new Date()): Ref {
  const pool = (focus.length ? focus : ["general"]).flatMap((f) => byFocus[f] ?? []).concat(byFocus.general);
  return pool[dayNumber(date) % pool.length];
}

export type Verse = { reference: string; text: string; translation: string };

export async function loadVerse(ref: Ref, translation: string): Promise<Verse | null> {
  // Douay-Rheims numbers most Psalms differently; use World English for Psalms there.
  const t = translation === "DRA" && ref.book === "PSA" ? "WEB" : translation || "BSB";
  const { data, error } = await supabase.rpc("get_passage", {
    p_translation: t, p_book: ref.book, p_chapter: ref.chapter, p_verse_start: ref.verse, p_verse_end: ref.verse,
  });
  if (error || !data?.length) return null;
  const v = data[0] as { book_name: string; chapter: number; verse: number; text: string };
  return { reference: `${v.book_name} ${v.chapter}:${v.verse}`, text: v.text, translation: t };
}
