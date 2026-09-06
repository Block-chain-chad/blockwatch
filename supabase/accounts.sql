-- OnStock accounts: per-user synced folders and alert rules.
-- Run once in the Supabase SQL editor.
--
-- Row-level security: every signed-in user can only ever read/write rows
-- where user_id equals their own auth id. Anonymous visitors never touch
-- these tables (their data stays in the browser's localStorage).

create table if not exists public.user_folders (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  asset_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.user_folders enable row level security;

drop policy if exists "users manage own folders" on public.user_folders;
create policy "users manage own folders"
  on public.user_folders for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.user_alerts (
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_id text not null,
  threshold numeric not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, asset_id)
);

alter table public.user_alerts enable row level security;

drop policy if exists "users manage own alerts" on public.user_alerts;
create policy "users manage own alerts"
  on public.user_alerts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
