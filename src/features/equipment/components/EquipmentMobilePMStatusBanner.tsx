import React from 'react';
import { AlertTriangle, Check, Clock, Timer } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import type { PMComplianceLevel } from '@/features/equipment/hooks/useEquipmentPMStatus';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';

type Equipment = Tables<'equipment'>;

export interface EquipmentMobilePMStatusBannerProps {
  equipment: Equipment;
  pmStatus: EquipmentPMStatus;
  pmCompliance: PMComplianceLevel;
}

export const EquipmentMobilePMStatusBanner: React.FC<EquipmentMobilePMStatusBannerProps> = ({
  equipment,
  pmStatus,
  pmCompliance,
}) => (
  <div
    className={`rounded-lg border-l-4 p-3 ${
      pmCompliance === 'overdue'
        ? 'border-l-destructive bg-destructive/5'
        : pmCompliance === 'due_soon'
          ? 'border-l-warning bg-warning/5'
          : 'border-l-success bg-success/5'
    }`}
  >
    <div className="flex items-center gap-2 mb-1">
      {pmCompliance === 'overdue' ? (
        <AlertTriangle className="h-4 w-4 text-destructive" />
      ) : pmCompliance === 'due_soon' ? (
        <Clock className="h-4 w-4 text-warning" />
      ) : (
        <Check className="h-4 w-4 text-success" />
      )}
      <span
        className={`text-sm font-semibold ${
          pmCompliance === 'overdue'
            ? 'text-destructive'
            : pmCompliance === 'due_soon'
              ? 'text-warning'
              : 'text-success'
        }`}
      >
        {pmCompliance === 'overdue' && pmStatus.hours_overdue != null
          ? `PM overdue by ${Math.round(pmStatus.hours_overdue)} hrs`
          : pmCompliance === 'overdue' && pmStatus.days_overdue != null
            ? `PM overdue by ${pmStatus.days_overdue} days`
            : pmCompliance === 'due_soon'
              ? 'PM due soon'
              : 'PM current'}
      </span>
    </div>
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Timer className="h-3 w-3" />
        Every {pmStatus.interval_value} {pmStatus.interval_type === 'hours' ? 'hrs' : 'days'}
      </span>
      {pmStatus.interval_type === 'hours' && equipment.working_hours != null && (
        <span>
          Next due at ~
          {Math.round(
            equipment.working_hours +
              (pmStatus.hours_overdue != null ? -pmStatus.hours_overdue : 0) +
              pmStatus.interval_value
          )}{' '}
          hrs
        </span>
      )}
    </div>
  </div>
);
