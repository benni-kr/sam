create table if not exists public.planner_event_placements (
  semester_id text not null,
  event_id text not null,
  start_date text,
  end_date text,
  updated_at timestamptz not null default now(),
  constraint planner_event_placements_pkey primary key (semester_id, event_id)
);

create index if not exists planner_event_placements_updated_at_idx
  on public.planner_event_placements (updated_at desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planner_event_placements_set_updated_at
on public.planner_event_placements;

create trigger planner_event_placements_set_updated_at
before update on public.planner_event_placements
for each row
execute function public.set_updated_at_timestamp();

alter table public.planner_event_placements enable row level security;

-- Current app flow has no user auth, so planner writes use the anon key.
-- Tighten these policies once user/semester ownership is introduced.
drop policy if exists planner_event_placements_read_policy
on public.planner_event_placements;

create policy planner_event_placements_read_policy
on public.planner_event_placements
for select
to anon, authenticated
using (true);

drop policy if exists planner_event_placements_insert_policy
on public.planner_event_placements;

create policy planner_event_placements_insert_policy
on public.planner_event_placements
for insert
to anon, authenticated
with check (true);

drop policy if exists planner_event_placements_update_policy
on public.planner_event_placements;

create policy planner_event_placements_update_policy
on public.planner_event_placements
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists planner_event_placements_delete_policy
on public.planner_event_placements;

create policy planner_event_placements_delete_policy
on public.planner_event_placements
for delete
to anon, authenticated
using (true);