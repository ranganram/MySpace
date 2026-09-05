-- Run this once in the Supabase SQL Editor.
-- Splits the single Google Tasks list into separate Office/Personal lists.

alter table google_tokens add column if not exists tasklist_id_office text;
alter table google_tokens add column if not exists tasklist_id_personal text;
