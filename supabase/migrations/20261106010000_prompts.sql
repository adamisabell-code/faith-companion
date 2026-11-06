-- Server-only prompt text (shared companion rules). Loaded by scripts/load-content.ts,
-- read by the chat function. Not exposed to the app.
create table public.prompts (
  key        text primary key,      -- 'shared_rules'
  body       text not null,
  updated_at timestamptz not null default now()
);

alter table public.prompts enable row level security;
-- No policies and no grants to anon/authenticated: service role only.
grant all on public.prompts to service_role;
