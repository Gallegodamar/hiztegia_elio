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

create table if not exists public.syn_words (
  source_id bigint generated always as identity primary key,
  hitza text not null,
  sinonimoak text[] not null default '{}',
  level smallint not null default 1 check (level in (1, 2, 3, 4)),
  active boolean not null default true,
  search_text text null,
  created_at timestamptz not null default now(),
  check (char_length(trim(hitza)) >= 1)
);

create index if not exists syn_words_hitza_idx
  on public.syn_words (hitza);

create index if not exists syn_words_active_hitza_idx
  on public.syn_words (active, hitza);

alter table public.syn_words enable row level security;

drop policy if exists "syn_words read anon and authenticated" on public.syn_words;
create policy "syn_words read anon and authenticated"
  on public.syn_words
  for select
  to anon, authenticated
  using (true);

drop function if exists public.add_synonym_word(text, text[]);
create or replace function public.add_synonym_word(p_word text, p_synonyms text[])
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  v_actor_username text;
  v_word text;
  v_synonyms text[];
  v_duplicate boolean;
  v_has_active_column boolean;
  v_has_search_text_column boolean;
  v_has_source_id_column boolean;
  v_source_id_needs_value boolean;
  v_source_id_is_nullable boolean;
  v_source_id_default text;
  v_source_id_udt_name text;
  v_source_id_bigint bigint;
  v_source_id_numeric numeric;
  v_source_id_text text;
  v_search_text text;
begin
  v_actor_username := lower(
    split_part(
      coalesce(auth.jwt() ->> 'email', ''),
      '@',
      1
    )
  );

  if v_actor_username <> 'admin' then
    return jsonb_build_object(
      'ok', false,
      'reason', 'forbidden',
      'message', 'Admin baimena behar da sinonimo berriak gehitzeko.'
    );
  end if;

  v_word := lower(trim(coalesce(p_word, '')));
  if char_length(v_word) < 1 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid',
      'message', 'Hitza bete behar da.'
    );
  end if;

  select coalesce(array_agg(distinct cleaned_syn), '{}'::text[])
  into v_synonyms
  from (
    select lower(trim(raw_syn)) as cleaned_syn
    from unnest(coalesce(p_synonyms, '{}'::text[])) as raw_syn
    where char_length(trim(coalesce(raw_syn, ''))) > 0
  ) s
  where s.cleaned_syn <> v_word;

  if coalesce(array_length(v_synonyms, 1), 0) = 0 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid',
      'message', 'Sinonimo bat gutxienez bete behar da.'
    );
  end if;

  select exists (
    select 1
    from public.syn_words sw
    where lower(trim(sw.hitza)) = v_word
      or exists (
        select 1
        from unnest(coalesce(sw.sinonimoak, '{}'::text[])) as existing_syn
        where lower(trim(existing_syn)) = v_word
      )
  )
  into v_duplicate;

  if v_duplicate then
    return jsonb_build_object(
      'ok', false,
      'reason', 'duplicate',
      'message', 'Hitza jada badago sinonimoen hiztegian.'
    );
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'syn_words'
      and column_name = 'active'
  )
  into v_has_active_column;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'syn_words'
      and column_name = 'search_text'
  )
  into v_has_search_text_column;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'syn_words'
      and column_name = 'source_id'
  )
  into v_has_source_id_column;

  if v_has_source_id_column then
    select
      (c.is_nullable = 'YES') as source_id_is_nullable,
      c.column_default,
      c.udt_name
    into
      v_source_id_is_nullable,
      v_source_id_default,
      v_source_id_udt_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'syn_words'
      and c.column_name = 'source_id'
    limit 1;

    v_source_id_needs_value :=
      (not coalesce(v_source_id_is_nullable, true))
      and v_source_id_default is null;
  else
    v_source_id_needs_value := false;
  end if;

  v_search_text := trim(
    concat_ws(
      ' ',
      v_word,
      array_to_string(v_synonyms, ' ')
    )
  );

  if v_source_id_needs_value then
    if v_source_id_udt_name in ('int2', 'int4', 'int8') then
      select coalesce(max(sw.source_id::bigint), 0) + 1
      into v_source_id_bigint
      from public.syn_words sw;

      if v_has_active_column and v_has_search_text_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, active, search_text)
        values (v_source_id_bigint, v_word, v_synonyms, 1, true, v_search_text);
      elsif v_has_active_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, active)
        values (v_source_id_bigint, v_word, v_synonyms, 1, true);
      elsif v_has_search_text_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, search_text)
        values (v_source_id_bigint, v_word, v_synonyms, 1, v_search_text);
      else
        insert into public.syn_words (source_id, hitza, sinonimoak, level)
        values (v_source_id_bigint, v_word, v_synonyms, 1);
      end if;
    elsif v_source_id_udt_name in ('numeric', 'decimal') then
      select coalesce(max(sw.source_id::numeric), 0) + 1
      into v_source_id_numeric
      from public.syn_words sw;

      if v_has_active_column and v_has_search_text_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, active, search_text)
        values (v_source_id_numeric, v_word, v_synonyms, 1, true, v_search_text);
      elsif v_has_active_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, active)
        values (v_source_id_numeric, v_word, v_synonyms, 1, true);
      elsif v_has_search_text_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, search_text)
        values (v_source_id_numeric, v_word, v_synonyms, 1, v_search_text);
      else
        insert into public.syn_words (source_id, hitza, sinonimoak, level)
        values (v_source_id_numeric, v_word, v_synonyms, 1);
      end if;
    elsif v_source_id_udt_name in ('text', 'varchar', 'bpchar', 'citext') then
      v_source_id_text := replace(gen_random_uuid()::text, '-', '');

      if v_has_active_column and v_has_search_text_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, active, search_text)
        values (v_source_id_text, v_word, v_synonyms, 1, true, v_search_text);
      elsif v_has_active_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, active)
        values (v_source_id_text, v_word, v_synonyms, 1, true);
      elsif v_has_search_text_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, search_text)
        values (v_source_id_text, v_word, v_synonyms, 1, v_search_text);
      else
        insert into public.syn_words (source_id, hitza, sinonimoak, level)
        values (v_source_id_text, v_word, v_synonyms, 1);
      end if;
    elsif v_source_id_udt_name = 'uuid' then
      if v_has_active_column and v_has_search_text_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, active, search_text)
        values (gen_random_uuid(), v_word, v_synonyms, 1, true, v_search_text);
      elsif v_has_active_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, active)
        values (gen_random_uuid(), v_word, v_synonyms, 1, true);
      elsif v_has_search_text_column then
        insert into public.syn_words (source_id, hitza, sinonimoak, level, search_text)
        values (gen_random_uuid(), v_word, v_synonyms, 1, v_search_text);
      else
        insert into public.syn_words (source_id, hitza, sinonimoak, level)
        values (gen_random_uuid(), v_word, v_synonyms, 1);
      end if;
    else
      return jsonb_build_object(
        'ok', false,
        'reason', 'invalid',
        'message', 'Ezin da source_id automatikoki bete. Konfiguratu source_id default balioarekin.'
      );
    end if;
  elsif v_has_active_column and v_has_search_text_column then
    insert into public.syn_words (hitza, sinonimoak, level, active, search_text)
    values (v_word, v_synonyms, 1, true, v_search_text);
  elsif v_has_active_column then
    insert into public.syn_words (hitza, sinonimoak, level, active)
    values (v_word, v_synonyms, 1, true);
  elsif v_has_search_text_column then
    insert into public.syn_words (hitza, sinonimoak, level, search_text)
    values (v_word, v_synonyms, 1, v_search_text);
  else
    insert into public.syn_words (hitza, sinonimoak, level)
    values (v_word, v_synonyms, 1);
  end if;

  return jsonb_build_object('ok', true, 'reason', 'inserted');
exception
  when undefined_table then
    return jsonb_build_object(
      'ok', false,
      'reason', 'missing_table',
      'message', '"syn_words" taula falta da Supabasen.'
    );
end;
$$;

grant execute on function public.add_synonym_word(text, text[])
  to authenticated;

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
drop policy if exists "favorites insert anon and authenticated" on public.user_favorite_words;
drop policy if exists "favorites delete anon and authenticated" on public.user_favorite_words;
drop policy if exists "favorites select own authenticated" on public.user_favorite_words;
drop policy if exists "favorites insert own authenticated" on public.user_favorite_words;
drop policy if exists "favorites delete own authenticated" on public.user_favorite_words;

create policy "favorites select own authenticated"
  on public.user_favorite_words
  for select
  to authenticated
  using (
    user_name = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
  );

create policy "favorites insert own authenticated"
  on public.user_favorite_words
  for insert
  to authenticated
  with check (
    char_length(trim(user_name)) >= 2
    and word_key = lower(trim(word_key))
    and mode in ('synonyms', 'meaning')
    and user_name = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
  );

create policy "favorites delete own authenticated"
  on public.user_favorite_words
  for delete
  to authenticated
  using (
    user_name = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
  );

-- Example user creation:
-- insert into public.user_access_keys (user_name, key_hash)
-- values ('elio01', crypt('zure-gakoa', gen_salt('bf')))
-- on conflict (user_name) do update
-- set key_hash = excluded.key_hash,
--     created_at = now();

notify pgrst, 'reload schema';
