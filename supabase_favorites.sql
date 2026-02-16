-- Favorites storage for dictionary mode.
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.user_access_keys (
  user_name text primary key,
  key_hash text not null,
  created_at timestamptz not null default now(),
  check (char_length(trim(user_name)) >= 2),
  check (user_name = lower(trim(user_name)))
);

alter table public.user_access_keys enable row level security;
revoke all on public.user_access_keys from anon, authenticated;

drop function if exists public.validate_user_key(text, text);
drop function if exists public.validate_user_key(character varying, character varying);
drop function if exists public.validate_user_key(name, text);

create or replace function public.validate_user_key(p_user_name text, p_key text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  v_ok boolean;
  v_crypt_call text;
begin
  if to_regprocedure('extensions.crypt(text,text)') is not null then
    v_crypt_call := 'extensions.crypt($2, u.key_hash)';
  elsif to_regprocedure('public.crypt(text,text)') is not null then
    v_crypt_call := 'public.crypt($2, u.key_hash)';
  elsif to_regprocedure('crypt(text,text)') is not null then
    v_crypt_call := 'crypt($2, u.key_hash)';
  else
    raise exception 'pgcrypto crypt(text,text) ez da aurkitu.';
  end if;

  execute format(
    'select exists (
      select 1
      from public.user_access_keys u
      where u.user_name = lower(trim($1))
        and u.key_hash = %s
    )',
    v_crypt_call
  )
  into v_ok
  using p_user_name, p_key;

  return coalesce(v_ok, false);
end;
$$;

grant execute on function public.validate_user_key(text, text)
  to anon, authenticated;

grant usage on schema public to anon, authenticated;

create table if not exists public.user_favorite_words (
  id bigint generated always as identity primary key,
  user_name text not null,
  favorite_date date not null,
  word text not null,
  word_key text not null,
  mode text not null check (mode in ('synonyms', 'meaning')),
  meaning text null,
  synonyms text[] not null default '{}',
  level smallint null check (level in (1, 2, 3, 4)),
  created_at timestamptz not null default now(),
  check (char_length(trim(user_name)) >= 2),
  check (char_length(trim(word)) >= 1),
  check (word_key = lower(trim(word_key))),
  check (user_name = lower(trim(user_name)))
);

create unique index if not exists user_favorite_words_unique_per_day_idx
  on public.user_favorite_words (user_name, favorite_date, word_key);

create index if not exists user_favorite_words_user_date_idx
  on public.user_favorite_words (user_name, favorite_date);

create index if not exists user_favorite_words_created_at_idx
  on public.user_favorite_words (created_at desc);

alter table public.user_favorite_words enable row level security;

drop policy if exists "favorites read anon and authenticated" on public.user_favorite_words;
create policy "favorites read anon and authenticated"
  on public.user_favorite_words
  for select
  to anon, authenticated
  using (true);

drop policy if exists "favorites insert anon and authenticated" on public.user_favorite_words;
create policy "favorites insert anon and authenticated"
  on public.user_favorite_words
  for insert
  to anon, authenticated
  with check (
    char_length(trim(user_name)) >= 2
    and word_key = lower(trim(word_key))
    and mode in ('synonyms', 'meaning')
  );

drop policy if exists "favorites delete anon and authenticated" on public.user_favorite_words;
create policy "favorites delete anon and authenticated"
  on public.user_favorite_words
  for delete
  to anon, authenticated
  using (
    char_length(trim(user_name)) >= 2
    and user_name = lower(trim(user_name))
  );

-- Example user creation:
-- insert into public.user_access_keys (user_name, key_hash)
-- values ('elio01', crypt('zure-gakoa', gen_salt('bf')))
-- on conflict (user_name) do update
-- set key_hash = excluded.key_hash,
--     created_at = now();

notify pgrst, 'reload schema';
