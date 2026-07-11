import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MultiSelectActionMenu,
  type MultiSelectActionOption,
} from '@/components/common/MultiSelectActionMenu';
import type { OperatorChecklistTemplate } from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import type { EquipmentOperatorCheckinAssignment } from '@/features/operator-check-ins/services/operatorCheckinSettingsService';

interface EquipmentOperatorCheckinTemplateAssignmentMenuProps {
  equipmentId: string;
  equipmentName: string;
  templates: OperatorChecklistTemplate[];
  assignments: EquipmentOperatorCheckinAssignment[];
  assignedCount: number;
  isTemplatesLoading: boolean;
  isAssignmentsLoading: boolean;
  isAssigning: boolean;
  onAssignTemplateIds: (templateIds: string[]) => void | Promise<void>;
}

export function EquipmentOperatorCheckinTemplateAssignmentMenu({
  equipmentId,
  equipmentName,
  templates,
  assignments,
  assignedCount,
  isTemplatesLoading,
  isAssignmentsLoading,
  isAssigning,
  onAssignTemplateIds,
}: EquipmentOperatorCheckinTemplateAssignmentMenuProps) {
  const assignedTemplateIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.template_id)),
    [assignments],
  );

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.is_active),
    [templates],
  );

  const options = useMemo<MultiSelectActionOption[]>(
    () =>
      activeTemplates.map((template) => {
        const fieldCount = template.template_data.dataFields?.length ?? 0;
        const itemCount = template.template_data.checklistItems?.length ?? 0;
        return {
          id: template.id,
          label: template.name,
          sublabel: `${fieldCount} data field${fieldCount === 1 ? '' : 's'} · ${itemCount} checklist item${itemCount === 1 ? '' : 's'}`,
          searchText: template.description ?? '',
          lockedNote: assignedTemplateIds.has(template.id) ? 'Assigned' : undefined,
        };
      }),
    [activeTemplates, assignedTemplateIds],
  );

  const unassignedCount = activeTemplates.length - assignedTemplateIds.size;

  return (
    <MultiSelectActionMenu
      idPrefix={`equipment-checkin-assign-${equipmentId}`}
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={isAssigning}>
          <Plus className="mr-2 h-4 w-4" />
          Assign checklists
          {assignedCount > 0 ? (
            <Badge variant="secondary" className="ml-2 font-normal">
              {assignedCount} assigned
            </Badge>
          ) : null}
        </Button>
      }
      title={`Assign checklists to ${equipmentName}`}
      description={
        unassignedCount > 0
          ? `Choose one or more templates. ${unassignedCount} unassigned template${unassignedCount === 1 ? '' : 's'} available.`
          : 'All active templates are already assigned to this equipment.'
      }
      options={options}
      isLoading={isTemplatesLoading || isAssignmentsLoading}
      isPending={isAssigning}
      searchPlaceholder="Search templates..."
      loadingText="Loading templates…"
      emptyText="No active checklist templates yet."
      noMatchText="No templates match your search."
      actionLabel={(count) =>
        isAssigning
          ? 'Assigning...'
          : `Assign checklist${count === 1 ? '' : 's'}`
      }
      onAction={onAssignTemplateIds}
      align="start"
    />
  );
}
