create table if not exists public.planner_events (
  planner_scope text not null default 'default',
  semester_id text,
  event_id text not null,
  title text not null,
  category text not null,
  start_date text,
  end_date text,
  participants jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint planner_events_pkey primary key (planner_scope, event_id),
  constraint planner_events_category_check check (
    category in ('Exam', 'Group Event', 'Private Event', 'Other')
  )
);

create index if not exists planner_events_scope_updated_at_idx
  on public.planner_events (planner_scope, updated_at desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planner_events_set_updated_at
on public.planner_events;

create trigger planner_events_set_updated_at
before update on public.planner_events
for each row
execute function public.set_updated_at_timestamp();

alter table public.planner_events enable row level security;

-- Current app flow has no user auth, so planner writes use anon access
-- scoped by planner_scope. Tighten this with auth-bound ownership before
-- broad public rollout.
drop policy if exists planner_events_read_policy
on public.planner_events;

create policy planner_events_read_policy
on public.planner_events
for select
to anon, authenticated
using (true);

drop policy if exists planner_events_insert_policy
on public.planner_events;

create policy planner_events_insert_policy
on public.planner_events
for insert
to anon, authenticated
with check (true);

drop policy if exists planner_events_update_policy
on public.planner_events;

create policy planner_events_update_policy
on public.planner_events
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists planner_events_delete_policy
on public.planner_events;

create policy planner_events_delete_policy
on public.planner_events
for delete
to anon, authenticated
using (true);
