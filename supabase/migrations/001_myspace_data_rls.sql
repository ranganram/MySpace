-- Run this once in your Supabase project's SQL Editor
-- (https://supabase.com/dashboard/project/koddmmoavkczmarfxdhq/sql/new)
--
-- Creates a new, auth-scoped table for the rewritten app. Does NOT touch
-- the existing `myspace_data` table used by the old index.html, so the
-- old app keeps working untouched until you're ready to retire it.

create table if not exists myspace_data_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table myspace_data_v2 enable row level security;

create policy "own rows only" on myspace_data_v2
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- keep updated_at fresh on every write
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_myspace_data_v2_touch on myspace_data_v2;
create trigger trg_myspace_data_v2_touch
  before update on myspace_data_v2
  for each row execute function touch_updated_at();
