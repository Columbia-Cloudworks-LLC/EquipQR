import React, { memo, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';
import OptimizedEquipmentCard from './OptimizedEquipmentCard';
import OptimizedVirtualizedList from './OptimizedVirtualizedList';
import { useDebouncedSearch } from '@/hooks/useDebounced';
import { Equipment } from '@/services/supabaseDataService';

interface OptimizedEquipmentGridProps {
  equipment: Equipment[];
  onQRClick?: (id: string) => void;
  onEditClick?: (id: string) => void;
  onViewClick?: (id: string) => void;
  isLoading?: boolean;
}

// PHASE 2: Optimized grid with virtualization and search
const OptimizedEquipmentGrid = memo(({
  equipment,
  onQRClick,
  onEditClick,
  onViewClick,
  isLoading = false
}: OptimizedEquipmentGridProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Optimized search with debouncing
  const { filteredItems: searchFiltered } = useDebouncedSearch(
    equipment,
    searchTerm,
    ['name', 'manufacturer', 'model', 'serial_number', 'location']
  );

  // Memoized filtering by status
  const filteredEquipment = useMemo(() => {
    if (statusFilter === 'all') return searchFiltered;
    return searchFiltered.filter(item => item.status === statusFilter);
  }, [searchFiltered, statusFilter]);

  // Memoized grid layout calculation
  const gridConfig = useMemo(() => {
    const itemsPerRow = Math.floor((window.innerWidth - 64) / 350); // Approximate card width
    const rows = Math.ceil(filteredEquipment.length / itemsPerRow);
    return { itemsPerRow, rows, itemHeight: 280 };
  }, [filteredEquipment.length]);

  // Optimized render function for virtualized list
  const renderEquipmentRow = useMemo(() => 
    (items: Equipment[], index: number) => {
      const startIndex = index * gridConfig.itemsPerRow;
      const endIndex = Math.min(startIndex + gridConfig.itemsPerRow, items.length);
      const rowItems = items.slice(startIndex, endIndex);

      return (
        <div className="flex gap-4 px-4 py-2">
          {rowItems.map(item => (
            <div key={item.id} className="flex-1 min-w-0">
              <OptimizedEquipmentCard
                equipment={item}
                onQRClick={onQRClick}
                onEditClick={onEditClick}
                onViewClick={onViewClick}
              />
            </div>
          ))}
        </div>
      );
    }, [gridConfig.itemsPerRow, onQRClick, onEditClick, onViewClick]
  );

  const renderRow = (rowItems: Equipment[], index: number) => 
    renderEquipmentRow(filteredEquipment, index);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Optimized search and filter controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'maintenance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('maintenance')}
          >
            Maintenance
          </Button>
          <Button
            variant={statusFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredEquipment.length} of {equipment.length} equipment items
      </div>

      {/* Virtualized grid for large datasets */}
      {filteredEquipment.length > 50 ? (
        <OptimizedVirtualizedList
          items={Array.from({ length: gridConfig.rows }).map((_, i) => i)}
          itemHeight={gridConfig.itemHeight}
          height={600}
          width={1200}
          renderItem={(rowIndex: number) => renderRow(filteredEquipment, rowIndex)}
          className="border rounded-lg"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map(item => (
            <OptimizedEquipmentCard
              key={item.id}
              equipment={item}
              onQRClick={onQRClick}
              onEditClick={onEditClick}
              onViewClick={onViewClick}
            />
          ))}
        </div>
      )}

      {filteredEquipment.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No equipment found matching your criteria.</p>
        </div>
      )}
    </div>
  );
});

OptimizedEquipmentGrid.displayName = 'OptimizedEquipmentGrid';

export default OptimizedEquipmentGrid;