create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  source text not null default 'daily' check (source in ('daily', 'review', 'practice')),
  is_correct boolean null
);

create index if not exists user_favorites_user_created_at_idx
  on public.user_favorites (user_id, created_at desc);

create index if not exists review_events_user_reviewed_at_idx
  on public.review_events (user_id, reviewed_at desc);

create index if not exists review_events_user_word_idx
  on public.review_events (user_id, word_id);

create index if not exists review_events_user_reviewed_day_idx
  on public.review_events (user_id, ((reviewed_at at time zone 'UTC')::date));

alter table public.user_favorites enable row level security;
alter table public.review_events enable row level security;

drop policy if exists user_favorites_own_select on public.user_favorites;
create policy user_favorites_own_select
on public.user_favorites
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_favorites_own_insert on public.user_favorites;
create policy user_favorites_own_insert
on public.user_favorites
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_favorites_own_delete on public.user_favorites;
create policy user_favorites_own_delete
on public.user_favorites
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists review_events_own_select on public.review_events;
create policy review_events_own_select
on public.review_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists review_events_own_insert on public.review_events;
create policy review_events_own_insert
on public.review_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists review_events_own_update on public.review_events;
create policy review_events_own_update
on public.review_events
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists review_events_own_delete on public.review_events;
create policy review_events_own_delete
on public.review_events
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.get_home_stats(p_days int default 7)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_days int := greatest(1, least(coalesce(p_days, 7), 31));
  v_start_day date := current_date - (greatest(1, least(coalesce(p_days, 7), 31)) - 1);
  v_favorites_count int := 0;
  v_reviewed_words_count int := 0;
  v_review_events_count int := 0;
  v_series jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Erabiltzailea autentifikatuta egon behar da'
      using errcode = '42501';
  end if;

  select count(*)::int
  into v_favorites_count
  from public.user_favorites uf
  where uf.user_id = v_uid;

  select count(distinct re.word_id)::int, count(*)::int
  into v_reviewed_words_count, v_review_events_count
  from public.review_events re
  where re.user_id = v_uid
    and (re.reviewed_at at time zone 'UTC')::date between v_start_day and current_date;

  with days as (
    select generate_series(v_start_day, current_date, interval '1 day')::date as day
  ),
  review_counts as (
    select
      (re.reviewed_at at time zone 'UTC')::date as day,
      count(*)::int as reviews
    from public.review_events re
    where re.user_id = v_uid
      and (re.reviewed_at at time zone 'UTC')::date between v_start_day and current_date
    group by 1
  ),
  favorite_counts as (
    select
      (uf.created_at at time zone 'UTC')::date as day,
      count(*)::int as favorites
    from public.user_favorites uf
    where uf.user_id = v_uid
      and (uf.created_at at time zone 'UTC')::date between v_start_day and current_date
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'reviews', coalesce(rc.reviews, 0),
        'favorites', coalesce(fc.favorites, 0)
      )
      order by d.day
    ),
    '[]'::jsonb
  )
  into v_series
  from days d
  left join review_counts rc on rc.day = d.day
  left join favorite_counts fc on fc.day = d.day;

  return jsonb_build_object(
    'favorites_count', coalesce(v_favorites_count, 0),
    'reviewed_words_count_7d', coalesce(v_reviewed_words_count, 0),
    'review_events_count_7d', coalesce(v_review_events_count, 0),
    'series_7d', coalesce(v_series, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_home_stats(int) to authenticated;
