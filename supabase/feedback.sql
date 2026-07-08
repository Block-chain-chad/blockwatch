-- BlockWatch feedback table. Run once in the Supabase SQL editor.
--
-- The anon (browser) key can INSERT feedback but never read it back —
-- messages and emails are only visible to you in the dashboard.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  message text not null check (char_length(message) between 1 and 2000),
  email text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "anon may submit feedback"
  on public.feedback for insert
  to anon
  with check (true);
-- No select/update/delete policies: writes only, from the client's perspective.
