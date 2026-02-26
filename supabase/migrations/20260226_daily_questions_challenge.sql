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

-- Optional minimal words table for tracking progress by word_id.
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  lemma text not null unique,
  level text null check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  topics text[] null,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  prompt text not null,
  choices jsonb not null,
  answer_index int not null,
  explanation text null,
  level text null check (level in ('B1', 'B2', 'C1', 'C2')),
  topics text[] null,
  word_ids uuid[] null,
  source text not null default 'manual' check (source in ('manual', 'generated')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_choices_is_array check (jsonb_typeof(choices) = 'array'),
  constraint questions_choices_has_min_2 check (jsonb_array_length(choices) >= 2),
  constraint questions_answer_index_bounds check (
    answer_index >= 0 and answer_index < jsonb_array_length(choices)
  )
);

create table if not exists public.daily_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  question_ids uuid[] not null,
  current_index int not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_sets_unique_user_day unique (user_id, day),
  constraint daily_sets_question_count check (coalesce(array_length(question_ids, 1), 0) = 5),
  constraint daily_sets_current_index_bounds check (current_index >= 0 and current_index <= 5)
);

create table if not exists public.daily_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_index int not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  constraint daily_answers_unique_user_day_question unique (user_id, day, question_id),
  constraint daily_answers_selected_index_nonnegative check (selected_index >= 0)
);

create table if not exists public.word_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null,
  status text not null default 'new' check (status in ('new', 'learning', 'reinforcing', 'mastered')),
  correct_streak int not null default 0 check (correct_streak >= 0),
  wrong_count int not null default 0 check (wrong_count >= 0),
  next_review date null,
  last_seen date null,
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create index if not exists questions_active_idx on public.questions (active);
create index if not exists questions_type_idx on public.questions (type);
create index if not exists questions_level_idx on public.questions (level);
create index if not exists daily_sets_user_day_idx on public.daily_sets (user_id, day);
create index if not exists daily_answers_user_day_idx on public.daily_answers (user_id, day);
create index if not exists word_progress_user_next_review_idx on public.word_progress (user_id, next_review);

drop trigger if exists trg_questions_updated_at on public.questions;
create trigger trg_questions_updated_at
before update on public.questions
for each row
execute function public.set_row_updated_at();

drop trigger if exists trg_daily_sets_updated_at on public.daily_sets;
create trigger trg_daily_sets_updated_at
before update on public.daily_sets
for each row
execute function public.set_row_updated_at();

drop trigger if exists trg_word_progress_updated_at on public.word_progress;
create trigger trg_word_progress_updated_at
before update on public.word_progress
for each row
execute function public.set_row_updated_at();

alter table public.questions enable row level security;
alter table public.daily_sets enable row level security;
alter table public.daily_answers enable row level security;
alter table public.word_progress enable row level security;

drop policy if exists questions_select_authenticated on public.questions;
create policy questions_select_authenticated
on public.questions
for select
to authenticated
using (true);

-- Admin write policies are intentionally omitted for now (read-only question bank by default).

drop policy if exists daily_sets_own_select on public.daily_sets;
create policy daily_sets_own_select
on public.daily_sets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists daily_sets_own_insert on public.daily_sets;
create policy daily_sets_own_insert
on public.daily_sets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists daily_sets_own_update on public.daily_sets;
create policy daily_sets_own_update
on public.daily_sets
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists daily_sets_own_delete on public.daily_sets;
create policy daily_sets_own_delete
on public.daily_sets
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists daily_answers_own_select on public.daily_answers;
create policy daily_answers_own_select
on public.daily_answers
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists daily_answers_own_insert on public.daily_answers;
create policy daily_answers_own_insert
on public.daily_answers
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists daily_answers_own_update on public.daily_answers;
create policy daily_answers_own_update
on public.daily_answers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists daily_answers_own_delete on public.daily_answers;
create policy daily_answers_own_delete
on public.daily_answers
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists word_progress_own_select on public.word_progress;
create policy word_progress_own_select
on public.word_progress
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists word_progress_own_insert on public.word_progress;
create policy word_progress_own_insert
on public.word_progress
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists word_progress_own_update on public.word_progress;
create policy word_progress_own_update
on public.word_progress
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists word_progress_own_delete on public.word_progress;
create policy word_progress_own_delete
on public.word_progress
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.get_or_create_daily_set(p_day date default current_date)
returns public.daily_sets
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.daily_sets%rowtype;
  v_created public.daily_sets%rowtype;
  v_user_level text := null; -- TODO: wire from user profile table when available.
  v_due_word_ids uuid[] := '{}'::uuid[];
  v_selected_question_ids uuid[] := '{}'::uuid[];
  v_selected_word_ids uuid[] := '{}'::uuid[];
  v_selected_types text[] := '{}'::text[];
  v_pick_question_id uuid;
  v_pick_type text;
  v_pick_word_ids uuid[];
begin
  if v_uid is null then
    raise exception 'Erabiltzailea autentifikatuta egon behar da'
      using errcode = '42501';
  end if;

  select ds.*
  into v_existing
  from public.daily_sets ds
  where ds.user_id = v_uid and ds.day = p_day;

  if found then
    return v_existing;
  end if;

  select coalesce(array_agg(distinct wp.word_id), '{}'::uuid[])
  into v_due_word_ids
  from public.word_progress wp
  where wp.user_id = v_uid
    and wp.next_review is not null
    and wp.next_review <= p_day;

  while coalesce(array_length(v_selected_question_ids, 1), 0) < 5 loop
    select q.id, q.type, coalesce(q.word_ids, '{}'::uuid[])
    into v_pick_question_id, v_pick_type, v_pick_word_ids
    from public.questions q
    where q.active = true
      and not (q.id = any(v_selected_question_ids))
    order by
      -- Priority: due-review questions first, then level/type diversity, then random.
      case
        when coalesce(array_length(v_due_word_ids, 1), 0) > 0
          and coalesce(q.word_ids, '{}'::uuid[]) && v_due_word_ids
          then 0
        else 2
      end,
      case
        when v_user_level is not null and q.level = v_user_level then 0
        else 1
      end,
      case
        when coalesce(array_length(v_selected_types, 1), 0) = 0 then 0
        when not (q.type = any(v_selected_types)) then 0
        when exists (
          select 1
          from public.questions q2
          where q2.active = true
            and not (q2.id = any(v_selected_question_ids))
            and not (q2.type = any(v_selected_types))
        ) then 1
        else 0
      end,
      case
        when coalesce(array_length(v_selected_word_ids, 1), 0) = 0 then 0
        when coalesce(array_length(q.word_ids, 1), 0) = 0 then 0
        when coalesce(q.word_ids, '{}'::uuid[]) && v_selected_word_ids then 1
        else 0
      end,
      random()
    limit 1;

    if v_pick_question_id is null then
      raise exception 'Ez dago nahikoa galdera aktibo (gutxienez 5 behar dira)'
        using errcode = '22023';
    end if;

    v_selected_question_ids := array_append(v_selected_question_ids, v_pick_question_id);
    v_selected_types := array_append(v_selected_types, coalesce(v_pick_type, 'UNK'));

    select coalesce(array_agg(distinct x), '{}'::uuid[])
    into v_selected_word_ids
    from unnest(coalesce(v_selected_word_ids, '{}'::uuid[]) || coalesce(v_pick_word_ids, '{}'::uuid[])) as t(x);

    v_pick_question_id := null;
    v_pick_type := null;
    v_pick_word_ids := null;
  end loop;

  insert into public.daily_sets (user_id, day, question_ids, current_index, completed)
  values (v_uid, p_day, v_selected_question_ids, 0, false)
  on conflict (user_id, day) do nothing
  returning * into v_created;

  if found then
    return v_created;
  end if;

  select ds.*
  into v_existing
  from public.daily_sets ds
  where ds.user_id = v_uid and ds.day = p_day;

  return v_existing;
end;
$$;

grant execute on function public.get_or_create_daily_set(date) to authenticated;

create or replace function public.submit_answer(
  p_day date,
  p_question_id uuid,
  p_selected_index int
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_set public.daily_sets%rowtype;
  v_question public.questions%rowtype;
  v_is_correct boolean;
  v_answered_count int := 0;
  v_total_questions int := 0;
  v_word_id uuid;
  v_progress public.word_progress%rowtype;
  v_prev_status text;
  v_prev_correct_streak int;
  v_prev_wrong_count int;
  v_next_status text;
  v_next_correct_streak int;
  v_next_wrong_count int;
  v_next_review date;
begin
  if v_uid is null then
    raise exception 'Erabiltzailea autentifikatuta egon behar da'
      using errcode = '42501';
  end if;

  select ds.*
  into v_set
  from public.daily_sets ds
  where ds.user_id = v_uid and ds.day = p_day
  for update;

  if not found then
    raise exception 'Ez dago eguneko saiorik data honetarako'
      using errcode = 'P0002';
  end if;

  if not (p_question_id = any(v_set.question_ids)) then
    raise exception 'Galdera hau ez dago gaurko sortan'
      using errcode = '22023';
  end if;

  select q.*
  into v_question
  from public.questions q
  where q.id = p_question_id;

  if not found then
    raise exception 'Galdera ez da aurkitu'
      using errcode = 'P0002';
  end if;

  if p_selected_index < 0 or p_selected_index >= jsonb_array_length(v_question.choices) then
    raise exception 'selected_index ez da baliozkoa'
      using errcode = '22023';
  end if;

  v_is_correct := (p_selected_index = v_question.answer_index);

  insert into public.daily_answers (user_id, day, question_id, selected_index, is_correct, answered_at)
  values (v_uid, p_day, p_question_id, p_selected_index, v_is_correct, now())
  on conflict (user_id, day, question_id)
  do update
    set selected_index = excluded.selected_index,
        is_correct = excluded.is_correct,
        answered_at = now();

  foreach v_word_id in array coalesce(v_question.word_ids, '{}'::uuid[]) loop
    continue when v_word_id is null;

    select wp.*
    into v_progress
    from public.word_progress wp
    where wp.user_id = v_uid and wp.word_id = v_word_id
    for update;

    if not found then
      v_prev_status := 'new';
      v_prev_correct_streak := 0;
      v_prev_wrong_count := 0;
    else
      v_prev_status := coalesce(v_progress.status, 'new');
      v_prev_correct_streak := greatest(coalesce(v_progress.correct_streak, 0), 0);
      v_prev_wrong_count := greatest(coalesce(v_progress.wrong_count, 0), 0);
    end if;

    if v_is_correct then
      v_next_correct_streak := v_prev_correct_streak + 1;
      v_next_wrong_count := v_prev_wrong_count;

      -- Simple MVP SRS promotion: learning -> reinforcing -> mastered with longer intervals.
      if v_prev_status = 'reinforcing' and v_next_correct_streak >= 5 then
        v_next_status := 'mastered';
        v_next_review := p_day + 14;
      elsif v_prev_status = 'mastered' then
        v_next_status := 'mastered';
        v_next_review := p_day + 14;
      elsif v_next_correct_streak >= 3 then
        v_next_status := 'reinforcing';
        v_next_review := p_day + 7;
      else
        v_next_status := 'learning';
        v_next_review := p_day + 3;
      end if;
    else
      v_next_correct_streak := 0;
      v_next_wrong_count := v_prev_wrong_count + 1;
      v_next_status := 'learning';
      v_next_review := p_day + 1;
    end if;

    insert into public.word_progress (
      user_id,
      word_id,
      status,
      correct_streak,
      wrong_count,
      next_review,
      last_seen,
      updated_at
    )
    values (
      v_uid,
      v_word_id,
      v_next_status,
      v_next_correct_streak,
      v_next_wrong_count,
      v_next_review,
      p_day,
      now()
    )
    on conflict (user_id, word_id)
    do update set
      status = excluded.status,
      correct_streak = excluded.correct_streak,
      wrong_count = excluded.wrong_count,
      next_review = excluded.next_review,
      last_seen = excluded.last_seen,
      updated_at = now();
  end loop;

  v_total_questions := coalesce(array_length(v_set.question_ids, 1), 0);

  select count(*)
  into v_answered_count
  from public.daily_answers da
  where da.user_id = v_uid
    and da.day = p_day
    and da.question_id = any(v_set.question_ids);

  update public.daily_sets ds
  set current_index = greatest(coalesce(ds.current_index, 0), least(v_answered_count, v_total_questions)),
      completed = (v_answered_count >= v_total_questions),
      updated_at = now()
  where ds.id = v_set.id
  returning * into v_set;

  return jsonb_build_object(
    'day', p_day,
    'question_id', p_question_id,
    'selected_index', p_selected_index,
    'is_correct', v_is_correct,
    'correct_index', v_question.answer_index,
    'answered_count', v_answered_count,
    'current_index', v_set.current_index,
    'completed', v_set.completed
  );
end;
$$;

grant execute on function public.submit_answer(date, uuid, int) to authenticated;
