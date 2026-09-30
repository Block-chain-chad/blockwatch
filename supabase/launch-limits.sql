-- Onstock launch limits. Run once in the Supabase SQL editor, after review.
--
-- What this does (security review of September 30, 2026, findings 3 and 4):
--   1. Closes the database side of the trading waitlist. Nobody can call
--      join_waitlist directly any more. Existing waitlist rows stay.
--   2. Size limits on what a signed-in user can store in user_folders and
--      user_alerts, and on the feedback email field.
--   3. Row caps per user: 40 folders and 250 alerts. With the size limits,
--      the most one account can store is about 1.5 MB (40 folders of at most
--      33 KB, plus 250 alerts of well under 1 KB), so the free 500 MB database
--      needs hundreds of full accounts before it fills.
--   4. A cap on anonymous feedback shared by every caller: 20 messages in any
--      10 minutes and 200 in any 24 hours, counted in the database, so running
--      many copies of a script or many server instances does not get around it.
--
-- New CHECK constraints are added NOT VALID: they apply to every new or
-- changed row right away, but existing rows are not checked yet. Before
-- validating, run the "Check existing data" queries at the bottom; each must
-- return zero rows. Then run the VALIDATE statements.
--
-- Safe to run more than once.
--
-- HOW TO RUN: Supabase dashboard, project BlockWatch, SQL Editor, New query,
-- paste this whole file, Run. Expect "Success. No rows returned".

begin;

-- 1. Waitlist: closed. Postgres grants EXECUTE on new functions to PUBLIC by
-- default, so revoking from anon and authenticated alone would not be enough.
-- The server (service_role) keeps access in case a manual export is needed.
revoke execute on function public.join_waitlist(text) from public, anon, authenticated;

-- 2. Size limits. Numbers come from what the app saves:
--   folder id: a random UUID (36 characters) or a fixed id like "popular".
--   folder name: typed by the person; the app does not cap it, 100 is far
--     above anything that fits on screen.
--   asset_ids: a JSON array of token ids. The whole token list is 711 ids and
--     about 25 KB, so 1,000 entries and 32 KB still fit every token in one
--     folder. The largest in production today is 138 bytes.
--   alert asset_id: one token id (the longest today is 72 characters).
--   alert rule: a small JSON object (a drift threshold and a price target),
--     about 100 bytes; 512 leaves room for a new field or two.
--   feedback email: 254 characters is the longest valid email address.
alter table public.user_folders drop constraint if exists user_folders_id_size;
alter table public.user_folders add constraint user_folders_id_size
  check (char_length(id) between 1 and 64) not valid;

alter table public.user_folders drop constraint if exists user_folders_name_size;
alter table public.user_folders add constraint user_folders_name_size
  check (char_length(name) <= 100) not valid;

alter table public.user_folders drop constraint if exists user_folders_asset_ids_size;
alter table public.user_folders add constraint user_folders_asset_ids_size
  check (
    case
      when jsonb_typeof(asset_ids) = 'array'
        then jsonb_array_length(asset_ids) <= 1000 and octet_length(asset_ids::text) <= 32768
      else false
    end
  ) not valid;

alter table public.user_alerts drop constraint if exists user_alerts_asset_id_size;
alter table public.user_alerts add constraint user_alerts_asset_id_size
  check (char_length(asset_id) between 1 and 100) not valid;

alter table public.user_alerts drop constraint if exists user_alerts_rule_size;
alter table public.user_alerts add constraint user_alerts_rule_size
  check (rule is null or (jsonb_typeof(rule) = 'object' and octet_length(rule::text) <= 512)) not valid;

alter table public.feedback drop constraint if exists feedback_email_size;
alter table public.feedback add constraint feedback_email_size
  check (email is null or char_length(email) <= 254) not valid;

-- 3. Row caps per user: 40 folders (the Home watchlist is one of them) and 250
-- alerts (one per token at most). The app upserts every folder and every alert on each
-- change, and a BEFORE INSERT trigger also fires for rows that end up as
-- updates, so only a row that does not exist yet counts against the cap. The
-- advisory lock stops two parallel inserts from both slipping under the cap.
-- SECURITY DEFINER with an empty search_path, so the count sees every row of
-- that user and no other schema can be swapped in.
create or replace function public.enforce_user_folders_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('user_folders:' || new.user_id::text, 0));
  if not exists (
    select 1 from public.user_folders where user_id = new.user_id and id = new.id
  ) and (select count(*) from public.user_folders where user_id = new.user_id) >= 40 then
    raise exception 'folder limit reached (40 per account)' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists user_folders_cap on public.user_folders;
create trigger user_folders_cap
  before insert on public.user_folders
  for each row execute function public.enforce_user_folders_cap();

create or replace function public.enforce_user_alerts_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('user_alerts:' || new.user_id::text, 0));
  if not exists (
    select 1 from public.user_alerts where user_id = new.user_id and asset_id = new.asset_id
  ) and (select count(*) from public.user_alerts where user_id = new.user_id) >= 250 then
    raise exception 'alert limit reached (250 per account)' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists user_alerts_cap on public.user_alerts;
create trigger user_alerts_cap
  before insert on public.user_alerts
  for each row execute function public.enforce_user_alerts_cap();

-- 4. Feedback cap, shared by every caller. Anonymous callers cannot read the
-- feedback table (no select policy), so the count must run as the owner
-- (SECURITY DEFINER). The advisory lock makes concurrent inserts take turns,
-- so a burst cannot all read the same count and all get in.
create index if not exists feedback_created_at_idx on public.feedback (created_at);

create or replace function public.enforce_feedback_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('feedback_rate', 0));
  if (select count(*) from public.feedback where created_at > now() - interval '10 minutes') >= 20
     or (select count(*) from public.feedback where created_at > now() - interval '24 hours') >= 200 then
    raise exception 'feedback limit reached, try again later' using errcode = 'check_violation';
  end if;
  -- The time a row counts under is the database's, not the caller's.
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists feedback_rate on public.feedback;
create trigger feedback_rate
  before insert on public.feedback
  for each row execute function public.enforce_feedback_rate();

-- Trigger functions cannot be called directly, but keep them off the API
-- surface anyway.
revoke execute on function public.enforce_user_folders_cap() from public, anon, authenticated;
revoke execute on function public.enforce_user_alerts_cap() from public, anon, authenticated;
revoke execute on function public.enforce_feedback_rate() from public, anon, authenticated;

commit;

-- Check existing data (run by hand before validating; each should return no rows):
--   select user_id, id from public.user_folders
--     where char_length(id) not between 1 and 64 or char_length(name) > 100
--        or case when jsonb_typeof(asset_ids) = 'array'
--             then jsonb_array_length(asset_ids) > 1000 or octet_length(asset_ids::text) > 32768
--             else true end;
--   select user_id, asset_id from public.user_alerts
--     where char_length(asset_id) not between 1 and 100
--        or (rule is not null and (jsonb_typeof(rule) <> 'object' or octet_length(rule::text) > 512));
--   select id from public.feedback where email is not null and char_length(email) > 254;
--   select user_id, count(*) from public.user_folders group by 1 having count(*) > 40;
--   select user_id, count(*) from public.user_alerts group by 1 having count(*) > 250;
--
-- Then validate:
--   alter table public.user_folders validate constraint user_folders_id_size;
--   alter table public.user_folders validate constraint user_folders_name_size;
--   alter table public.user_folders validate constraint user_folders_asset_ids_size;
--   alter table public.user_alerts validate constraint user_alerts_asset_id_size;
--   alter table public.user_alerts validate constraint user_alerts_rule_size;
--   alter table public.feedback validate constraint feedback_email_size;
