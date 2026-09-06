-- OnStock waitlist: teach join_waitlist to report whether the address was
-- actually NEW, so the welcome email is sent once per address instead of once
-- per join attempt.
--
-- WHY: today the function returns a bare integer position, so api/waitlist-join.js
-- cannot tell a first-time signup from a re-join and re-sends the welcome every
-- time. Anyone can make it mail the same address repeatedly.
--
-- HOW TO RUN THIS (one time, ~30 seconds):
--   1. Open https://supabase.com/dashboard and pick the BlockWatch project.
--   2. In the left sidebar click "SQL Editor".
--   3. Click "New query".
--   4. Select everything in this file, copy it, paste it into the editor.
--   5. Click "Run" (or press Ctrl+Enter). You should see "Success. No rows returned".
--
-- UNTIL YOU RUN IT, NOTHING BREAKS: the API handler understands both the old
-- integer return and the new object return. On the old shape it behaves exactly
-- as it does today (welcome email on every join). The abuse fix simply stays
-- inactive until this file has been run.
--
-- Safe to run more than once.

-- The return type changes (integer -> jsonb), and Postgres will not let
-- "create or replace" change a function's return type, so the old one is
-- dropped first. Dropping is safe: the function is recreated below in the
-- same transaction-less batch, and only the app calls it.
drop function if exists public.join_waitlist(text);

-- Idempotent join: inserts the email if new, then returns
--   { "position": <1-based position in join order>, "is_new": <bool> }
-- Re-joining with the same email returns the original position and is_new=false.
create or replace function public.join_waitlist(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_pos integer;
  v_is_new boolean;
begin
  p_email := lower(trim(p_email));
  if p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email';
  end if;

  -- "returning" only yields a row when the insert actually happened, so a
  -- null id here means the address was already on the list.
  insert into waitlist (email) values (p_email)
  on conflict (email) do nothing
  returning id into v_id;

  v_is_new := v_id is not null;

  if v_id is null then
    select id into v_id from waitlist where email = p_email;
  end if;

  select count(*) into v_pos from waitlist where id <= v_id;
  return jsonb_build_object('position', v_pos, 'is_new', v_is_new);
end;
$$;

grant execute on function public.join_waitlist(text) to anon;
revoke all on table public.waitlist from anon;
