-- Run this once in the Supabase SQL Editor.
-- Stores one secret token per user, used to authorize the public
-- read-only .ics calendar feed (calendar apps can't log in, so the
-- feed URL itself — long, random, unguessable — is the credential).

create table if not exists calendar_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

alter table calendar_tokens enable row level security;

create policy "own token only" on calendar_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
