-- BlockWatch waitlist schema. Run once in the Supabase SQL editor.
--
-- Design: the anon (browser) key can do exactly one thing — call
-- join_waitlist(email) — and learns nothing but its own position number.
-- The table itself is locked down (RLS on, no anon policies), so stored
-- emails are never readable from the client.

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Idempotent join: inserts the email if new, then returns the caller's
-- 1-based position in join order. Re-joining with the same email returns
-- the original position.
create or replace function public.join_waitlist(p_email text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_pos integer;
begin
  p_email := lower(trim(p_email));
  if p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email';
  end if;

  insert into waitlist (email) values (p_email)
  on conflict (email) do nothing;

  select id into v_id from waitlist where email = p_email;
  select count(*) into v_pos from waitlist where id <= v_id;
  return v_pos;
end;
$$;

grant execute on function public.join_waitlist(text) to anon;
revoke all on table public.waitlist from anon;
