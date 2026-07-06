import { useMemo } from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MultiSelectActionMenu,
  type MultiSelectActionOption,
} from '@/components/common/MultiSelectActionMenu';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import { useBulkAssignTemplate } from '@/features/equipment/hooks/useEquipmentTemplateManagement';
import { filterEquipmentSummariesBySelectedTeam } from '@/features/equipment/utils/filterEquipmentSummariesBySelectedTeam';

interface PMTemplateEquipmentAssignmentMenuProps {
  templateId: string;
  templateName: string;
  /** Renders the trigger full-width on template cards; inline on detail views. */
  fullWidthTrigger?: boolean;
}

/**
 * Bulk "set as default PM template" picker (issue #1144). Mirrors the daily
 * check-in assignment dropdown: org equipment scoped by the TopBar team
 * selection, with search and select all/none/inverse. Replaces the old
 * TemplateAssignmentDialog. PM templates page is owner/admin-only, so the
 * summaries query always runs with org-admin scope.
 */
export function PMTemplateEquipmentAssignmentMenu({
  templateId,
  templateName,
  fullWidthTrigger = false,
}: PMTemplateEquipmentAssignmentMenuProps) {
  const { currentOrganization } = useOrganization();
  const { selectedTeamId } = useSelectedTeam();
  const { data: equipmentSummaries = [], isLoading } = useEquipmentSummaries(
    currentOrganization?.id,
    { isOrgAdmin: true },
  );
  const bulkAssignTemplate = useBulkAssignTemplate();

  const options = useMemo<MultiSelectActionOption[]>(() => {
    const scoped = filterEquipmentSummariesBySelectedTeam(equipmentSummaries, selectedTeamId);
    return scoped.map((item) => ({
      id: item.id,
      label: item.name,
      sublabel: `${item.serial_number ? `Unit ${item.serial_number}` : 'No serial number'} · ${item.team_name ?? 'Unassigned'}`,
      searchText: [item.manufacturer ?? '', item.model ?? '', item.location ?? ''].join(' '),
      lockedNote: item.default_pm_template_id === templateId ? 'Current default' : undefined,
    }));
  }, [equipmentSummaries, selectedTeamId, templateId]);

  return (
    <MultiSelectActionMenu
      idPrefix={`pm-assign-${templateId}`}
      trigger={
        <Button
          type="button"
          size="sm"
          className={fullWidthTrigger ? 'w-full' : undefined}
          disabled={bulkAssignTemplate.isPending}
          title="Set this template as the default PM on one or more equipment records"
        >
          <Wrench className="mr-2 h-4 w-4" />
          Apply to Equipment
        </Button>
      }
      title={`Apply ${templateName}`}
      description="Sets this template as the default PM on the selected equipment in the current team scope."
      options={options}
      isLoading={isLoading}
      isPending={bulkAssignTemplate.isPending}
      searchPlaceholder="Search equipment..."
      loadingText="Loading equipment…"
      emptyText="No equipment in the current team scope."
      noMatchText="No equipment matches your search."
      actionLabel={() => (bulkAssignTemplate.isPending ? 'Applying...' : 'Apply template')}
      onAction={async (equipmentIds) => {
        await bulkAssignTemplate.mutateAsync({ equipmentIds, templateId });
      }}
      align={fullWidthTrigger ? 'start' : 'end'}
    />
  );
}
