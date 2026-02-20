-- Diagnostics for Topics/Categories/Items
-- Run each query in Supabase SQL editor.

-- 1) Topics count
select count(*) as topics_total from public.topics;

-- 2) Categories catalog count
select count(*) as categories_total from public.topic_categories;

-- 3) Items count + null topic_id
select
  count(*) as items_total,
  count(*) filter (where topic_id is null) as items_with_null_topic_id
from public.topic_items;

-- 4) Items per topic (if 0, that topic has no linked items)
select
  t.id,
  t.slug,
  t.title,
  count(ti.*) as items_count
from public.topics t
left join public.topic_items ti
  on ti.topic_id = t.id
group by t.id, t.slug, t.title
order by t.slug;

-- 5) Orphan items (topic_id without matching topic)
select
  ti.topic_id,
  count(*) as orphan_items
from public.topic_items ti
left join public.topics t
  on t.id = ti.topic_id
where ti.topic_id is not null
  and t.id is null
group by ti.topic_id
order by orphan_items desc;

-- 6) Distinct category values used in topic_items
select
  lower(trim(category)) as item_category_norm,
  count(*) as rows_count
from public.topic_items
where char_length(trim(coalesce(category, ''))) > 0
group by lower(trim(category))
order by rows_count desc, item_category_norm;

-- 7) Category values in topic_items that do not map to topic_categories.key or .label
with catalog as (
  select
    lower(trim(coalesce(key, ''))) as key_norm,
    lower(trim(coalesce(label, ''))) as label_norm
  from public.topic_categories
)
select
  lower(trim(ti.category)) as item_category_norm,
  count(*) as rows_count
from public.topic_items ti
left join catalog c
  on c.key_norm = lower(trim(ti.category))
  or c.label_norm = lower(trim(ti.category))
where char_length(trim(coalesce(ti.category, ''))) > 0
  and c.key_norm is null
group by lower(trim(ti.category))
order by rows_count desc, item_category_norm;

-- 8) What your API function returns for each topic
select
  t.slug,
  coalesce(
    jsonb_array_length(
      coalesce((public.get_topic(t.slug)::jsonb -> 'categories'), '[]'::jsonb)
    ),
    0
  ) as categories_count
from public.topics t
order by t.slug;

-- 9) Inspect one concrete topic (replace slug)
select jsonb_pretty(public.get_topic('adopzioa')::jsonb);

-- 10) Optional normalization: map topic_items.category by topic_categories.label -> key
-- (Run only if query #7 shows many label-based values)
-- update public.topic_items ti
-- set category = tc.key
-- from public.topic_categories tc
-- where lower(trim(ti.category)) = lower(trim(tc.label))
--   and ti.category is distinct from tc.key;

