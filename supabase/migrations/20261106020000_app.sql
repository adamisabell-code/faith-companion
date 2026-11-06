-- App launch: onboarding fields, check-in de-duplication, reply reports.

-- What the user picked in onboarding (even traditions without a written profile yet),
-- and when they finished onboarding.
alter table public.profiles
  add column if not exists tradition_choice text,
  add column if not exists onboarded_at     timestamptz;

-- One check-in of each kind per user per local day. 'first' = the welcome conversation.
alter table public.check_ins
  add column if not exists local_date date;
alter table public.check_ins drop constraint if exists check_ins_kind_check;
alter table public.check_ins
  add constraint check_ins_kind_check check (kind in ('first', 'morning', 'evening'));
create unique index if not exists check_ins_one_per_day
  on public.check_ins (user_id, kind, local_date);

-- Users can report a companion reply. Content is copied so it survives edits.
create table if not exists public.message_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  content    text,
  created_at timestamptz not null default now()
);
alter table public.message_reports enable row level security;
create policy "insert own reports" on public.message_reports
  for insert with check (user_id = auth.uid());
grant insert on public.message_reports to authenticated;
grant all on public.message_reports to service_role;

-- Profiles of users who allow reminders, for the scheduler.
create index if not exists profiles_push on public.profiles (user_id) where push_token is not null;
