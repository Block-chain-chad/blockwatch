-- Migration: price-target alerts. Run once in the Supabase SQL editor.
-- Adds a jsonb column holding the full alert rule (drift and/or price target);
-- the old threshold column stays for backward compatibility.

alter table public.user_alerts
  add column if not exists rule jsonb;
