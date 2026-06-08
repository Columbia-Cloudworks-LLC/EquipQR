import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';

const SOURCE_LABELS: Record<EquipmentPMStatus['source'], string> = {
  equipment_policy: 'equipment override',
  team_policy: 'team schedule',
  template_policy: 'template schedule',
  template_default: 'template default',
};

export function getPMScheduleSourceLabel(source: EquipmentPMStatus['source'] | undefined): string {
  if (!source) return '';
  return SOURCE_LABELS[source] ?? source;
}
