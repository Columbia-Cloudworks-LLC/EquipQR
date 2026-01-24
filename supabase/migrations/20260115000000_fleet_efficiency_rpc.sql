create or replace function public.get_fleet_efficiency(
  p_org_id uuid,
  p_team_ids uuid[] default null
)
returns table (
  team_id uuid,
  team_name text,
  equipment_count int,
  active_work_orders_count int
)
language sql
security invoker
set search_path = public
as $$
  with teams_filtered as (
    select id, name
    from public.teams
    where organization_id = p_org_id
      and (p_team_ids is null or id = any (p_team_ids))
  ),
  equipment_counts as (
    select team_id, count(*)::int as equipment_count
    from public.equipment
    where organization_id = p_org_id
      and team_id is not null
      and (p_team_ids is null or team_id = any (p_team_ids))
    group by team_id
  ),
  active_work_order_counts as (
    select e.team_id, count(*)::int as active_work_orders_count
    from public.work_orders wo
    join public.equipment e on e.id = wo.equipment_id
    where wo.organization_id = p_org_id
      and e.organization_id = p_org_id
      and e.team_id is not null
      and (p_team_ids is null or e.team_id = any (p_team_ids))
      and wo.status not in ('completed', 'cancelled')
    group by e.team_id
  )
  select
    tf.id as team_id,
    tf.name as team_name,
    ec.equipment_count,
    coalesce(awoc.active_work_orders_count, 0) as active_work_orders_count
  from teams_filtered tf
  join equipment_counts ec on ec.team_id = tf.id
  left join active_work_order_counts awoc on awoc.team_id = tf.id
  where ec.equipment_count > 0
  order by tf.name;
$$;
