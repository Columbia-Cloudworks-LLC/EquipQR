import React from 'react';
import { Upload, FileSpreadsheet, FileJson, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { arrayToCsv, downloadCsv, downloadJson, filenameWithDate } from '@/utils/exportUtils';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

interface EquipmentActionsMenuProps {
  canImport: boolean;
  canExport: boolean;
  onImportCsv: () => void;
  equipment: EquipmentRecord[];
}

function equipmentToCsvRows(equipment: EquipmentRecord[]): string[][] {
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

const EquipmentActionsMenu: React.FC<EquipmentActionsMenuProps> = ({
  canImport,
  canExport,
  onImportCsv,
  equipment,
}) => {
  if (!canImport && !canExport) return null;

  const handleExportCsv = () => {
    const rows = equipmentToCsvRows(equipment);
    const csv = arrayToCsv(CSV_HEADERS, rows);
    downloadCsv(csv, filenameWithDate('equipment', 'csv'));
  };

  const handleExportJson = () => {
    const data = equipment.map((eq) => ({
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-normal"
          aria-label="Equipment actions"
        >
          Actions
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {canImport && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Import
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onImportCsv}
              className="gap-2 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm">Import CSV</span>
                <span className="text-[10px] text-muted-foreground">Add equipment from file</span>
              </div>
            </DropdownMenuItem>
          </>
        )}

        {canImport && canExport && <DropdownMenuSeparator />}

        {canExport && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Export
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={handleExportCsv}
              className="gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-success" />
              <div className="flex flex-col">
                <span className="text-sm">Export as CSV</span>
                <span className="text-[10px] text-muted-foreground">Comma-separated values</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportJson}
              className="gap-2 cursor-pointer"
            >
              <FileJson className="h-4 w-4 text-info" />
              <div className="flex flex-col">
                <span className="text-sm">Export as JSON</span>
                <span className="text-[10px] text-muted-foreground">Structured data format</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EquipmentActionsMenu;
