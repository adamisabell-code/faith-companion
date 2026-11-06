// Builds search embeddings from the BSB text (plus deuterocanon from WEB,
// since BSB doesn't include those books). Safe to re-run: skips verses that
// already have an embedding.
//   npm run embed-verses
import { adminClient, chunk, env } from "./lib";

const db = adminClient();
const model = process.env.VOYAGE_MODEL ?? "voyage-3.5";
const key = env("VOYAGE_API_KEY");

type Verse = { book_id: string; chapter: number; verse: number; text: string };

async function fetchAll(translation: string, onlyDC: boolean): Promise<Verse[]> {
  const out: Verse[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db
      .from("verses")
      .select("book_id, chapter, verse, text, books!inner(testament)")
      .eq("translation_id", translation)
      .order("book_id").order("chapter").order("verse")
      .range(from, from + 999);
    if (onlyDC) q = q.eq("books.testament", "DC");
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data as unknown as Verse[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function existingKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("verse_embeddings").select("book_id, chapter, verse").range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) keys.add(`${r.book_id}.${r.chapter}.${r.verse}`);
    if (!data || data.length < 1000) break;
  }
  return keys;
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: texts, input_type: "document", output_dimension: 1024 }),
  });
  if (!res.ok) throw new Error(`Voyage error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

const have = await existingKeys();
const verses = [...(await fetchAll("BSB", false)), ...(await fetchAll("WEB", true))]
  .filter((v) => !have.has(`${v.book_id}.${v.chapter}.${v.verse}`));

console.log(`Embedding ${verses.length} verses with ${model}...`);
let done = 0;
for (const batch of chunk(verses, 128)) {
  const vectors = await embed(batch.map((v) => v.text));
  const rows = batch.map((v, i) => ({
    book_id: v.book_id, chapter: v.chapter, verse: v.verse,
    embedding: JSON.stringify(vectors[i]),
  }));
  const { error } = await db.from("verse_embeddings").upsert(rows);
  if (error) throw error;
  done += batch.length;
  if (done % 2048 < 128) console.log(`  ${done}/${verses.length}`);
}
console.log("Done.");
