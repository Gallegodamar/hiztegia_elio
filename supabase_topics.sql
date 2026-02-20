-- Topics + categories + items API for "Gaiak"
-- Run this in Supabase SQL editor.

grant usage on schema public to anon, authenticated;

alter table if exists public.topics enable row level security;
alter table if exists public.topic_categories enable row level security;
alter table if exists public.topic_items enable row level security;

drop policy if exists "topics read anon and authenticated" on public.topics;
create policy "topics read anon and authenticated"
  on public.topics
  for select
  to anon, authenticated
  using (true);

drop policy if exists "topic_categories read anon and authenticated" on public.topic_categories;
create policy "topic_categories read anon and authenticated"
  on public.topic_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "topic_items read anon and authenticated" on public.topic_items;
create policy "topic_items read anon and authenticated"
  on public.topic_items
  for select
  to anon, authenticated
  using (true);

drop function if exists public.get_topics();
create or replace function public.get_topics()
returns table (
  id bigint,
  slug text,
  title text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    t.id,
    regexp_replace(lower(trim(t.slug)), '\.(ts|tsx)$', '', 'i') as slug,
    coalesce(
      nullif(trim(t.title), ''),
      initcap(
        replace(
          regexp_replace(trim(t.slug), '\.(ts|tsx)$', '', 'i'),
          '-',
          ' '
        )
      )
    ) as title
  from public.topics t
  where char_length(trim(coalesce(t.slug, ''))) > 0
  order by coalesce(nullif(trim(t.title), ''), trim(t.slug)) asc;
$$;

drop function if exists public.get_topic(text);
create or replace function public.get_topic(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_topic_id bigint;
  v_topic_slug text;
  v_topic_title text;
  v_categories json;
begin
  select
    t.id,
    regexp_replace(lower(trim(t.slug)), '\.(ts|tsx)$', '', 'i'),
    coalesce(
      nullif(trim(t.title), ''),
      initcap(
        replace(
          regexp_replace(trim(t.slug), '\.(ts|tsx)$', '', 'i'),
          '-',
          ' '
        )
      )
    )
  into v_topic_id, v_topic_slug, v_topic_title
  from public.topics t
  where regexp_replace(
          regexp_replace(lower(trim(t.slug)), '\.(ts|tsx)$', '', 'i'),
          '[^a-z0-9]+',
          '',
          'g'
        )
        = regexp_replace(
          regexp_replace(lower(trim(p_slug)), '\.(ts|tsx)$', '', 'i'),
          '[^a-z0-9]+',
          '',
          'g'
        )
  limit 1;

  if not found then
    return null;
  end if;

  with catalog as (
    select
      lower(trim(coalesce(tc.key, ''))) as key_norm,
      nullif(trim(tc.key), '') as key,
      nullif(trim(tc.label), '') as label,
      coalesce(tc.order_index, 2147483647) as order_index
    from public.topic_categories tc
  ),
  normalized_items as (
    select
      lower(trim(coalesce(ti.category, ''))) as category_norm,
      nullif(trim(ti.category), '') as category_raw,
      trim(ti.item) as item,
      coalesce(ti.sort_index, 2147483647) as sort_index
    from public.topic_items ti
    where ti.topic_id = v_topic_id
      and char_length(trim(coalesce(ti.item, ''))) > 0
  ),
  items_by_category as (
    select
      ni.category_norm,
      min(ni.category_raw) as category_raw,
      coalesce(json_agg(ni.item order by ni.sort_index, ni.item), '[]'::json) as items
    from normalized_items ni
    where char_length(ni.category_norm) > 0
    group by ni.category_norm
  ),
  resolved_catalog as (
    select
      coalesce(c.key, ibc.category_raw, c.key_norm) as key,
      coalesce(c.label, initcap(ibc.category_raw), initcap(c.key_norm)) as label,
      c.order_index as order_index,
      coalesce(ibc.items, '[]'::json) as items
    from catalog c
    left join items_by_category ibc
      on ibc.category_norm = c.key_norm
      or ibc.category_norm = lower(trim(coalesce(c.label, '')))
  ),
  unmatched as (
    select
      coalesce(ibc.category_raw, ibc.category_norm) as key,
      initcap(coalesce(ibc.category_raw, ibc.category_norm)) as label,
      2147483647 as order_index,
      ibc.items
    from items_by_category ibc
    where not exists (
      select 1
      from catalog c
      where c.key_norm = ibc.category_norm
        or lower(trim(coalesce(c.label, ''))) = ibc.category_norm
    )
  ),
  final_categories as (
    select rc.key, rc.label, rc.order_index, rc.items
    from resolved_catalog rc
    union all
    select u.key, u.label, u.order_index, u.items
    from unmatched u
  )
  select coalesce(
    json_agg(
      json_build_object(
        'key', fc.key,
        'label', fc.label,
        'items', fc.items
      )
      order by fc.order_index, fc.label
    ),
    '[]'::json
  )
  into v_categories
  from final_categories fc;

  return json_build_object(
    'slug', v_topic_slug,
    'title', v_topic_title,
    'categories', coalesce(v_categories, '[]'::json)
  );
end;
$$;

grant execute on function public.get_topics() to anon, authenticated;
grant execute on function public.get_topic(text) to anon, authenticated;

notify pgrst, 'reload schema';
