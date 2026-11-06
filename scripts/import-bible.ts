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

// Some ebible files use alternate codes for these books.
const codeFix: Record<string, string> = { ESG: "EST", DAG: "DAN", PS2: "PSA" };

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
  const text = m[4].replace(/\s+/g, " ").trim();
  if (!text) continue;
  rows.push({ translation_id: translationId, book_id: book, chapter: +m[2], verse: +m[3], text });
}

for (const batch of chunk(rows, 1000)) {
  const { error } = await db.from("verses").upsert(batch);
  if (error) throw error;
}

console.log(`Imported ${rows.length} verses into ${translationId}.`);
if (skipped.size) console.log("Skipped unknown book codes:", Object.fromEntries(skipped));
