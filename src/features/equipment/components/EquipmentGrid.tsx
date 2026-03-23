import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Forklift, SearchX } from 'lucide-react';
import { cn } from "@/lib/utils";
import EquipmentCard from './EquipmentCard';
import type { EquipmentViewMode } from './EquipmentCard';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';

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
}) => {
  if (equipment.length === 0) {
    const hasFilters = !!(searchQuery || statusFilter !== 'all');

    return (
      <Card>
        <CardContent className="flex flex-col items-center text-center py-14 px-6">
          {hasFilters ? (
            <SearchX className="h-12 w-12 text-muted-foreground/60 mb-4" />
          ) : (
            <Forklift className="h-12 w-12 text-muted-foreground/60 mb-4" />
          )}
          <h3 className="text-base font-semibold mb-1">
            {hasFilters ? 'No equipment matches your filters' : 'No equipment yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {hasFilters
              ? 'Try adjusting or clearing your search and filter criteria to see more results.'
              : `Get started by adding your first piece of equipment to ${organizationName}.`}
          </p>
          {hasFilters && onClearFilters && (
            <Button onClick={onClearFilters} className="min-h-11">
              Clear Filters
            </Button>
          )}
          {!hasFilters && canCreate && (
            <Button onClick={onAddEquipment} className="min-h-11">
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          )}
        </CardContent>
      </Card>
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