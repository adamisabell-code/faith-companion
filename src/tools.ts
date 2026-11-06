// Tool definitions for the chat model (Anthropic Messages API format).
// The backend executes each call against Supabase and returns the result.
// get_passage is the ONLY way the model is allowed to quote Scripture.

export const tools = [
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
        translation: { type: "string", description: "Translation id, e.g. BSB, KJV, WEB, DRA. Defaults to the user's preference." },
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
        for_date: { type: "string" },
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
    description: "Mark a prayer request answered or archived, or move its follow-up date.",
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
] as const;
