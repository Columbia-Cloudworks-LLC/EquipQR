import { supabase } from '@/integrations/supabase/client'
import type { WorkOrderListContract } from '@/features/work-orders/utils/workOrderListContract'

export function getWorkOrderSearchPattern(search: string | undefined): string | null {
  const term = search?.trim().replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim()
  return term ? `%${term}%` : null
}

export function buildWorkOrderListSearchOrClause(input: {
  pattern: string
  assigneeIds: readonly string[]
  equipmentIds: readonly string[]
}): string {
  const parts = [`title.ilike.${input.pattern}`]
  if (input.assigneeIds.length > 0) {
    parts.push(`assignee_id.in.(${input.assigneeIds.join(',')})`)
  }
  if (input.equipmentIds.length > 0) {
    parts.push(`equipment_id.in.(${input.equipmentIds.join(',')})`)
  }
  return parts.join(',')
}

function idsFrom(rows: Array<{ id: string }> | null): string[] {
  return (rows ?? []).map((row) => row.id).filter(Boolean)
}

export async function resolveWorkOrderListSearchOr(
  contract: Pick<WorkOrderListContract, 'organizationId' | 'search'>,
): Promise<string | null> {
  const pattern = getWorkOrderSearchPattern(contract.search)
  if (!pattern) {
    return null
  }

  const [assignees, namedEquipment, teams] = await Promise.all([
    supabase.from('profiles').select('id').ilike('name', pattern),
    supabase
      .from('equipment')
      .select('id')
      .eq('organization_id', contract.organizationId)
      .ilike('name', pattern),
    supabase
      .from('teams')
      .select('id')
      .eq('organization_id', contract.organizationId)
      .ilike('name', pattern),
  ])

  if (assignees.error) {
    throw assignees.error
  }
  if (namedEquipment.error) {
    throw namedEquipment.error
  }
  if (teams.error) {
    throw teams.error
  }

  const equipmentIds = new Set(idsFrom(namedEquipment.data))
  const teamIds = idsFrom(teams.data)
  if (teamIds.length > 0) {
    const teamEquipment = await supabase
      .from('equipment')
      .select('id')
      .eq('organization_id', contract.organizationId)
      .in('team_id', teamIds)
    if (teamEquipment.error) {
      throw teamEquipment.error
    }
    for (const id of idsFrom(teamEquipment.data)) {
      equipmentIds.add(id)
    }
  }

  return buildWorkOrderListSearchOrClause({
    pattern,
    assigneeIds: idsFrom(assignees.data),
    equipmentIds: [...equipmentIds],
  })
}
