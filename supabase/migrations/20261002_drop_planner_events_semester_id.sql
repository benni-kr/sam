-- Migration: Drop semester_id from planner_events table
-- Calendar events are now date-driven and dynamically span semesters in the frontend.
-- The semester_id column is no longer written to or queried by the client.

alter table public.planner_events
  drop column if exists semester_id;
