create extension if not exists pgcrypto;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.grammar_lessons (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('B1', 'B2', 'C1')),
  title text not null,
  short_explanation text not null,
  examples jsonb not null default '[]'::jsonb,
  more_info text null,
  estimated_minutes int not null default 4 check (estimated_minutes between 1 and 30),
  tags text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_lessons_examples_is_array check (jsonb_typeof(examples) = 'array'),
  constraint grammar_lessons_unique_level_title unique (level, title)
);

create table if not exists public.grammar_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.grammar_lessons(id) on delete cascade,
  position int not null default 1 check (position >= 1),
  prompt text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_questions_options_is_array check (jsonb_typeof(options) = 'array'),
  constraint grammar_questions_options_min_2 check (jsonb_array_length(options) >= 2),
  constraint grammar_questions_answer_index_bounds check (
    correct_index >= 0 and correct_index < jsonb_array_length(options)
  ),
  constraint grammar_questions_unique_lesson_position unique (lesson_id, position)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_level text not null default 'B1' check (preferred_level in ('B1', 'B2', 'C1')),
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grammar_daily_assignment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  lesson_id uuid not null references public.grammar_lessons(id) on delete restrict,
  level text not null check (level in ('B1', 'B2', 'C1')),
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_daily_assignment_unique_user_day unique (user_id, day)
);

create table if not exists public.grammar_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.grammar_daily_assignment(id) on delete cascade,
  lesson_id uuid not null references public.grammar_lessons(id) on delete cascade,
  day date not null,
  answers jsonb not null default '[]'::jsonb,
  correct_count int not null default 0 check (correct_count >= 0),
  wrong_count int not null default 0 check (wrong_count >= 0),
  total_questions int not null default 0 check (total_questions >= 0),
  score numeric(5,2) not null default 0,
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  completed boolean not null default false,
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_attempts_answers_is_array check (jsonb_typeof(answers) = 'array'),
  constraint grammar_attempts_unique_user_assignment unique (user_id, assignment_id)
);

create index if not exists grammar_lessons_active_level_idx
  on public.grammar_lessons (active, level);
create index if not exists grammar_questions_lesson_active_idx
  on public.grammar_questions (lesson_id, active, position);
create index if not exists user_settings_level_idx
  on public.user_settings (preferred_level);
create index if not exists grammar_daily_assignment_user_day_idx
  on public.grammar_daily_assignment (user_id, day);
create index if not exists grammar_daily_assignment_lesson_idx
  on public.grammar_daily_assignment (lesson_id);
create index if not exists grammar_attempts_user_day_idx
  on public.grammar_attempts (user_id, day);
create index if not exists grammar_attempts_assignment_idx
  on public.grammar_attempts (assignment_id);
create index if not exists grammar_attempts_completed_idx
  on public.grammar_attempts (user_id, completed, completed_at);

drop trigger if exists trg_grammar_lessons_updated_at on public.grammar_lessons;
create trigger trg_grammar_lessons_updated_at
before update on public.grammar_lessons
for each row execute function public.set_row_updated_at();

drop trigger if exists trg_grammar_questions_updated_at on public.grammar_questions;
create trigger trg_grammar_questions_updated_at
before update on public.grammar_questions
for each row execute function public.set_row_updated_at();

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_row_updated_at();

drop trigger if exists trg_grammar_daily_assignment_updated_at on public.grammar_daily_assignment;
create trigger trg_grammar_daily_assignment_updated_at
before update on public.grammar_daily_assignment
for each row execute function public.set_row_updated_at();

drop trigger if exists trg_grammar_attempts_updated_at on public.grammar_attempts;
create trigger trg_grammar_attempts_updated_at
before update on public.grammar_attempts
for each row execute function public.set_row_updated_at();

alter table public.grammar_lessons enable row level security;
alter table public.grammar_questions enable row level security;
alter table public.user_settings enable row level security;
alter table public.grammar_daily_assignment enable row level security;
alter table public.grammar_attempts enable row level security;

drop policy if exists grammar_lessons_select_authenticated on public.grammar_lessons;
create policy grammar_lessons_select_authenticated
on public.grammar_lessons
for select
to authenticated
using (active = true);

drop policy if exists grammar_questions_select_authenticated on public.grammar_questions;
create policy grammar_questions_select_authenticated
on public.grammar_questions
for select
to authenticated
using (
  active = true
  and exists (
    select 1
    from public.grammar_lessons gl
    where gl.id = grammar_questions.lesson_id
      and gl.active = true
  )
);

drop policy if exists user_settings_own_select on public.user_settings;
create policy user_settings_own_select
on public.user_settings
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_settings_own_insert on public.user_settings;
create policy user_settings_own_insert
on public.user_settings
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_settings_own_update on public.user_settings;
create policy user_settings_own_update
on public.user_settings
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_settings_own_delete on public.user_settings;
create policy user_settings_own_delete
on public.user_settings
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists grammar_daily_assignment_own_select on public.grammar_daily_assignment;
create policy grammar_daily_assignment_own_select
on public.grammar_daily_assignment
for select to authenticated
using (user_id = auth.uid());

drop policy if exists grammar_daily_assignment_own_insert on public.grammar_daily_assignment;
create policy grammar_daily_assignment_own_insert
on public.grammar_daily_assignment
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists grammar_daily_assignment_own_update on public.grammar_daily_assignment;
create policy grammar_daily_assignment_own_update
on public.grammar_daily_assignment
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists grammar_daily_assignment_own_delete on public.grammar_daily_assignment;
create policy grammar_daily_assignment_own_delete
on public.grammar_daily_assignment
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists grammar_attempts_own_select on public.grammar_attempts;
create policy grammar_attempts_own_select
on public.grammar_attempts
for select to authenticated
using (user_id = auth.uid());

drop policy if exists grammar_attempts_own_insert on public.grammar_attempts;
create policy grammar_attempts_own_insert
on public.grammar_attempts
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists grammar_attempts_own_update on public.grammar_attempts;
create policy grammar_attempts_own_update
on public.grammar_attempts
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists grammar_attempts_own_delete on public.grammar_attempts;
create policy grammar_attempts_own_delete
on public.grammar_attempts
for delete to authenticated
using (user_id = auth.uid());

create or replace function public.get_or_create_user_settings(
  p_preferred_level text default null,
  p_timezone text default null
)
returns public.user_settings
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_level text := coalesce(nullif(trim(p_preferred_level), ''), 'B1');
  v_timezone text := coalesce(nullif(trim(p_timezone), ''), 'Europe/Madrid');
  v_row public.user_settings%rowtype;
begin
  if v_uid is null then
    raise exception 'Erabiltzailea autentifikatuta egon behar da'
      using errcode = '42501';
  end if;

  if v_level not in ('B1', 'B2', 'C1') then
    v_level := 'B1';
  end if;

  insert into public.user_settings (user_id, preferred_level, timezone)
  values (v_uid, v_level, v_timezone)
  on conflict (user_id) do update
  set preferred_level = coalesce(nullif(trim(p_preferred_level), ''), user_settings.preferred_level),
      timezone = coalesce(nullif(trim(p_timezone), ''), user_settings.timezone),
      updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.get_or_create_user_settings(text, text) to authenticated;

create or replace function public.grammar_effective_day(
  p_timezone text,
  p_now timestamptz default now()
)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_timezone text := coalesce(nullif(trim(p_timezone), ''), 'Europe/Madrid');
  v_local timestamp;
begin
  v_local := p_now at time zone v_timezone;
  if v_local::time < time '08:00' then
    return (v_local::date - 1);
  end if;
  return v_local::date;
end;
$$;

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

  select gda.*
  into v_existing
  from public.grammar_daily_assignment gda
  where gda.user_id = v_uid and gda.day = v_day;

  if found then
    return v_existing;
  end if;

  -- Deterministic per-user/per-day pick so the lesson is stable during the same day.
  select gl.*
  into v_pick
  from public.grammar_lessons gl
  where gl.active = true
    and gl.level = v_level
  order by md5(v_uid::text || '|' || v_day::text || '|' || gl.id::text)
  limit 1;

  if not found then
    select gl.*
    into v_pick
    from public.grammar_lessons gl
    where gl.active = true
    order by md5(v_uid::text || '|' || v_day::text || '|' || gl.id::text)
    limit 1;
  end if;

  if not found then
    raise exception 'Ez dago gramatika ikasgai aktiborik'
      using errcode = 'P0002';
  end if;

  insert into public.grammar_daily_assignment (user_id, day, lesson_id, level, timezone)
  values (v_uid, v_day, v_pick.id, v_pick.level, v_timezone)
  on conflict (user_id, day) do nothing
  returning * into v_created;

  if found then
    return v_created;
  end if;

  select gda.*
  into v_existing
  from public.grammar_daily_assignment gda
  where gda.user_id = v_uid and gda.day = v_day;

  return v_existing;
end;
$$;

grant execute on function public.get_or_create_grammar_assignment(text, text, timestamptz)
to authenticated;

