alter table public.planner_events
  drop constraint if exists planner_events_pkey;

alter table public.planner_events
  alter column semester_id drop not null;

alter table public.planner_events
  add constraint planner_events_pkey primary key (planner_scope, event_id);

create index if not exists planner_events_scope_semester_idx
  on public.planner_events (planner_scope, semester_id);