-- Amen Buddy growth dashboard.
-- Paste any block into Supabase > SQL Editor and Run. Read-only: nothing here changes data.
-- Needs the 20261111000000_growth.sql migration. Numbers start from the day that ran.

-- 1. THE FUNNEL (last 30 days): how many devices reach each step.
--    welcome -> picked a buddy -> said what they want help with -> gave a name
--    -> created an account -> finished setup -> ACTIVATED (sent a first message)
select name as step, count(distinct coalesce(user_id::text, anon_id)) as people
from public.events
where created_at > now() - interval '30 days'
  and name in ('welcome_viewed','onboarding_buddy_picked','onboarding_focus_set','onboarding_about_done',
               'signup_completed','onboarding_completed','first_message_sent')
group by name
order by array_position(array['welcome_viewed','onboarding_buddy_picked','onboarding_focus_set','onboarding_about_done',
                              'signup_completed','onboarding_completed','first_message_sent'], name);

-- 2. NEW ACCOUNTS AND ACTIVATION by week.
--    Activated = sent at least one message to their buddy within 24 hours of finishing setup.
select date_trunc('week', p.onboarded_at)::date as week,
       count(*) as finished_setup,
       count(*) filter (where exists (
         select 1 from public.messages m
         where m.user_id = p.user_id and m.role = 'user' and m.created_at < p.onboarded_at + interval '24 hours')) as activated
from public.profiles p
where p.onboarded_at is not null
group by 1 order by 1 desc;

-- 3. RETENTION: of the people who finished setup in a given week, how many came back
--    and did something (a message or a kept commitment) on day 1, day 7 and day 30.
--    A cell is blank until that many days have passed for everyone in the week.
with cohort as (
  select user_id, onboarded_at, (onboarded_at at time zone 'UTC')::date as d0 from public.profiles where onboarded_at is not null
), active as (
  select user_id, (created_at at time zone 'UTC')::date as d from public.messages where role = 'user'
  union
  select user_id, for_date as d from public.commitments where status in ('done','partial')
)
select date_trunc('week', c.onboarded_at)::date as week,
       count(*) as people,
       case when max(c.d0) <= current_date - 1  then round(100.0 * count(*) filter (where exists (select 1 from active a where a.user_id = c.user_id and a.d = c.d0 + 1))  / count(*), 1) end as day1_pct,
       case when max(c.d0) <= current_date - 7  then round(100.0 * count(*) filter (where exists (select 1 from active a where a.user_id = c.user_id and a.d = c.d0 + 7))  / count(*), 1) end as day7_pct,
       case when max(c.d0) <= current_date - 30 then round(100.0 * count(*) filter (where exists (select 1 from active a where a.user_id = c.user_id and a.d between c.d0 + 28 and c.d0 + 32)) / count(*), 1) end as day30_pct
from cohort c group by 1 order by 1 desc;

-- 4. WEEKLY ACTIVE USERS (sent a message or kept a commitment that week).
select date_trunc('week', d)::date as week, count(distinct user_id) as weekly_active
from (
  select user_id, created_at::date as d from public.messages where role = 'user'
  union all
  select user_id, for_date from public.commitments where status in ('done','partial')
) x group by 1 order by 1 desc limit 12;

-- 5. SHARING: cards opened vs actually shared or saved, by week.
select date_trunc('week', created_at)::date as week,
       count(*) filter (where name = 'share_opened') as opened,
       count(*) filter (where name = 'share_completed') as shared,
       count(distinct user_id) filter (where name = 'share_completed') as people_sharing
from public.events where name in ('share_opened','share_completed')
group by 1 order by 1 desc;

-- 6. PLUS DEMAND (before payments are live): who looked, who said "tell me when it opens", which plan.
select count(distinct user_id) filter (where name = 'plus_viewed') as viewed_plus,
       count(distinct user_id) filter (where name = 'plus_interest') as interested,
       count(distinct user_id) filter (where name = 'plus_interest' and props->>'plan' = 'annual') as wanted_yearly,
       count(distinct user_id) filter (where name = 'plus_interest' and props->>'plan' = 'monthly') as wanted_monthly,
       count(distinct user_id) filter (where name = 'free_limit_reached') as hit_free_limit
from public.events;

-- 7. SUBSCRIBERS AND MRR (once payments are live).
--    Yearly counts as price/12 a month. Prices below are the list prices; edit if they change.
select count(*) filter (where status = 'trialing') as in_trial,
       count(*) filter (where status in ('active','grace','cancelled') and current_period_end > now()) as paying,
       round(sum(case when status in ('active','grace','cancelled') and current_period_end > now()
                      then case when product_id ilike '%year%' or product_id ilike '%annual%' then 49.99 / 12 else 7.99 end end)::numeric, 2) as mrr_gross_usd
from public.subscriptions;

-- 8. AI COST per active user, last 30 days.
--    Prices are dollars per million tokens. Check them against your Anthropic console and edit here.
with price as (select 2.00 as input, 10.00 as output, 0.20 as cache_read, 2.50 as cache_write),
usage as (
  select u.user_id,
         count(*) as turns,
         sum(u.input_tokens * p.input + u.output_tokens * p.output + u.cache_read_tokens * p.cache_read + u.cache_write_tokens * p.cache_write) / 1e6 as cost
  from public.ai_usage u cross join price p
  where u.created_at > now() - interval '30 days'
  group by u.user_id
)
select count(*) as active_users,
       sum(turns) as ai_turns,
       round(sum(cost)::numeric, 2) as total_cost_usd,
       round(avg(cost)::numeric, 3) as avg_cost_per_user_usd,
       round((percentile_cont(0.9) within group (order by cost))::numeric, 3) as heavy_user_cost_usd,   -- 9 in 10 users cost less than this
       round((sum(cost) / nullif(sum(turns), 0))::numeric, 4) as cost_per_turn_usd
from usage;

-- 9. How much prompt caching is saving (share of input that was read from cache).
select round(100.0 * sum(cache_read_tokens) / nullif(sum(input_tokens + cache_read_tokens + cache_write_tokens), 0), 1) as pct_input_from_cache
from public.ai_usage where created_at > now() - interval '7 days';
