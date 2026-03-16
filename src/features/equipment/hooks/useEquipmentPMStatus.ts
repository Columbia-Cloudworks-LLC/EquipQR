import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { PM_INTERVALS_ENABLED } from '@/lib/flags';

export interface EquipmentPMStatus {
  equipment_id: string;
  last_pm_completed_at: string;
  interval_value: number;
  interval_type: 'days' | 'hours';
  is_overdue: boolean;
  days_overdue: number | null;
  hours_overdue: number | null;
  template_name: string;
  source: 'work_order_pm' | 'equipment_default';
}

async function fetchEquipmentPMStatus(equipmentId: string): Promise<EquipmentPMStatus | null> {
  const { data, error } = await supabase
    .rpc('get_equipment_pm_status', { p_equipment_id: equipmentId });

  if (error) throw error;
  return (data?.[0] as EquipmentPMStatus | undefined) ?? null;
}

async function fetchOrgEquipmentPMStatuses(organizationId: string): Promise<EquipmentPMStatus[]> {
  const { data, error } = await supabase
    .rpc('get_org_equipment_pm_statuses', { p_organization_id: organizationId });

  if (error) throw error;
  return (data ?? []) as EquipmentPMStatus[];
}

export function useEquipmentPMStatus(equipmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pmStatus.byEquipment(equipmentId ?? ''),
    queryFn: () => fetchEquipmentPMStatus(equipmentId!),
    enabled: !!equipmentId && PM_INTERVALS_ENABLED,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrgEquipmentPMStatuses(organizationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pmStatus.byOrg(organizationId ?? ''),
    queryFn: () => fetchOrgEquipmentPMStatuses(organizationId!),
    enabled: !!organizationId && PM_INTERVALS_ENABLED,
    staleTime: 5 * 60 * 1000,
  });
}

export type PMComplianceLevel = 'current' | 'due_soon' | 'overdue' | 'no_interval';

export function getPMComplianceLevel(status: EquipmentPMStatus | null | undefined): PMComplianceLevel {
  if (!status) return 'no_interval';
  if (status.is_overdue) return 'overdue';

  if (status.interval_type === 'days') {
    const daysSinceLastPM = Math.floor(
      (Date.now() - new Date(status.last_pm_completed_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastPM >= status.interval_value * 0.8) return 'due_soon';
  }

  if (status.interval_type === 'hours' && status.hours_overdue !== null) {
    const hoursUsed = status.interval_value + status.hours_overdue;
    if (hoursUsed >= status.interval_value * 0.8) return 'due_soon';
  }

  return 'current';
}
