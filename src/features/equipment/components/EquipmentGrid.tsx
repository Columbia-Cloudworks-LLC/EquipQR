import React from 'react';
import { cn } from "@/lib/utils";
import EquipmentCard from './EquipmentCard';
import EquipmentEmptyState from './EquipmentEmptyState';
import EquipmentTable from './EquipmentTable';
import type { EquipmentViewMode } from './EquipmentCard';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';
import type { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';

interface Equipment {
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
}

interface EquipmentGridProps {
  equipment: Equipment[];
  searchQuery: string;
  statusFilter: string;
  organizationName: string;
  canCreate: boolean;
  onShowQRCode: (id: string) => void;
  onAddEquipment: () => void;
  onClearFilters?: () => void;
  viewMode?: EquipmentViewMode;
  pmStatuses?: Map<string, EquipmentPMStatus>;
  sortConfig?: SortConfig;
  onSortChange?: (field: string, direction?: 'asc' | 'desc') => void;
  /** Forwarded to `EquipmentTable` when `viewMode === 'table'`. */
  visibleColumns?: Record<string, boolean>;
}

const EquipmentGrid: React.FC<EquipmentGridProps> = ({
  equipment,
  searchQuery,
  statusFilter,
  organizationName,
  canCreate,
  onShowQRCode,
  onAddEquipment,
  onClearFilters,
  viewMode = 'grid',
  pmStatuses,
  sortConfig,
  onSortChange,
  visibleColumns,
}) => {
  if (equipment.length === 0) {
    return (
      <EquipmentEmptyState
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        organizationName={organizationName}
        canCreate={canCreate}
        onAddEquipment={onAddEquipment}
        onClearFilters={onClearFilters}
      />
    );
  }

  if (viewMode === 'table') {
    return (
      <EquipmentTable
        equipment={equipment}
        onShowQRCode={onShowQRCode}
        pmStatuses={pmStatuses}
        sortConfig={sortConfig}
        onSortChange={onSortChange}
        visibleColumns={visibleColumns}
      />
    );
  }

  return (
    <div className={cn(
      viewMode === 'list'
        ? 'flex flex-col gap-2 md:gap-0 md:divide-y md:rounded-lg md:border'
        : 'grid gap-2 md:gap-6 md:grid-cols-2 lg:grid-cols-3'
    )}>
      {equipment.map((item) => (
        <div key={item.id} className={viewMode === 'grid' ? 'cv-auto-lg' : undefined}>
          <EquipmentCard
            equipment={item}
            onShowQRCode={onShowQRCode}
            viewMode={viewMode}
            pmStatus={pmStatuses?.get(item.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default EquipmentGrid;
