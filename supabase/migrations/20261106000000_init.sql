-- Faith companion app: initial schema
-- Bible text, search embeddings, traditions, companions, and per-user data.

create extension if not exists vector;

------------------------------------------------------------
-- Reference data (readable by everyone, written only by service role)
------------------------------------------------------------

-- Translations. Only public-domain text is stored here.
-- Licensed translations (NIV, ESV, NLT...) are fetched live from API.Bible
-- under its license terms and are NOT stored in this table.
create table public.translations (
  id                    text primary key,          -- 'BSB', 'KJV', 'WEB', 'DRA'
  name                  text not null,
  language              text not null default 'en',
  is_public_domain      boolean not null,
  stored_locally        boolean not null,           -- false = fetched from API.Bible
  includes_deuterocanon boolean not null default false,
  api_bible_id          text,                       -- set for licensed translations
  attribution           text
);

-- Books use USFM codes (GEN, EXO, ... REV, TOB, JDT ...).
create table public.books (
  id         text primary key,
  name       text not null,
  testament  text not null check (testament in ('OT', 'NT', 'DC')),  -- DC = deuterocanon
  sort_order int  not null unique,
  aliases    text[] not null default '{}'                            -- 'Jas', 'Song of Songs', ...
);

create table public.verses (
  translation_id text not null references public.translations(id),
  book_id        text not null references public.books(id),
  chapter        int  not null,
  verse          int  not null,
  text           text not null,
  primary key (translation_id, book_id, chapter, verse)
);

-- One embedding per verse reference, built from a single search translation (BSB).
-- Search finds references; display then pulls the user's own translation.
-- 1024 dims fits voyage-3 / voyage-3.5; change if you pick another embedding model.
create table public.verse_embeddings (
  book_id   text not null references public.books(id),
  chapter   int  not null,
  verse     int  not null,
  embedding vector(1024) not null,
  primary key (book_id, chapter, verse)
);

create index verse_embeddings_hnsw
  on public.verse_embeddings using hnsw (embedding vector_cosine_ops);

-- Church traditions. profile_md is loaded into the companion's instructions.
create table public.traditions (
  id                  text primary key,     -- 'nondenominational', 'baptist', 'catholic', ...
  name                text not null,
  default_translation text references public.translations(id),
  uses_deuterocanon   boolean not null default false,
  profile_md          text not null,
  reviewed_by         text,                 -- pastor/priest who reviewed the profile
  reviewed_at         date
);

create table public.companions (
  id            text primary key,           -- 'pip', 'bram', 'sola', 'lumi'
  name          text not null,
  species       text not null,
  verse_ref     text not null,
  story         text not null,              -- shown on the onboarding pick screen
  greeting      text not null,
  theme_color   text not null,
  system_prompt text not null
);

------------------------------------------------------------
-- Per-user data (row level security: users see only their own rows)
------------------------------------------------------------

create table public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  first_name     text,
  tradition_id   text references public.traditions(id),
  translation_id text references public.translations(id),
  companion_id   text references public.companions(id),
  faith_stage    text check (faith_stage in ('growing', 'coming_back', 'curious')),
  focus_areas    text[] not null default '{}',   -- 'prayer','bible','worry','relationship','habit','grief'
  morning_time   time not null default '07:00',
  evening_time   time not null default '20:30',
  timezone       text not null default 'America/Chicago',
  push_token     text,
  created_at     timestamptz not null default now()
);

create table public.commitments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  text        text not null,
  for_date    date not null,
  status      text not null default 'pending'
              check (status in ('pending', 'done', 'partial', 'skipped')),
  note        text,
  created_at  timestamptz not null default now()
);
create index commitments_user_date on public.commitments (user_id, for_date desc);

create table public.prayer_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  text          text not null,
  status        text not null default 'open' check (status in ('open', 'answered', 'archived')),
  follow_up_on  date,                         -- when the companion should ask about it
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index prayer_requests_followup on public.prayer_requests (user_id, follow_up_on)
  where status = 'open';

create table public.check_ins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('morning', 'evening')),
  scheduled_for timestamptz not null,
  sent_at       timestamptz,
  completed_at  timestamptz
);
create index check_ins_due on public.check_ins (scheduled_for) where sent_at is null;

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index messages_user_time on public.messages (user_id, created_at desc);

-- Short durable facts the companion remembers ("brother is named Mike").
create table public.memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  fact       text not null,
  created_at timestamptz not null default now()
);

-- Logged when a message trips crisis handling. Service role only.
create table public.safety_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  category   text not null,     -- 'self_harm', 'abuse', 'medical', ...
  created_at timestamptz not null default now()
);

------------------------------------------------------------
-- Row level security
------------------------------------------------------------

alter table public.translations     enable row level security;
alter table public.books            enable row level security;
alter table public.verses           enable row level security;
alter table public.verse_embeddings enable row level security;
alter table public.traditions       enable row level security;
alter table public.companions       enable row level security;

create policy "public read" on public.translations     for select using (true);
create policy "public read" on public.books            for select using (true);
create policy "public read" on public.verses           for select using (true);
create policy "public read" on public.traditions       for select using (true);
create policy "public read" on public.companions       for select using (true);
-- verse_embeddings: no policy, so only the service role (server) can read it.

alter table public.profiles        enable row level security;
alter table public.commitments     enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.check_ins       enable row level security;
alter table public.messages        enable row level security;
alter table public.memories        enable row level security;
alter table public.safety_events   enable row level security;

create policy "own rows" on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.commitments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.prayer_requests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.check_ins
  for select using (user_id = auth.uid());
create policy "own rows" on public.messages
  for select using (user_id = auth.uid());
create policy "own rows" on public.memories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- safety_events: no policy, service role only.

------------------------------------------------------------
-- Functions the chat backend calls as tools
------------------------------------------------------------

-- Exact passage lookup. The model must use this (never its memory) to quote Scripture.
create or replace function public.get_passage(
  p_translation text,
  p_book        text,
  p_chapter     int,
  p_verse_start int,
  p_verse_end   int default null
)
returns table (book_name text, chapter int, verse int, text text, translation text)
language sql stable
as $$
  select b.name, v.chapter, v.verse, v.text, v.translation_id
  from public.verses v
  join public.books b on b.id = v.book_id
  where v.translation_id = p_translation
    and v.book_id = p_book
    and v.chapter = p_chapter
    and v.verse between p_verse_start and coalesce(p_verse_end, p_verse_start)
  order by v.verse;
$$;

-- Semantic search: "verses about worrying about money" -> references + text
-- in the user's translation (falls back to BSB if that translation isn't stored).
create or replace function public.match_verses(
  p_query_embedding vector(1024),
  p_translation     text default 'BSB',
  p_include_dc      boolean default false,
  p_count           int default 8
)
returns table (book_id text, book_name text, chapter int, verse int, text text, similarity float)
language sql stable
as $$
  select e.book_id, b.name, e.chapter, e.verse,
         coalesce(v.text, f.text) as text,
         1 - (e.embedding <=> p_query_embedding) as similarity
  from public.verse_embeddings e
  join public.books b on b.id = e.book_id
  left join public.verses v
    on v.translation_id = p_translation and v.book_id = e.book_id
   and v.chapter = e.chapter and v.verse = e.verse
  left join public.verses f
    on f.translation_id = 'BSB' and f.book_id = e.book_id
   and f.chapter = e.chapter and f.verse = e.verse
  where p_include_dc or b.testament <> 'DC'
  order by e.embedding <=> p_query_embedding
  limit p_count;
$$;

-- Server-only: semantic search reads embeddings, so keep it off the public API.
revoke execute on function public.match_verses(vector, text, boolean, int) from public, anon, authenticated;
