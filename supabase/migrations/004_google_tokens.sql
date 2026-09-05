-- Run this once in the Supabase SQL Editor.
-- Stores Google OAuth tokens for the Google Tasks sync feature.
-- RLS is enabled with NO policies at all — this deliberately blocks every
-- client request (even from the owning user's own session). Only the
-- server-side service-role key (used in our API routes, never sent to the
-- browser) can read or write this table.

create table if not exists google_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  tasklist_id text,
  updated_at timestamptz not null default now()
);

alter table google_tokens enable row level security;
-- No policies added on purpose.
