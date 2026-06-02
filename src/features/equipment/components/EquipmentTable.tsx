import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { DotStatus } from '@/components/ui/dot-status';
import { safeFormatDate } from '@/features/equipment/utils/equipmentHelpers';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';
import type { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';

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
  team_id?: string | null;
  working_hours?: number | null;
  [key: string]: unknown;
}

export interface EquipmentTableProps {
  equipment: EquipmentRow[];
  onShowQRCode: (id: string) => void;
  pmStatuses?: Map<string, EquipmentPMStatus>;
  sortConfig?: SortConfig;
  onSortChange?: (field: string, direction?: 'asc' | 'desc') => void;
  /**
   * Per-column visibility map keyed by `EquipmentTableColumnMeta.key`.
   * Omitted keys (and an undefined map) default to visible — preserves
   * backward compatibility for callers that don't yet pass the prop.
   */
  visibleColumns?: Record<string, boolean>;
}

/**
 * High-density table view for the equipment list (Issue #633).
 *
 * Consumes the upgraded shared `DataTable` with compact density, sticky header,
 * frozen first column, and monospace ID/serial/date columns. Status renders as
 * a compact `DotStatus` (sighted tooltip via `title`; label in `.sr-only`).
 * Name navigation, Team link, and QR actions keep a 44px minimum tap target.
 */
const EquipmentTable: React.FC<EquipmentTableProps> = ({
  equipment,
  onShowQRCode,
  sortConfig,
  onSortChange,
  visibleColumns,
}) => {
  const navigate = useNavigate();
  const { settings } = useUserSettings();

  const columns = useMemo<Column<EquipmentRow>[]>(() => {
    const isVisible = (key: string): boolean => visibleColumns?.[key] ?? true;
    const cols: Column<EquipmentRow>[] = [];

    if (isVisible('name')) {
      cols.push({
        key: 'name',
        title: 'Name',
        sortable: true,
        width: '240px',
        render: (_value, item) => (
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-start text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring rounded-sm font-medium"
            onClick={() => navigate(`/dashboard/equipment/${item.id}`)}
          >
            {item.name}
          </button>
        ),
      });
    }

    if (isVisible('status')) {
      cols.push({
        key: 'status',
        title: 'Status',
        sortable: true,
        width: '140px',
        render: (_value, item) => <DotStatus status={item.status} />,
      });
    }

    if (isVisible('manufacturer')) {
      cols.push({ key: 'manufacturer', title: 'Manufacturer', sortable: true, width: '160px' });
    }

    if (isVisible('model')) {
      cols.push({ key: 'model', title: 'Model', sortable: true, width: '160px' });
    }

    if (isVisible('serial_number')) {
      cols.push({ key: 'serial_number', title: 'Serial #', sortable: true, mono: true, width: '160px' });
    }

    if (isVisible('working_hours')) {
      cols.push({
        key: 'working_hours',
        title: 'Hours',
        sortable: true,
        mono: true,
        align: 'right',
        width: '120px',
        render: (_value, item) =>
          item.working_hours != null ? item.working_hours.toLocaleString() : '—',
      });
    }

    if (isVisible('location')) {
      cols.push({ key: 'location', title: 'Location', sortable: true, width: '180px' });
    }

    if (isVisible('team_name')) {
      cols.push({
        key: 'team_name',
        title: 'Team',
        sortable: true,
        width: '160px',
        render: (_value, item) => {
          if (item.team_id && item.team_name) {
            return (
              <Link
                to={`/dashboard/teams/${item.team_id}`}
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                onClick={(e) => e.stopPropagation()}
              >
                {item.team_name}
              </Link>
            );
          }
          return <span className="text-muted-foreground">—</span>;
        },
      });
    }

    if (isVisible('last_maintenance')) {
      cols.push({
        key: 'last_maintenance',
        title: 'Last Maintenance',
        sortable: true,
        mono: true,
        align: 'right',
        width: '160px',
        render: (_value, item) => {
          if (!item.last_maintenance) return '—';
          return safeFormatDate(item.last_maintenance, settings) ?? '—';
        },
      });
    }

    // Actions column is always rendered and is intentionally not part of the
    // visibility map.
    cols.push({
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
    });

    return cols;
  }, [navigate, onShowQRCode, visibleColumns, settings]);

  const sorting =
    sortConfig && onSortChange
      ? {
          sortBy: sortConfig.field,
          sortOrder: sortConfig.direction,
          onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => {
            onSortChange(sortBy, sortOrder);
          },
        }
      : undefined;

  return (
    <DataTable<EquipmentRow>
      data={equipment}
      columns={columns}
      density="compact"
      stickyHeader
      freezeFirstColumn
      maxBodyHeight="calc(100vh - 16rem)"
      emptyMessage="No equipment matches your filters."
      sorting={sorting}
    />
  );
};

export default EquipmentTable;
