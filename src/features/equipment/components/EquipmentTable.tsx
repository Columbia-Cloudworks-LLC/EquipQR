import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { DotStatus } from '@/components/ui/dot-status';
import { safeFormatDate } from '@/features/equipment/utils/equipmentHelpers';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';

interface EquipmentRow {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  last_maintenance?: string;
  image_url?: string;
  team_name?: string;
  [key: string]: unknown;
}

export interface EquipmentTableProps {
  equipment: EquipmentRow[];
  onShowQRCode: (id: string) => void;
  pmStatuses?: Map<string, EquipmentPMStatus>;
}

/**
 * High-density table view for the equipment list (Issue #633).
 *
 * Consumes the upgraded shared `DataTable` with compact density, sticky header,
 * frozen first column, and monospace ID/serial/date columns. Status renders as
 * a compact `DotStatus`. Action buttons keep the 44x44 invisible tap-target so
 * the row text can stay tight (~36px) without losing accessibility.
 */
const EquipmentTable: React.FC<EquipmentTableProps> = ({ equipment, onShowQRCode }) => {
  const navigate = useNavigate();

  const columns = useMemo<Column<EquipmentRow>[]>(() => [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      width: '240px',
      render: (_value, item) => (
        <button
          type="button"
          className="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring rounded-sm font-medium"
          onClick={() => navigate(`/dashboard/equipment/${item.id}`)}
        >
          {item.name}
        </button>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: '140px',
      render: (_value, item) => <DotStatus status={item.status} showLabel />,
    },
    {
      key: 'manufacturer',
      title: 'Manufacturer',
    },
    {
      key: 'model',
      title: 'Model',
    },
    {
      key: 'serial_number',
      title: 'Serial #',
      mono: true,
    },
    {
      key: 'location',
      title: 'Location',
    },
    {
      key: 'team_name',
      title: 'Team',
      render: (_value, item) => item.team_name || '—',
    },
    {
      key: 'last_maintenance',
      title: 'Last Maintenance',
      mono: true,
      align: 'right',
      width: '160px',
      render: (_value, item) => {
        if (!item.last_maintenance) return '—';
        return safeFormatDate(item.last_maintenance) ?? '—';
      },
    },
    {
      key: '__actions',
      title: '',
      width: '64px',
      align: 'right',
      render: (_value, item) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onShowQRCode(item.id)}
          aria-label={`Show QR code for ${item.name}`}
          className="min-h-11 min-w-11"
        >
          <QrCode className="h-4 w-4" aria-hidden="true" />
        </Button>
      ),
    },
  ], [navigate, onShowQRCode]);

  return (
    <DataTable<EquipmentRow>
      data={equipment}
      columns={columns}
      density="compact"
      stickyHeader
      freezeFirstColumn
      maxBodyHeight="calc(100vh - 16rem)"
      emptyMessage="No equipment matches your filters."
    />
  );
};

export default EquipmentTable;
