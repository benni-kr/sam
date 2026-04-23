-- 1. Secure table: planner_events
drop policy if exists planner_events_read_policy on public.planner_events;
create policy planner_events_read_policy on public.planner_events for select to authenticated using (true);

drop policy if exists planner_events_insert_policy on public.planner_events;
create policy planner_events_insert_policy on public.planner_events for insert to authenticated with check (true);

drop policy if exists planner_events_update_policy on public.planner_events;
create policy planner_events_update_policy on public.planner_events for update to authenticated using (true) with check (true);

drop policy if exists planner_events_delete_policy on public.planner_events;
create policy planner_events_delete_policy on public.planner_events for delete to authenticated using (true);

-- 2. Secure table: planner_friends
drop policy if exists planner_friends_read_policy on public.planner_friends;
create policy planner_friends_read_policy on public.planner_friends for select to authenticated using (true);

drop policy if exists planner_friends_insert_policy on public.planner_friends;
create policy planner_friends_insert_policy on public.planner_friends for insert to authenticated with check (true);

drop policy if exists planner_friends_update_policy on public.planner_friends;
create policy planner_friends_update_policy on public.planner_friends for update to authenticated using (true) with check (true);

drop policy if exists planner_friends_delete_policy on public.planner_friends;
create policy planner_friends_delete_policy on public.planner_friends for delete to authenticated using (true);
