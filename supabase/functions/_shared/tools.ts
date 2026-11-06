// Tool definitions for Claude, and the code that runs each one against Supabase.
// get_passage is the ONLY way the model may quote Scripture.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const toolDefs = [
  {
    name: "get_passage",
    description:
      "Look up the exact text of a Bible passage. Always call this before quoting any verse. Display only the text it returns, with the reference and translation.",
    input_schema: {
      type: "object",
      properties: {
        book: { type: "string", description: "USFM book code, e.g. JHN, PSA, 1CO, JAS, TOB" },
        chapter: { type: "integer" },
        verse_start: { type: "integer" },
        verse_end: { type: "integer", description: "Optional last verse of a range (max 12 verses)" },
        translation: { type: "string", description: "Optional translation id (BSB, KJV, WEB, DRA). Defaults to the user's preference." },
      },
      required: ["book", "chapter", "verse_start"],
    },
  },
  {
    name: "search_verses",
    description:
      "Find Bible passages related to a topic or feeling (e.g. 'worry about money', 'grief after losing a parent'). Returns references with text. Confirm with get_passage before quoting.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        count: { type: "integer", description: "Max results, default 6" },
      },
      required: ["query"],
    },
  },
  {
    name: "save_commitment",
    description: "Save the user's commitment for a day, after they agree to it.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Short and concrete, e.g. 'Pray 5 minutes before work'" },
        for_date: { type: "string", description: "YYYY-MM-DD in the user's time zone" },
      },
      required: ["text", "for_date"],
    },
  },
  {
    name: "update_commitment",
    description: "Record how a commitment went during the evening check-in.",
    input_schema: {
      type: "object",
      properties: {
        for_date: { type: "string", description: "YYYY-MM-DD" },
        status: { type: "string", enum: ["done", "partial", "skipped"] },
        note: { type: "string" },
      },
      required: ["for_date", "status"],
    },
  },
  {
    name: "save_prayer_request",
    description: "Save something the user wants prayer for, with a date to gently follow up.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string" },
        follow_up_on: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["text"],
    },
  },
  {
    name: "update_prayer_request",
    description: "Mark a prayer request answered or archived, or move its follow-up date. Use the id shown in the open prayer list.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["open", "answered", "archived"] },
        follow_up_on: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "save_memory",
    description: "Remember a durable fact the user shared (a person's name, an ongoing situation). Not for sensitive health details unless the user asks.",
    input_schema: {
      type: "object",
      properties: { fact: { type: "string" } },
      required: ["fact"],
    },
  },
  {
    name: "log_safety_event",
    description: "Log that this conversation involved crisis content (self-harm, abuse, danger). Call alongside your supportive reply.",
    input_schema: {
      type: "object",
      properties: { category: { type: "string", enum: ["self_harm", "abuse", "danger", "medical", "other"] } },
      required: ["category"],
    },
  },
];

export type ToolContext = {
  db: SupabaseClient;          // service-role client; every query below filters by userId
  userId: string;
  translation: string;         // user's preferred translation
  includeDeuterocanon: boolean;
  voyageKey?: string;
};

const STORED = new Set(["BSB", "KJV", "WEB", "DRA"]);

async function embedQuery(text: string, key: string): Promise<number[]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("VOYAGE_MODEL") ?? "voyage-3.5",
      input: [text],
      input_type: "query",
      output_dimension: 1024,
    }),
  });
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

// deno-lint-ignore no-explicit-any
export async function runTool(name: string, input: any, ctx: ToolContext, messageId?: string): Promise<unknown> {
  const { db, userId } = ctx;

  switch (name) {
    case "get_passage": {
      let translation = (input.translation ?? ctx.translation ?? "BSB").toUpperCase();
      let note: string | undefined;
      if (!STORED.has(translation)) {
        note = `${translation} isn't available yet; showing BSB instead. Tell the user.`;
        translation = "BSB";
      }
      const start = Number(input.verse_start);
      const end = Math.min(Number(input.verse_end ?? start), start + 11);
      const { data, error } = await db.rpc("get_passage", {
        p_translation: translation,
        p_book: String(input.book).toUpperCase(),
        p_chapter: Number(input.chapter),
        p_verse_start: start,
        p_verse_end: end,
      });
      if (error) return { error: error.message };
      if (!data?.length) {
        return { error: `No text found for ${input.book} ${input.chapter}:${start}${end !== start ? "-" + end : ""} in ${translation}. Don't guess the wording; give the reference only or check the book code.` };
      }
      if (translation === "DRA" && String(input.book).toUpperCase() === "PSA") {
        note = (note ? note + " " : "") + "Douay-Rheims numbers most Psalms one lower than other Bibles (e.g. Psalm 23 is 22 here). Check the text is the psalm you meant; if not, look up the adjusted number or use WEB.";
      }
      return { translation, note, verses: data.map((v: { verse: number; text: string }) => ({ verse: v.verse, text: v.text })), book: data[0].book_name, chapter: data[0].chapter };
    }

    case "search_verses": {
      if (!ctx.voyageKey) return { error: "Verse search isn't set up yet (VOYAGE_API_KEY missing). Suggest a passage you know and confirm it with get_passage." };
      const embedding = await embedQuery(String(input.query), ctx.voyageKey);
      const { data, error } = await db.rpc("match_verses", {
        p_query_embedding: JSON.stringify(embedding),
        p_translation: STORED.has(ctx.translation) ? ctx.translation : "BSB",
        p_include_dc: ctx.includeDeuterocanon,
        p_count: Math.min(Number(input.count ?? 6), 10),
      });
      if (error) return { error: error.message };
      return (data ?? []).map((r: { book_id: string; book_name: string; chapter: number; verse: number; text: string }) => ({
        ref: `${r.book_name} ${r.chapter}:${r.verse}`, book: r.book_id, chapter: r.chapter, verse: r.verse, text: r.text,
      }));
    }

    case "save_commitment": {
      const { error } = await db.from("commitments").insert({ user_id: userId, text: input.text, for_date: input.for_date });
      return error ? { error: error.message } : { saved: true };
    }

    case "update_commitment": {
      const { data: latest } = await db.from("commitments").select("id")
        .eq("user_id", userId).eq("for_date", input.for_date)
        .order("created_at", { ascending: false }).limit(1);
      if (!latest?.length) return { error: `No commitment saved for ${input.for_date}.` };
      const { error } = await db.from("commitments")
        .update({ status: input.status, note: input.note ?? null })
        .eq("id", latest[0].id).eq("user_id", userId);
      return error ? { error: error.message } : { updated: true };
    }

    case "save_prayer_request": {
      const { data, error } = await db.from("prayer_requests")
        .insert({ user_id: userId, text: input.text, follow_up_on: input.follow_up_on ?? null })
        .select("id").single();
      return error ? { error: error.message } : { saved: true, id: data.id };
    }

    case "update_prayer_request": {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.status) patch.status = input.status;
      if (input.follow_up_on) patch.follow_up_on = input.follow_up_on;
      const { data, error } = await db.from("prayer_requests").update(patch)
        .eq("id", input.id).eq("user_id", userId).select("id");
      if (error) return { error: error.message };
      return data?.length ? { updated: true } : { error: "No prayer request with that id." };
    }

    case "save_memory": {
      const { error } = await db.from("memories").insert({ user_id: userId, fact: input.fact });
      return error ? { error: error.message } : { saved: true };
    }

    case "log_safety_event": {
      const { error } = await db.from("safety_events").insert({ user_id: userId, category: input.category, message_id: messageId ?? null });
      return error ? { error: error.message } : { logged: true };
    }

    default:
      return { error: `Unknown tool ${name}` };
  }
}
