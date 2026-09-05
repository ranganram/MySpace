-- Run this once in the Supabase SQL Editor AFTER you've:
--   1. Signed up in the new app (creates your auth.users row)
--   2. Run 001_myspace_data_rls.sql (creates myspace_data_v2)
--
-- Copies every row from the old, unprotected `myspace_data` table into the
-- new per-user `myspace_data_v2` table, owned by your new account.
-- Safe to re-run — it overwrites matching keys rather than duplicating.

insert into myspace_data_v2 (user_id, key, value)
select
  (select id from auth.users where email = 'mkranganram@yahoo.com'),
  key,
  value
from myspace_data
on conflict (user_id, key) do update
  set value = excluded.value,
      updated_at = now();

-- Sanity check: should show one row per key, owned by your account.
select key, jsonb_typeof(value), updated_at
from myspace_data_v2
order by key;
