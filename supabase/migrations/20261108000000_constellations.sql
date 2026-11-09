-- Lumi's sky: every seven answered prayers become a constellation the user can name.
-- number = 1 for the first constellation, 2 for the second, and so on.
create table if not exists public.constellation_names (
  user_id    uuid not null references auth.users(id) on delete cascade,
  number     int  not null check (number >= 1),
  name       text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id, number)
);
alter table public.constellation_names enable row level security;

drop policy if exists "own constellation names" on public.constellation_names;
create policy "own constellation names" on public.constellation_names
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.constellation_names to authenticated;
grant all on public.constellation_names to service_role;
