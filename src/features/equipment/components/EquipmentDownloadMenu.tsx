import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { ExportFormatMenuItems } from '@/components/common/ExportFormatMenuItems';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { arrayToCsv, downloadCsv, downloadJson, filenameWithDate } from '@/utils/exportUtils';
import {
  EquipmentService,
  type EquipmentSummary,
} from '@/features/equipment/services/EquipmentService';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { isOrgAdminRole } from '@/features/teams/utils/teamAccessScope';

/**
 * Fields the export reads. The list page supplies `EquipmentSummary` rows, which
 * omit the warranty/installation/timestamp columns, so those are optional here;
 * the menu fetches them when the user exports (see `withExportDetails`).
 */
export type EquipmentExportRow = Pick<
  EquipmentSummary,
  | 'id'
  | 'name'
  | 'status'
  | 'serial_number'
  | 'manufacturer'
  | 'model'
  | 'location'
  | 'working_hours'
  | 'last_maintenance'
  | 'team_name'
> &
  Partial<
    Pick<EquipmentRecord, 'warranty_expiration' | 'installation_date' | 'created_at' | 'updated_at'>
  >;

interface EquipmentDownloadMenuProps {
  equipment: EquipmentExportRow[];
}

const CSV_HEADERS = [
  'Name',
  'Status',
  'Serial Number',
  'Manufacturer',
  'Model',
  'Location',
  'Working Hours',
  'Last Maintenance',
  'Team',
  'Warranty Expiration',
  'Installation Date',
];

function equipmentToCsvRows(equipment: EquipmentExportRow[]): string[][] {
  return equipment.map((eq) => [
    eq.name ?? '',
    eq.status ?? '',
    eq.serial_number ?? '',
    eq.manufacturer ?? '',
    eq.model ?? '',
    eq.location ?? '',
    eq.working_hours != null ? String(eq.working_hours) : '',
    eq.last_maintenance ?? '',
    eq.team_name ?? '',
    eq.warranty_expiration ?? '',
    eq.installation_date ?? '',
  ]);
}

const EquipmentDownloadMenu: React.FC<EquipmentDownloadMenuProps> = ({ equipment }) => {
  const { currentOrganization } = useOrganization();
  const { getUserTeamIds } = useTeamMembership();
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Adds the record-level columns that summary rows omit (#1728), using the same
   * organization and team-scoped RBAC filters as the list's summary query.
   * Returns null (after telling the user) when they can't be loaded.
   */
  const withExportDetails = async (): Promise<EquipmentExportRow[] | null> => {
    const organizationId = currentOrganization?.id;
    if (!organizationId) {
      toast.error('Export failed', { description: 'No organization is selected.' });
      return null;
    }
    const isOrgAdmin = isOrgAdminRole(currentOrganization.userRole);
    const result = await EquipmentService.getExportDetails(organizationId, {
      isOrgAdmin,
      userTeamIds: isOrgAdmin ? undefined : getUserTeamIds(),
    });
    if (!result.success || !result.data) {
      toast.error('Export failed', {
        description: 'Could not load equipment details. Please try again.',
      });
      return null;
    }
    const detailsById = new Map(result.data.map((row) => [row.id, row]));
    return equipment.map((eq) => {
      const details = detailsById.get(eq.id);
      return details
        ? {
            ...eq,
            warranty_expiration: details.warranty_expiration,
            installation_date: details.installation_date,
            created_at: details.created_at,
            updated_at: details.updated_at,
          }
        : eq;
    });
  };

  const runExport = async (write: (rows: EquipmentExportRow[]) => void) => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const rows = await withExportDetails();
      if (rows) write(rows);
    } finally {
      setIsExporting(false);
    }
  };

  const writeCsv = (exportRows: EquipmentExportRow[]) => {
    const rows = equipmentToCsvRows(exportRows);
    const csv = arrayToCsv(CSV_HEADERS, rows);
    downloadCsv(csv, filenameWithDate('equipment', 'csv'));
  };

  const writeJson = (exportRows: EquipmentExportRow[]) => {
    const data = exportRows.map((eq) => ({
      id: eq.id,
      name: eq.name,
      status: eq.status,
      serial_number: eq.serial_number,
      manufacturer: eq.manufacturer,
      model: eq.model,
      location: eq.location,
      working_hours: eq.working_hours,
      last_maintenance: eq.last_maintenance,
      team_name: eq.team_name,
      warranty_expiration: eq.warranty_expiration,
      installation_date: eq.installation_date,
      created_at: eq.created_at,
      updated_at: eq.updated_at,
    }));
    downloadJson(data, filenameWithDate('equipment', 'json'));
  };

  const handleExportCsv = () => void runExport(writeCsv);
  const handleExportJson = () => void runExport(writeJson);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Download equipment"
          disabled={isExporting}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Export format
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ExportFormatMenuItems
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EquipmentDownloadMenu;
