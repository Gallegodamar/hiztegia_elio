-- Fix: allow one grammar assignment per user/day/level so changing "Maila"
-- in the UI can show a different lesson the same day.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'grammar_daily_assignment_unique_user_day'
      and conrelid = 'public.grammar_daily_assignment'::regclass
  ) then
    alter table public.grammar_daily_assignment
      drop constraint grammar_daily_assignment_unique_user_day;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'grammar_daily_assignment_unique_user_day_level'
      and conrelid = 'public.grammar_daily_assignment'::regclass
  ) then
    alter table public.grammar_daily_assignment
      add constraint grammar_daily_assignment_unique_user_day_level
      unique (user_id, day, level);
  end if;
end
$$;

create index if not exists grammar_daily_assignment_user_day_level_idx
  on public.grammar_daily_assignment (user_id, day, level);

create or replace function public.get_or_create_grammar_assignment(
  p_level text default null,
  p_timezone text default null,
  p_now timestamptz default now()
)
returns public.grammar_daily_assignment
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_settings public.user_settings%rowtype;
  v_existing public.grammar_daily_assignment%rowtype;
  v_created public.grammar_daily_assignment%rowtype;
  v_level text;
  v_timezone text;
  v_day date;
  v_pick public.grammar_lessons%rowtype;
  v_assignment_level text;
begin
  if v_uid is null then
    raise exception 'Erabiltzailea autentifikatuta egon behar da'
      using errcode = '42501';
  end if;

  select * into v_settings
  from public.get_or_create_user_settings(p_level, p_timezone);

  v_level := case
    when p_level in ('B1', 'B2', 'C1') then p_level
    else v_settings.preferred_level
  end;
  v_timezone := coalesce(nullif(trim(p_timezone), ''), v_settings.timezone, 'Europe/Madrid');
  v_day := public.grammar_effective_day(v_timezone, p_now);

  -- Reuse today's assignment for this specific level.
  select gda.*
  into v_existing
  from public.grammar_daily_assignment gda
  where gda.user_id = v_uid
    and gda.day = v_day
    and gda.level = v_level;

  if found then
    return v_existing;
  end if;

  -- Deterministic per-user/per-day/per-level pick so the lesson is stable.
  select gl.*
  into v_pick
  from public.grammar_lessons gl
  where gl.active = true
    and gl.level = v_level
  order by md5(v_uid::text || '|' || v_day::text || '|' || v_level || '|' || gl.id::text)
  limit 1;

  if not found then
    select gl.*
    into v_pick
    from public.grammar_lessons gl
    where gl.active = true
    order by md5(v_uid::text || '|' || v_day::text || '|' || v_level || '|' || gl.id::text)
    limit 1;
  end if;

  if not found then
    raise exception 'Ez dago gramatika ikasgai aktiborik'
      using errcode = 'P0002';
  end if;

  v_assignment_level := coalesce(v_pick.level, v_level);

  insert into public.grammar_daily_assignment (user_id, day, lesson_id, level, timezone)
  values (v_uid, v_day, v_pick.id, v_assignment_level, v_timezone)
  on conflict (user_id, day, level) do nothing
  returning * into v_created;

  if found then
    return v_created;
  end if;

  select gda.*
  into v_existing
  from public.grammar_daily_assignment gda
  where gda.user_id = v_uid
    and gda.day = v_day
    and gda.level = v_assignment_level;

  return v_existing;
end;
$$;

grant execute on function public.get_or_create_grammar_assignment(text, text, timestamptz)
to authenticated;

