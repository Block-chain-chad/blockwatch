-- Onstock holdings: what a signed-in person typed in. Amounts only: no cost,
-- no wallet address. Run once in the Supabase SQL editor, after review, and
-- BEFORE the web deploy that ships Holdings: account deletion
-- (api/delete-account.js) deletes from this table, and fails while it does
-- not exist.
--
-- Row-level security: each person reads and writes only their own rows.
-- Anonymous visitors never touch this table (guest holdings stay on the
-- device).
--
-- The app reads amounts as text (amount::text) and writes them as strings,
-- because PostgREST sends numeric as a JSON number, which loses digits past
-- about 15. numeric(31,18) holds up to 999,999,999,999 with 18 decimals,
-- the same limits the app's Amount field enforces.
--
-- Row cap: 50 tokens per person. The app enforces it too, but the server
-- must not trust the app. Same pattern as supabase/launch-limits.sql: only a
-- row that does not exist yet counts, and an advisory lock stops two
-- parallel inserts from both slipping under the cap.
--
-- Safe to run more than once.
--
-- HOW TO RUN: Supabase dashboard, project BlockWatch, SQL Editor, New query,
-- paste this whole file, Run. Expect "Success. No rows returned".

begin;

create table if not exists public.user_holdings (
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_id text not null check (char_length(asset_id) between 1 and 120),
  amount numeric(31,18) not null check (amount > 0 and amount < 1000000000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, asset_id)
);

alter table public.user_holdings enable row level security;

drop policy if exists "users manage own holdings" on public.user_holdings;
create policy "users manage own holdings"
  on public.user_holdings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Signed-in people only. Row-level security already hides every row from
-- anonymous callers; this takes the table off their API surface as well.
revoke all on public.user_holdings from anon;
grant select, insert, update, delete on public.user_holdings to authenticated;

create or replace function public.enforce_user_holdings_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('user_holdings:' || new.user_id::text, 0));
  if not exists (
    select 1 from public.user_holdings where user_id = new.user_id and asset_id = new.asset_id
  ) and (select count(*) from public.user_holdings where user_id = new.user_id) >= 50 then
    raise exception 'holdings limit reached (50 per account)' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists user_holdings_cap on public.user_holdings;
create trigger user_holdings_cap
  before insert on public.user_holdings
  for each row execute function public.enforce_user_holdings_cap();

revoke execute on function public.enforce_user_holdings_cap() from public, anon, authenticated;

commit;

-- Check after running (read only):
--   select relrowsecurity from pg_class where oid = 'public.user_holdings'::regclass;  -- true
--   select policyname, cmd, roles from pg_policies where tablename = 'user_holdings';
