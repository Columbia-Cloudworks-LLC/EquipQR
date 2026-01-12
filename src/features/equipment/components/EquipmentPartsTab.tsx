import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, MapPin, RefreshCw, SearchX } from 'lucide-react';
import { useCompatibleInventoryItems } from '@/features/inventory/hooks/useInventory';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePartsFiltering } from '@/features/equipment/hooks/usePartsFiltering';
import { DesktopPartsToolbar, MobilePartsToolbar } from './parts-tab';
import type { PartialInventoryItem } from '@/features/inventory/types/inventory';
import { cn } from '@/lib/utils';

interface EquipmentPartsTabProps {
  equipmentId: string;
  organizationId: string;
}

interface PartCardProps {
  part: PartialInventoryItem;
  onClick: () => void;
  isMobile: boolean;
}

const PartCard: React.FC<PartCardProps> = ({ part, onClick, isMobile }) => {
  const isLowStock = part.quantity_on_hand < part.low_stock_threshold;
  const isOutOfStock = part.quantity_on_hand <= 0;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-colors hover:bg-accent/50",
        isOutOfStock && "border-destructive/50"
      )}
      onClick={onClick}
    >
      <CardContent className={cn("flex gap-4", isMobile ? "p-3" : "p-4")}>
        {/* Image or placeholder */}
        <div className={cn(
          "flex-shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden relative",
          isMobile ? "h-12 w-12" : "h-16 w-16"
        )}>
          {part.image_url ? (
            <img 
              src={part.image_url} 
              alt={part.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package className={cn("text-muted-foreground", isMobile ? "h-6 w-6" : "h-8 w-8")} />
          )}
          {/* Alternates indicator on image */}
          {part.hasAlternates && (
            <div 
              className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center"
              title="Has alternates"
            >
              <RefreshCw className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Part details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "font-medium truncate",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  {part.name}
                </h4>
                {/* Alternates badge - shown on non-mobile for clarity */}
                {part.hasAlternates && !isMobile && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 shrink-0">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Alternates
                  </Badge>
                )}
              </div>
              {part.sku && (
                <p className="text-xs text-muted-foreground truncate">
                  SKU: {part.sku}
                </p>
              )}
            </div>
            
            {/* Stock badges */}
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              {isOutOfStock ? (
                <Badge variant="destructive" className="text-xs">
                  Out of Stock
                </Badge>
              ) : isLowStock ? (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Low Stock
                </Badge>
              ) : null}
              <span className={cn(
                "text-sm font-medium",
                isOutOfStock ? "text-destructive" : isLowStock ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {part.quantity_on_hand} in stock
              </span>
            </div>
          </div>

          {/* Location and mobile alternates indicator */}
          <div className="flex items-center gap-2 mt-1">
            {part.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{part.location}</span>
              </div>
            )}
            {/* Alternates indicator for mobile */}
            {part.hasAlternates && isMobile && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <RefreshCw className="h-3 w-3" />
                <span>Alternates</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EquipmentPartsTab: React.FC<EquipmentPartsTabProps> = ({
  equipmentId,
  organizationId,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch compatible parts using the existing hook
  const { data: compatibleParts = [], isLoading } = useCompatibleInventoryItems(
    organizationId,
    [equipmentId]
  );

  // Filtering and sorting
  const {
    filters,
    filteredParts,
    activeFilterCount,
    hasActiveFilters,
    setSearch,
    setStockFilter,
    setHasAlternatesOnly,
    setSort,
    clearFilters,
  } = usePartsFiltering({ parts: compatibleParts });

  const handlePartClick = (itemId: string) => {
    navigate(`/dashboard/inventory/${itemId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className={isMobile ? "p-3" : "p-4"}>
              <div className="flex gap-4">
                <div className={cn(
                  "bg-muted animate-pulse rounded-md",
                  isMobile ? "h-12 w-12" : "h-16 w-16"
                )} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // No compatible parts at all
  if (compatibleParts.length === 0) {
    return (
      <div className="space-y-6">
        <div className={isMobile ? 'text-center' : ''}>
          <h3 className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}>
            Compatible Parts
          </h3>
          <p className="text-sm text-muted-foreground">
            0 parts compatible with this equipment
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No compatible parts</h3>
            <p className="text-muted-foreground">
              No inventory items have been linked to this equipment yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Parts can be linked via compatibility rules based on manufacturer and model,
              or directly from the inventory item details page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={isMobile ? 'text-center' : ''}>
        <h3 className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}>
          Compatible Parts
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters 
            ? `Showing ${filteredParts.length} of ${compatibleParts.length} parts`
            : `${compatibleParts.length} ${compatibleParts.length === 1 ? 'part' : 'parts'} compatible with this equipment`
          }
        </p>
      </div>

      {/* Toolbar */}
      {isMobile ? (
        <MobilePartsToolbar
          filters={filters}
          activeFilterCount={activeFilterCount}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearch}
          onStockFilterChange={setStockFilter}
          onHasAlternatesChange={setHasAlternatesOnly}
          onSortChange={setSort}
          onClearFilters={clearFilters}
        />
      ) : (
        <DesktopPartsToolbar
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearch}
          onStockFilterChange={setStockFilter}
          onHasAlternatesChange={setHasAlternatesOnly}
          onSortChange={setSort}
          onClearFilters={clearFilters}
        />
      )}

      {/* Parts List */}
      <div className="space-y-3">
        {filteredParts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No parts match your filters</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filter criteria.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredParts.map((part) => (
            <PartCard
              key={part.id}
              part={part}
              onClick={() => handlePartClick(part.id)}
              isMobile={isMobile}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default EquipmentPartsTab;
