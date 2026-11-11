-- Growth foundation: product analytics, AI cost tracking, and subscriptions.
-- Safe to run more than once. Nothing here changes how the app behaves today.

-- ---------- 1. Product events (the funnel) ----------
-- Written by the app. Never contains message text, prayers, or anything typed by the user:
-- only event names and small non-personal details (which buddy, which step).
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  anon_id    text check (anon_id is null or char_length(anon_id) <= 64),   -- random per-device id, before sign-up
  name       text not null check (char_length(name) between 1 and 64),
  props      jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2000),
  platform   text check (platform is null or char_length(platform) <= 16),
  created_at timestamptz not null default now()
);
create index if not exists events_name_time on public.events (name, created_at);
create index if not exists events_user_time on public.events (user_id, created_at);
create index if not exists events_anon on public.events (anon_id) where anon_id is not null;
alter table public.events enable row level security;

-- Anyone may add an event for themselves (or with no user before sign-up). Nobody can read them from the app.
drop policy if exists "add own events" on public.events;
create policy "add own events" on public.events
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
grant insert on public.events to anon, authenticated;
grant all on public.events to service_role;

-- ---------- 2. AI usage (cost per active user) ----------
-- Written only by the server after each AI turn.
create table if not exists public.ai_usage (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  kind               text not null check (kind in ('message', 'checkin')),
  model              text not null,
  input_tokens       int not null default 0,
  output_tokens      int not null default 0,
  cache_read_tokens  int not null default 0,
  cache_write_tokens int not null default 0,
  rounds             int not null default 1,
  created_at         timestamptz not null default now()
);
create index if not exists ai_usage_user_time on public.ai_usage (user_id, created_at);
create index if not exists ai_usage_time on public.ai_usage (created_at);
alter table public.ai_usage enable row level security;   -- no policies: server only
grant all on public.ai_usage to service_role;

-- ---------- 3. Subscriptions (Amen Buddy Plus) ----------
-- One row per paying user, written only by the server (the store webhook).
-- A user can read their own row so the app knows what to unlock.
create table if not exists public.subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  plan               text not null default 'plus' check (plan in ('plus')),
  status             text not null check (status in ('trialing', 'active', 'grace', 'cancelled', 'expired')),
  source             text not null default 'revenuecat' check (source in ('revenuecat', 'manual')),
  product_id         text,
  current_period_end timestamptz,
  updated_at         timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select to authenticated using (user_id = auth.uid());
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

-- Is this user entitled to Plus right now? (Cancelled keeps access until the paid period ends.)
create or replace function public.is_plus(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user
      and s.status in ('trialing', 'active', 'grace', 'cancelled')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;
revoke all on function public.is_plus(uuid) from public, anon, authenticated;
grant execute on function public.is_plus(uuid) to service_role;
