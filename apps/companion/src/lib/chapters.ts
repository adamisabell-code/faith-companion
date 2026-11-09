// Worlds that never reset. Every companion's world fills in "chapters":
//   Pip  – a bed of 30 flowers; each full bed grows the mustard tree beside it
//   Bram – a stretch of 8 lamps; each lit stretch reaches a new place on the road
//   Sola – a nest of 16 twigs; each finished nest stays in the tree
//   Lumi – 7 stars; each set becomes a constellation the user names
// Every world grows from kept days: what the user does, never a count of God's answers.
// Scripture is only ever referenced here, never quoted. Text comes from the database.
import type { CompanionId } from "./theme";

export const CHAPTER_SIZE: Record<CompanionId, number> = { pip: 30, bram: 8, sola: 16, lumi: 7 };

/** How full the current chapter is (1..size). A just-finished chapter shows full until the next one starts. */
export function progressIn(count: number, size: number) {
  return count <= 0 ? 0 : ((count - 1) % size) + 1;
}

/** Chapters finished so far. */
export function chaptersDone(count: number, size: number) {
  return Math.floor(Math.max(0, count) / size);
}

export type ChapterInfo = { title: string; line: string; reference?: string };

const pip: ChapterInfo[] = [
  { title: "The first sprout", line: "Thirty kept days. The bed is full, and something has taken root beside it. A fresh bed starts tomorrow." },
  { title: "A young tree", line: "Sixty days. It's taller than me now. That doesn't take much, but still." },
  { title: "The mustard tree", line: "Ninety days. A tiny seed, and look at it now. Jesus told a story about this.", reference: "Matthew 13:31–32" },
  { title: "Birds in the branches", line: "The birds have found it. Something you grew is now a place to rest." },
];

const bram: ChapterInfo[] = [
  { title: "The well", line: "The road's lit all the way to the well. Nice work. Onward." },
  { title: "The olive grove", line: "Olive grove. I'd stop for a snack, but we have places to be." },
  { title: "A house on the hill", line: "A house on the hill. We're getting somewhere." },
  { title: "The town on the hill", line: "There it is: the town on the hill. Lit up for anyone to see.", reference: "Matthew 5:14" },
  { title: "Another stretch of road", line: "Another stretch, and the town's a little brighter. I'm not tired. You're tired." },
];

const sola: ChapterInfo[] = [
  { title: "The first nest", line: "Sixteen twigs. The nest is finished. I'll start another one, a little higher." },
  { title: "A second nest", line: "Another one done. Not one sparrow is forgotten. Not one nest either.", reference: "Matthew 10:29–31" },
  { title: "Higher up", line: "Higher branches now. Small things, held well." },
  { title: "A tree full of nests", line: "Nests all through the tree. None of them were small to God." },
];

/** Where the road is headed (Bram), by chapter number (1-based). */
export const bramPlaces = ["the well", "the olive grove", "a house on the hill", "the town on the hill"];

/** Chapter n (1-based) for this companion. Later chapters reuse the last entry. */
export function chapterInfo(id: CompanionId, n: number): ChapterInfo {
  if (id === "lumi") {
    return { title: `Constellation ${n}`, line: "Seven kept days, and they've become a constellation. What would you like to call it?" };
  }
  const list = id === "pip" ? pip : id === "bram" ? bram : sola;
  return list[Math.min(n, list.length) - 1];
}

/** If moving to this count just finished a chapter, its number. Otherwise null. */
export function finishedChapter(id: CompanionId, count: number): number | null {
  const size = CHAPTER_SIZE[id];
  return count > 0 && count % size === 0 ? count / size : null;
}
