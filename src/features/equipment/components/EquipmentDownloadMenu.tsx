import React from 'react';
import { Download } from 'lucide-react';
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
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

interface EquipmentDownloadMenuProps {
  equipment: EquipmentRecord[];
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

const EquipmentDownloadMenu: React.FC<EquipmentDownloadMenuProps> = ({ equipment }) => {
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
          size="icon"
          className="h-8 w-8"
          aria-label="Download equipment"
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
