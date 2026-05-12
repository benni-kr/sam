create table if not exists public.planner_friends (
  planner_scope text not null default 'default'::text,
  friend_name text not null,
  birthday text,
  updated_at timestamptz not null default now(),
  constraint planner_friends_pkey primary key (planner_scope, friend_name),
  constraint friend_name_length_check check ((char_length(friend_name) <= 30)),
  constraint birthday_format_check check (
    birthday is null or birthday ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  )
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

drop policy if exists planner_friends_read_policy
on public.planner_friends;

create policy planner_friends_read_policy
on public.planner_friends
for select
to authenticated
using (true);

drop policy if exists planner_friends_insert_policy
on public.planner_friends;

create policy planner_friends_insert_policy
on public.planner_friends
for insert
to authenticated
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
to authenticated
using (true);