# Faith Companion

A Christian prayer and accountability companion app. Users pick one of four companions: **Pip** (mustard seed), **Bram** (donkey), **Sola** (sparrow), **Lumi** (lamb). They chat about life and Scripture, set a small commitment each morning, and get a check-in each evening.

This repo holds the **app** (`apps/companion`: one Expo codebase for web and iPhone), the **backend** (Supabase database + Edge Functions that talk to Claude), and the **App Store launch kit** (`docs/app-store/`). It runs in its own Supabase project, separate from Watt.

**Launching? Start with [`docs/app-store/submission-guide.md`](docs/app-store/submission-guide.md).**

## How the AI "knows" things (no fine-tuning)

The app uses an off-the-shelf model (e.g. Claude). It is never trained on Bible text. Instead, every chat turn gets:

1. **Instructions** assembled by `supabase/functions/chat/prompt.ts`:
   `content/shared-rules.md` → the user's tradition profile → the companion's personality → what we know about this user (commitments, prayer requests, memories).
2. **Tools** (`supabase/functions/chat/tools.ts`) the model calls to look things up and save things:
   - `get_passage`: exact verse text from the database. The only way the model may quote Scripture.
   - `search_verses`: semantic search ("verses about worry"), backed by pgvector.
   - `save_commitment`, `update_commitment`, `save_prayer_request`, `update_prayer_request`, `save_memory`, `log_safety_event`.

Edit a markdown file in `content/`, run `npm run load-content`, and the change is live. Nothing to retrain.

## Repo layout

```
supabase/
  migrations/20261106000000_init.sql   tables, RLS, get_passage + match_verses
  migrations/20261106010000_prompts.sql  server-only table for the shared rules
  seed.sql                             translations + 73 books (66 + deuterocanon)
  migrations/20261106020000_app.sql    onboarding fields, check-in de-dupe, reply reports
  functions/_shared/                   the companion engine: prompt, tools, Claude loop, check-in timing
  functions/chat/                      chat endpoint (messages + check-in on app open)
  functions/send-checkins/             scheduled morning/evening check-ins + push
  functions/delete-account/            in-app account deletion
  cron.sql                             schedules send-checkins every 10 minutes
apps/companion/                        the app (web + iOS), see its README
docs/app-store/                        listing copy, screenshots, privacy label, review notes, launch guide
content/
  shared-rules.md                      rules every companion follows (Scripture, safety, tradition)
  companions/{pip,bram,sola,lumi}.md   personality prompts + onboarding copy
  traditions/*.md                      tradition profiles (DRAFTS, need pastor review)
scripts/
  load-content.ts                      push content/ into Supabase
  import-bible.ts                      load a public-domain Bible (VPL text file)
  embed-verses.ts                      build search embeddings (Voyage, 1024 dims)
  chat.ts                              talk to a companion from the terminal (testing)
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

## Deploy the chat function

1. If the `prompts` table isn't in your project yet, run `supabase/migrations/20261106010000_prompts.sql` in the SQL Editor (or let the GitHub integration apply it). Then `npm run load-content` again.
2. Secrets (Supabase dashboard → Edge Functions → Secrets): `ANTHROPIC_API_KEY` (required), `VOYAGE_API_KEY` (for verse search). Optional: `ANTHROPIC_MODEL` (defaults to `claude-sonnet-5-5`).
3. Deploy from the repo folder:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-REF
   npm run deploy-functions   # chat, send-checkins, delete-account
   ```
4. Test it: `npm run chat` (Bram, non-denominational), or `npm run chat -- lumi catholic`. Inside the chat, `/evening` and `/morning` trigger check-ins, `/companion sola` switches companions, `/reset` clears the test user's history.

### Calling it from the app

`POST https://<ref>.supabase.co/functions/v1/chat` with the signed-in user's access token as `Authorization: Bearer <token>` and a body of `{ "message": "..." }` or `{ "checkin": "evening" }`. It returns `{ "reply": "...", "tools_used": [...] }`. The user needs a `profiles` row (written by onboarding) first.

## Still to build

- Paid plans (Apple in-app purchase, e.g. via RevenueCat). The app launches free.
- Methodist, Pentecostal and Orthodox tradition profiles; pastor review of all profiles.
