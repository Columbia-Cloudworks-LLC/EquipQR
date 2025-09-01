
-- 1) Create supporting indexes for team_members
create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_team_members_user_team on public.team_members(user_id, team_id);

-- 2) Add foreign keys so PostgREST can resolve relations and counts
-- NOTE: These will fail if orphaned rows exist; if that happens we will clean up those rows first.
alter table public.team_members
  add constraint team_members_team_id_fkey
  foreign key (team_id) references public.teams(id) on delete cascade;

alter table public.team_members
  add constraint team_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- 3) Centralized access RPC
-- Returns a JSON payload containing:
-- - organizations (id, role, status)
-- - accessibleTeamIds (all teams in admin/owner orgs + only user’s teams in member orgs)
-- - profiles (id, name, email) of users present in those accessible teams
create or replace function public.get_user_access_snapshot(user_uuid uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  with orgs as (
    select om.organization_id, om.role, om.status
    from public.organization_members om
    where om.user_id = user_uuid
      and om.status = 'active'
  ),
  admin_orgs as (
    select organization_id from orgs where role in ('owner','admin')
  ),
  member_orgs as (
    select organization_id from orgs where role = 'member'
  ),
  -- teams user belongs to (used for 'member' org scope)
  user_teams as (
    select tm.team_id, t.organization_id, tm.role
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = user_uuid
  ),
  -- all teams in admin/owner orgs
  admin_scope_teams as (
    select t.id as team_id, t.organization_id
    from public.teams t
    join admin_orgs ao on ao.organization_id = t.organization_id
  ),
  -- combine accessible teams:
  accessible_teams as (
    select team_id, organization_id from admin_scope_teams
    union
    select team_id, organization_id from user_teams
  ),
  -- distinct users present in those accessible teams
  accessible_users as (
    select distinct tm.user_id
    from public.team_members tm
    join accessible_teams at on at.team_id = tm.team_id
  )
  select jsonb_build_object(
    'organizations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.organization_id,
        'role', o.role,
        'status', o.status
      )) from orgs o
    ), '[]'::jsonb),
    'accessibleTeamIds', coalesce((
      select jsonb_agg(distinct at.team_id) from accessible_teams at
    ), '[]'::jsonb),
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'email', p.email
      ))
      from public.profiles p
      join accessible_users au on au.user_id = p.id
    ), '[]'::jsonb)
  ) into result;

  return coalesce(result, '{}'::jsonb);
end;
$$;
