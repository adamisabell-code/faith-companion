-- Hardening before launch.

-- Explicit permission to send data to the AI providers (App Store guideline 5.1.2(i)).
alter table public.profiles add column if not exists ai_consent_at timestamptz;

-- Morning check-in must come before the evening one (the scheduler relies on it).
alter table public.profiles drop constraint if exists profiles_checkin_order;
alter table public.profiles add constraint profiles_checkin_order check (morning_time < evening_time);

-- Keep time zones valid: anything Postgres doesn't recognize falls back to Central.
create or replace function public.profiles_clean_timezone()
returns trigger language plpgsql as $$
begin
  if new.timezone is null or not exists (select 1 from pg_timezone_names where name = new.timezone) then
    new.timezone := 'America/Chicago';
  end if;
  return new;
end $$;

drop trigger if exists profiles_clean_timezone on public.profiles;
create trigger profiles_clean_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.profiles_clean_timezone();

-- A device's push token belongs to one account at a time. Registering it removes
-- it from any other account (e.g. a previous user of the same phone).
create or replace function public.claim_push_token(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_token is not null then
    update public.profiles set push_token = null where push_token = p_token and user_id <> auth.uid();
  end if;
  update public.profiles set push_token = p_token where user_id = auth.uid();
end $$;

revoke execute on function public.claim_push_token(text) from public, anon;
grant execute on function public.claim_push_token(text) to authenticated;

create unique index if not exists profiles_push_token_unique on public.profiles (push_token) where push_token is not null;
