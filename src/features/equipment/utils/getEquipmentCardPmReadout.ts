import {
  getPMComplianceLevel,
  type EquipmentPMStatus,
} from '@/features/equipment/hooks/useEquipmentPMStatus';

export interface EquipmentCardPmReadout {
  label: string;
  detail: string;
  valueClassName: string;
}

export function getEquipmentCardPmReadout(
  pmStatus: EquipmentPMStatus | null | undefined
): EquipmentCardPmReadout {
  const level = getPMComplianceLevel(pmStatus);

  if (level === 'no_interval' || !pmStatus) {
    return {
      label: '—',
      detail: 'No PM interval configured',
      valueClassName: 'text-muted-foreground',
    };
  }

  if (level === 'overdue') {
    const overdueDetail =
      pmStatus.days_overdue != null
        ? `${pmStatus.days_overdue} days overdue`
        : pmStatus.hours_overdue != null
          ? `${Math.round(pmStatus.hours_overdue)} hrs overdue`
          : 'Overdue';
    return {
      label: 'Overdue',
      detail: `${pmStatus.template_name} · ${overdueDetail}`,
      valueClassName: 'text-destructive font-medium',
    };
  }

  if (level === 'due_soon') {
    const intervalHint =
      pmStatus.interval_type === 'days'
        ? `${pmStatus.interval_value}-day interval`
        : `${pmStatus.interval_value}-hr interval`;
    return {
      label: 'Due soon',
      detail: `${pmStatus.template_name} · ${intervalHint}`,
      valueClassName: 'text-warning font-medium',
    };
  }

  const intervalHint =
    pmStatus.interval_type === 'days'
      ? `${pmStatus.interval_value}-day interval`
      : `${pmStatus.interval_value}-hr interval`;

  return {
    label: 'Current',
    detail: `${pmStatus.template_name} · ${intervalHint}`,
    valueClassName: 'text-success font-medium',
  };
}
