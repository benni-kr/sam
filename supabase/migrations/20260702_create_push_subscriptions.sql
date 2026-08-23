-- Web Push subscriptions for SAM notifications.
--
-- One row per browser/device that has granted notification permission. The
-- endpoint is the push service URL the browser hands us; p256dh and auth are
-- the client keys required to encrypt payloads for that endpoint. Rows are
-- partitioned by planner_scope so notifications never cross environments, the
-- same "scope trick" the planner tables use.
create table if not exists public.push_subscriptions (
  planner_scope text not null default 'default'::text,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone not null default now(),
  constraint push_subscriptions_pkey primary key (endpoint)
);

create index if not exists push_subscriptions_scope_idx
  on public.push_subscriptions (planner_scope);

alter table public.push_subscriptions enable row level security;

-- Access mirrors the planner tables: authenticated clients manage their own
-- subscriptions. The notify route reads and prunes rows with the service role
-- key, which bypasses RLS, so no broad public policy is required here.
drop policy if exists push_subscriptions_read_policy
on public.push_subscriptions;

create policy push_subscriptions_read_policy
on public.push_subscriptions
for select
to authenticated
using (true);

drop policy if exists push_subscriptions_insert_policy
on public.push_subscriptions;

create policy push_subscriptions_insert_policy
on public.push_subscriptions
for insert
to authenticated
with check (true);

drop policy if exists push_subscriptions_update_policy
on public.push_subscriptions;

create policy push_subscriptions_update_policy
on public.push_subscriptions
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists push_subscriptions_delete_policy
on public.push_subscriptions;

create policy push_subscriptions_delete_policy
on public.push_subscriptions
for delete
to authenticated
using (true);
