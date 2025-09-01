-- Create PM checklist templates table
create table public.pm_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_protected boolean not null default false,
  template_data jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_checklist_templates_unique_name_per_org
    unique (organization_id, name)
);

-- Add template_id to preventative_maintenance for traceability
alter table public.preventative_maintenance 
add column template_id uuid references public.pm_checklist_templates(id) on delete set null;

-- Enable RLS
alter table public.pm_checklist_templates enable row level security;

-- RLS Policies
-- SELECT: org members can read org templates; everyone can read global (organization_id is null)
create policy "read org/global templates"
on public.pm_checklist_templates
for select
using (
  organization_id is null
  or is_org_member(auth.uid(), organization_id)
);

-- INSERT/UPDATE/DELETE: only org admins; global protected rows denied except by service role
create policy "manage org templates"
on public.pm_checklist_templates
for all
using (
  organization_id is not null
  and is_org_admin(auth.uid(), organization_id)
  and (not is_protected or auth.role() = 'service_role')
)
with check (
  organization_id is not null
  and is_org_admin(auth.uid(), organization_id)
  and (not is_protected or auth.role() = 'service_role')
);

-- Block deleting protected rows
create policy "deny delete protected"
on public.pm_checklist_templates
for delete
using (
  organization_id is not null
  and is_org_admin(auth.uid(), organization_id)
  and is_protected = false
);

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_pm_checklist_templates_touch
before update on public.pm_checklist_templates
for each row execute function public.touch_updated_at();