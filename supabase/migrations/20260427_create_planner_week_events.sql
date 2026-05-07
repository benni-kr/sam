create table if not exists public.planner_week_events (
  planner_scope text not null default 'default'::text,
  semester_id text not null,
  event_id text not null,
  title text not null,
  category text not null,
  day text not null,
  start_time text,
  end_time text,
  participants jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone not null default now(),
  constraint planner_week_events_pkey primary key (planner_scope, event_id),
  constraint planner_week_events_category_check check (
    (
      category = any (
        array[
          'University'::text,
          'Language courses'::text,
          'Sports'::text,
          'Other'::text
        ]
      )
    )
  )
);

create index if not exists planner_week_events_scope_updated_at_idx
  on public.planner_week_events (planner_scope, updated_at desc);

create trigger planner_week_events_set_updated_at
before update on public.planner_week_events
for each row
execute function public.set_updated_at_timestamp();

alter table public.planner_week_events enable row level security;

drop policy if exists planner_week_events_read_policy on public.planner_week_events;
create policy planner_week_events_read_policy on public.planner_week_events for select to authenticated using (true);

drop policy if exists planner_week_events_insert_policy on public.planner_week_events;
create policy planner_week_events_insert_policy on public.planner_week_events for insert to authenticated with check (true);

drop policy if exists planner_week_events_update_policy on public.planner_week_events;
create policy planner_week_events_update_policy on public.planner_week_events for update to authenticated using (true) with check (true);

drop policy if exists planner_week_events_delete_policy on public.planner_week_events;
create policy planner_week_events_delete_policy on public.planner_week_events for delete to authenticated using (true);