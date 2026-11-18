-- Migration: Allow 'Background' category for weekly schedule background bands
-- Background activities render behind regular timetable events as patterned time bands.

alter table public.planner_week_events
  drop constraint if exists planner_week_events_category_check;

alter table public.planner_week_events
  add constraint planner_week_events_category_check check (
    category = any (
      array[
        'University'::text,
        'Language courses'::text,
        'Sports'::text,
        'Other'::text,
        'Background'::text
      ]
    )
  );
