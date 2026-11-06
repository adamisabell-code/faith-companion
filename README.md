# Faith Companion

A Christian prayer and accountability companion app. Users pick one of four companions: **Pip** (mustard seed), **Bram** (donkey), **Sola** (sparrow), **Lumi** (lamb). They chat about life and Scripture, set a small commitment each morning, and get a check-in each evening.

This repo holds the **data layer and the companion "brain"**. It plugs into the same chat engine as Watt (daily10), in its own Supabase project so Watt stays untouched.

## How the AI "knows" things (no fine-tuning)

The app uses an off-the-shelf model (e.g. Claude). It is never trained on Bible text. Instead, every chat turn gets:

1. **Instructions** assembled by `src/buildSystemPrompt.ts`:
   `content/shared-rules.md` → the user's tradition profile → the companion's personality → what we know about this user (commitments, prayer requests, memories).
2. **Tools** (`src/tools.ts`) the model calls to look things up and save things:
   - `get_passage`: exact verse text from the database. The only way the model may quote Scripture.
   - `search_verses`: semantic search ("verses about worry"), backed by pgvector.
   - `save_commitment`, `update_commitment`, `save_prayer_request`, `update_prayer_request`, `save_memory`, `log_safety_event`.

Edit a markdown file in `content/`, run `npm run load-content`, and the change is live. Nothing to retrain.

## Repo layout

```
supabase/
  migrations/20261106000000_init.sql   tables, RLS, get_passage + match_verses
  seed.sql                             translations + 73 books (66 + deuterocanon)
content/
  shared-rules.md                      rules every companion follows (Scripture, safety, tradition)
  companions/{pip,bram,sola,lumi}.md   personality prompts + onboarding copy
  traditions/*.md                      tradition profiles (DRAFTS, need pastor review)
scripts/
  load-content.ts                      push content/ into Supabase
  import-bible.ts                      load a public-domain Bible (VPL text file)
  embed-verses.ts                      build search embeddings (Voyage, 1024 dims)
src/
  buildSystemPrompt.ts                 assemble the prompt for a chat turn
  tools.ts                             tool definitions for the model
evals/
  cases.jsonl                          test conversations: fake verses, doctrine, crisis
```

## Setup

1. **Create a new Supabase project** for this app. Don't reuse Watt's.
2. Apply the schema and seed:
   ```bash
   supabase link --project-ref YOUR-REF
   supabase db push          # runs supabase/migrations
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
3. `cp .env.example .env` and fill it in, then `npm install`.
4. Load companions and traditions: `npm run load-content`
5. Download the public-domain Bibles (VPL format) from ebible.org and unzip each into `./data` (gitignored):
   - BSB: https://eBible.org/Scriptures/engbsb_vpl.zip
   - KJV: https://eBible.org/Scriptures/eng-kjv2006_vpl.zip
   - WEB with deuterocanon: https://eBible.org/Scriptures/eng-web_vpl.zip
   - Douay-Rheims 1899: https://eBible.org/Scriptures/engDRA_vpl.zip
6. Import each one, pointing at the `.txt` file inside each unzipped folder:
   ```bash
   npm run import-bible -- BSB data/engbsb_vpl/engbsb_vpl.txt
   npm run import-bible -- KJV data/eng-kjv2006_vpl/eng-kjv2006_vpl.txt
   npm run import-bible -- WEB data/eng-web_vpl/eng-web_vpl.txt
   npm run import-bible -- DRA data/engDRA_vpl/engDRA_vpl.txt
   ```
7. Build search embeddings: `npm run embed-verses` (BSB text, plus WEB for the deuterocanonical books).

## Translations and licensing

| Translation | Status |
|---|---|
| BSB, KJV, WEB, Douay-Rheims | Public domain. Stored in `verses`. |
| NIV, ESV, NLT (also NABRE, RSV-2CE for Catholics) | Copyrighted. Need a license, e.g. through API.Bible, and are fetched live rather than stored. Rows exist in `translations` with `stored_locally = false`. |

Launch on the public-domain set; add licensed translations once there are paying users.

## Tradition profiles

Drafted: **Non-denominational, Baptist, Catholic**. Still to write: Methodist, Pentecostal, Orthodox, and "Not sure" (which should fall back to beliefs shared across traditions).

Every profile is marked DRAFT and has `reviewed_by: null`. Have a pastor or priest from each tradition read theirs before launch, then fill in `reviewed_by`.

## Evals

`evals/cases.jsonl` lists conversations the app must handle well: fake or misquoted verses, books that don't exist, doctrine that differs by tradition, requests to speak as Jesus, and crisis messages. Run them against the chat backend before every prompt or model change, and add a case whenever a real conversation goes wrong.

## Still to build (in the app, reusing Watt's engine)

- Chat endpoint: call the model with `buildSystemPrompt` + `tools`, execute tool calls against Supabase, store `messages`.
- Check-in scheduler: a Supabase cron job and edge function that sends morning and evening pushes from `profiles` times.
- Onboarding screens writing to `profiles` (designs in the Faith Buddy Cast canvas).
