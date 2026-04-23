create table if not exists public.planner_friends (
  planner_scope text not null default 'default',
  friend_name text not null,
  updated_at timestamptz not null default now(),
  constraint planner_friends_pkey primary key (planner_scope, friend_name)
);

create index if not exists planner_friends_scope_updated_at_idx
  on public.planner_friends (planner_scope, updated_at desc);

drop trigger if exists planner_friends_set_updated_at
on public.planner_friends;

create trigger planner_friends_set_updated_at
before update on public.planner_friends
for each row
execute function public.set_updated_at_timestamp();

alter table public.planner_friends enable row level security;

-- Seed the canonical friends list from the current planner data so the master
-- list stays aligned with existing events after rollout.
with planner_scopes as (
  select distinct planner_scope from public.planner_events
  union
  select 'default'::text
),
seed_friends as (
  select planner_scope, unnest(array['Anna', 'Lisa', 'Paul', 'Tom']) as friend_name
  from planner_scopes
),
event_friends as (
  select planner_scope, btrim(participant) as friend_name
  from public.planner_events,
  lateral jsonb_array_elements_text(participants) as participant
)
insert into public.planner_friends (planner_scope, friend_name)
select distinct planner_scope, friend_name
from (
  select planner_scope, friend_name from seed_friends
  union all
  select planner_scope, friend_name from event_friends
) as source
where friend_name <> ''
on conflict do nothing;

drop policy if exists planner_friends_read_policy
on public.planner_friends;

create policy planner_friends_read_policy
on public.planner_friends
for select
to anon, authenticated
using (true);

drop policy if exists planner_friends_insert_policy
on public.planner_friends;

create policy planner_friends_insert_policy
on public.planner_friends
for insert
to anon, authenticated
with check (true);

drop policy if exists planner_friends_update_policy
on public.planner_friends;

create policy planner_friends_update_policy
on public.planner_friends
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists planner_friends_delete_policy
on public.planner_friends;

create policy planner_friends_delete_policy
on public.planner_friends
for delete
to anon, authenticated
using (true);