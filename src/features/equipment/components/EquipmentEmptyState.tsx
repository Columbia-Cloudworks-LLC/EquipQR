import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Forklift, SearchX } from 'lucide-react';

export interface EquipmentEmptyStateProps {
  searchQuery: string;
  statusFilter: string;
  organizationName: string;
  canCreate: boolean;
  onAddEquipment: () => void;
  onClearFilters?: () => void;
}

/**
 * Shared empty-state card used by both the card-based EquipmentGrid and the
 * dense EquipmentTable view modes so the empty UX stays in sync between them.
 */
const EquipmentEmptyState: React.FC<EquipmentEmptyStateProps> = ({
  searchQuery,
  statusFilter,
  organizationName,
  canCreate,
  onAddEquipment,
  onClearFilters,
}) => {
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
};

export default EquipmentEmptyState;
