// Imports a public-domain Bible into the verses table.
//
// Input: a "verse per line" (VPL) text file, one verse per line:
//   GEN 1:1 In the beginning God created the heavens and the earth.
// ebible.org publishes VPL downloads for BSB, KJV, WEB and Douay-Rheims
// (see the README for links). Unzip into ./data first.
//
//   npm run import-bible -- BSB data/engbsb_vpl.txt
import { readFileSync } from "node:fs";
import { adminClient, chunk } from "./lib";

const [translationId, file] = process.argv.slice(2);
if (!translationId || !file) {
  console.error("Usage: npm run import-bible -- <TRANSLATION_ID> <path/to/vpl.txt>");
  process.exit(1);
}

const db = adminClient();

const { data: books, error: booksErr } = await db.from("books").select("id");
if (booksErr) throw booksErr;
const known = new Set(books!.map((b) => b.id as string));

// PS2 is Psalm 151 in some editions. Greek Esther (ESG) and Greek Daniel (DAG)
// are separate files that reuse chapter/verse numbers, so they are skipped
// rather than merged (merging would overwrite the regular Esther/Daniel text).
// ebible's VPL files use BibleWorks-style codes for some books; map them to USFM.
const codeFix: Record<string, string> = {
  PS2: "PSA",
  SOL: "SNG", EZE: "EZK", JOE: "JOL", NAH: "NAM",
  MAR: "MRK", JOH: "JHN", PHI: "PHP", JAM: "JAS",
  "1JO": "1JN", "2JO": "2JN", "3JO": "3JN",
};

const line = /^([1-3]?[A-Z]{2,3}[0-9]?)\s+(\d+):(\d+)\s+(.*)$/;
const rows: { translation_id: string; book_id: string; chapter: number; verse: number; text: string }[] = [];
const skipped = new Map<string, number>();

for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
  const m = raw.trim().match(line);
  if (!m) continue;
  const book = codeFix[m[1]] ?? m[1];
  if (!known.has(book)) {
    skipped.set(book, (skipped.get(book) ?? 0) + 1);
    continue;
  }
  const text = m[4]
    .replace(/<[^>]+>/g, "")   // stray markup
    .replace(/\{[^}]*\}/g, "") // footnote/Strong's markers in some exports
    .replace(/\s+/g, " ")
    .trim();
  if (!text) continue;
  rows.push({ translation_id: translationId, book_id: book, chapter: +m[2], verse: +m[3], text });
}

for (const batch of chunk(rows, 1000)) {
  const { error } = await db.from("verses").upsert(batch);
  if (error) throw error;
}

console.log(`Imported ${rows.length} verses into ${translationId}.`);
if (skipped.size) console.log("Skipped unknown book codes:", Object.fromEntries(skipped));
