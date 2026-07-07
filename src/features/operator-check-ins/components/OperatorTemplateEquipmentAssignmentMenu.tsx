import { useMemo } from 'react';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MultiSelectActionMenu,
  type MultiSelectActionOption,
} from '@/components/common/MultiSelectActionMenu';
import type { EquipmentSummary } from '@/features/equipment/services/EquipmentService';
import type { EquipmentOperatorCheckinAssignment } from '@/features/operator-check-ins/services/operatorCheckinSettingsService';

interface OperatorTemplateEquipmentAssignmentMenuProps {
  templateId: string;
  templateName: string;
  equipment: EquipmentSummary[];
  assignments: EquipmentOperatorCheckinAssignment[];
  isEquipmentLoading: boolean;
  isAssignmentsLoading: boolean;
  isAssigning: boolean;
  onAssignEquipmentIds: (equipmentIds: string[]) => void | Promise<void>;
}

export function OperatorTemplateEquipmentAssignmentMenu({
  templateId,
  templateName,
  equipment,
  assignments,
  isEquipmentLoading,
  isAssignmentsLoading,
  isAssigning,
  onAssignEquipmentIds,
}: OperatorTemplateEquipmentAssignmentMenuProps) {
  const assignedEquipmentIds = useMemo(
    () =>
      new Set(
        assignments
          .filter((assignment) => assignment.template_id === templateId)
          .map((assignment) => assignment.equipment_id),
      ),
    [assignments, templateId],
  );

  const options = useMemo<MultiSelectActionOption[]>(
    () =>
      equipment.map((item) => ({
        id: item.id,
        label: item.name,
        sublabel: `${item.serial_number ? `Unit ${item.serial_number}` : 'No serial number'} · ${item.team_name ?? 'Unassigned'}`,
        searchText: item.location ?? '',
        lockedNote: assignedEquipmentIds.has(item.id) ? 'Assigned' : undefined,
      })),
    [equipment, assignedEquipmentIds],
  );

  return (
    <MultiSelectActionMenu
      idPrefix={`assign-${templateId}`}
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={isAssigning}>
          <Truck className="mr-2 h-4 w-4" />
          Assign to equipment
        </Button>
      }
      title={`Assign ${templateName}`}
      description="Choose one or more equipment records in the current team scope."
      options={options}
      isLoading={isEquipmentLoading || isAssignmentsLoading}
      isPending={isAssigning}
      searchPlaceholder="Search equipment..."
      loadingText="Loading equipment…"
      emptyText="No equipment in the current team scope."
      noMatchText="No equipment matches your search."
      actionLabel={() => (isAssigning ? 'Assigning...' : 'Assign checklist')}
      onAction={onAssignEquipmentIds}
    />
  );
}
