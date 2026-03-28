import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Users, MoreVertical, Eye, QrCode, Pencil, ChevronUp, ChevronDown, ArrowUpDown, Minus } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAdjustInventoryQuantity, useInventoryItems, useInventoryListMetadata } from '@/features/inventory/hooks/useInventory';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { InventoryItemForm } from '@/features/inventory/components/InventoryItemForm';
import { PartsManagersSheet } from '@/features/inventory/components/PartsManagersSheet';
import type { InventoryItem, InventoryFilters } from '@/features/inventory/types/inventory';
import { useIsMobile } from '@/hooks/use-mobile';
import InventoryQRCodeDisplay from '@/features/inventory/components/InventoryQRCodeDisplay';
import InventoryToolbar from '@/features/inventory/components/InventoryToolbar';
import MobileInventoryToolbar from '@/features/inventory/components/MobileInventoryToolbar';
import MobileInventoryCard from '@/features/inventory/components/MobileInventoryCard';
import { getStockHealthPresentation } from '@/features/inventory/utils/stockHealth';
import { cn } from '@/lib/utils';

function isLowStockItem(item: InventoryItem): boolean {
  return item.isLowStock ?? item.quantity_on_hand <= item.low_stock_threshold;
}

/** Quantity display: out of stock or negative stock vs low-but-available use distinct semantic colors. */
function getQuantityClassName(item: InventoryItem): string {
  if (item.quantity_on_hand <= 0) {
    return 'font-semibold text-destructive';
  }
  if (isLowStockItem(item)) {
    return 'font-semibold text-warning';
  }
  return 'font-medium text-foreground';
}

const InventoryList = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const { canManageInventory, canManagePartsManagers } = usePermissions();
  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);
  const [showManagersSheet, setShowManagersSheet] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRCodeItem, setSelectedQRCodeItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    lowStockOnly: false,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const adjustMutation = useAdjustInventoryQuantity();

  const { data: items = [], isLoading } = useInventoryItems(
    currentOrganization?.id,
    filters
  );

  const { data: inventoryListMetadata } = useInventoryListMetadata(
    currentOrganization?.id
  );

  const uniqueLocations = inventoryListMetadata?.uniqueLocations ?? [];

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.search?.trim()) n += 1;
    if (filters.lowStockOnly) n += 1;
    if (filters.location) n += 1;
    return n;
  }, [filters.search, filters.lowStockOnly, filters.location]);

  const lowStockOrgWide = inventoryListMetadata?.lowStockCount ?? 0;

  const handleAddItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleViewItem = (itemId: string) => {
    navigate(`/dashboard/inventory/${itemId}`);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLElement>, itemId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleViewItem(itemId);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleShowQRCode = (item: InventoryItem) => {
    setSelectedQRCodeItem(item);
    setShowQRCode(true);
  };

  const handleSortChange = (sortBy: NonNullable<InventoryFilters['sortBy']>) => {
    setFilters((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (sortBy: NonNullable<InventoryFilters['sortBy']>) => {
    if (filters.sortBy !== sortBy) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return filters.sortOrder === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5" />
      : <ChevronDown className="h-3.5 w-3.5" />;
  };

  const handleQuickAdjust = async (itemId: string, delta: 1 | -1) => {
    if (!currentOrganization) return;
    await adjustMutation.mutateAsync({
      organizationId: currentOrganization.id,
      adjustment: {
        itemId,
        delta,
        reason: delta > 0 ? 'Quick add from inventory list' : 'Quick take from inventory list',
      },
    });
  };

  const handleMobileFilterChange = (patch: Partial<InventoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleMobileResetSortAndFilters = () => {
    setFilters((prev) => ({
      ...prev,
      search: '',
      lowStockOnly: false,
      location: undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    }));
  };

  const canCreate = canManageInventory(isPartsManager);
  const canManage = canManagePartsManagers();

  const hasActiveFilters =
    !!filters.search?.trim() || filters.lowStockOnly || !!filters.location;

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader
          title="Inventory"
          description="Please select an organization to view inventory."
        />
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader title="Inventory" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="px-4 py-3.5">
                <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
                <div className="flex items-end justify-between gap-3">
                  <div className="h-3 w-1/2 rounded bg-muted" />
                  <div className="h-8 w-20 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div
        className={cn(
          'space-y-4 md:space-y-6',
          isMobile && canCreate && 'pb-28'
        )}
      >
        <PageHeader
          title="Inventory"
          description={`Manage inventory items for ${currentOrganization.name}`}
          actions={
            <div className="flex items-center gap-2">
              {canManage && (
                <Button
                  variant="outline"
                  onClick={() => setShowManagersSheet(true)}
                  className="hidden sm:inline-flex"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Parts Managers
                </Button>
              )}

              {canCreate && (
                <Button onClick={handleAddItem} className="hidden sm:inline-flex">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}

              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManagersSheet(true)}
                  className="h-10 gap-2 px-3 sm:hidden touch-manipulation"
                  data-testid="inventory-mobile-parts-managers"
                >
                  <Users className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="text-sm font-medium">Parts Managers</span>
                </Button>
              )}
            </div>
          }
        />

        {isMobile ? (
          <MobileInventoryToolbar
            filters={filters}
            onFilterChange={handleMobileFilterChange}
            onClearSheetFilters={handleMobileResetSortAndFilters}
            uniqueLocations={uniqueLocations}
            resultCount={items.length}
            lowStockOrgWide={lowStockOrgWide}
            activeFilterCount={activeFilterCount}
          />
        ) : (
          <InventoryToolbar
            filters={filters}
            uniqueLocations={uniqueLocations}
            resultCount={items.length}
            onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onClearFilters={() =>
              setFilters((prev) => ({
                ...prev,
                search: '',
                lowStockOnly: false,
                location: undefined,
              }))
            }
            canExport={canCreate}
            items={items}
          />
        )}

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No inventory items</h3>
              <p className="mb-4 text-muted-foreground">
                {hasActiveFilters
                  ? 'No items match your filters.'
                  : 'Get started by adding your first inventory item.'}
              </p>
              {canCreate && (
                <Button onClick={handleAddItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </CardContent>
          </Card>
        ) : isMobile ? (
          <div className="space-y-3">
            {items.map((item) => (
              <MobileInventoryCard
                key={item.id}
                item={item}
                canCreate={canCreate}
                adjustPending={adjustMutation.isPending}
                onOpen={handleViewItem}
                onKeyDown={handleItemKeyDown}
                onQuickAdjust={handleQuickAdjust}
                onShowQR={handleShowQRCode}
                onEdit={handleEditItem}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('name')}>
                        Name
                        {getSortIcon('name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('sku')}>
                        SKU
                        {getSortIcon('sku')}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('external_id')}>
                        External ID
                        {getSortIcon('external_id')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('quantity_on_hand')}>
                        Quantity
                        {getSortIcon('quantity_on_hand')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('location')}>
                        Location
                        {getSortIcon('location')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('status')}>
                        Status
                        {getSortIcon('status')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[56px]">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const stockHealth = getStockHealthPresentation(item);
                    const stockStatusLabel = stockHealth.label === 'Healthy' ? 'In Stock' : stockHealth.label;

                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewItem(item.id)}
                        onKeyDown={(e) => handleItemKeyDown(e, item.id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open inventory item ${item.name}`}
                      >
                        <TableCell className="font-medium">
                          <div className="min-w-0">
                            <p className="truncate">{item.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              SKU: {item.sku || '-'}
                              {item.location ? `  •  ${item.location}` : ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.sku || '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell font-mono text-sm text-muted-foreground">
                          {item.external_id || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('tabular-nums', getQuantityClassName(item))}>
                              {item.quantity_on_hand}
                            </span>
                            {stockHealth.label !== 'Healthy' && (
                              <Badge
                                variant="outline"
                                className={cn('rounded-full px-2 py-0.5 text-xs font-medium', stockHealth.className)}
                              >
                                {stockHealth.label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.location || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('rounded-full px-2 py-0.5 text-xs font-medium', stockHealth.className)}
                          >
                            {stockStatusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Actions for ${item.name}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleViewItem(item.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {canCreate && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    void handleQuickAdjust(item.id, 1);
                                  }}
                                  disabled={adjustMutation.isPending}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add 1
                                </DropdownMenuItem>
                              )}
                              {canCreate && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    void handleQuickAdjust(item.id, -1);
                                  }}
                                  disabled={adjustMutation.isPending}
                                >
                                  <Minus className="mr-2 h-4 w-4" />
                                  Take 1
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleShowQRCode(item)}>
                                <QrCode className="mr-2 h-4 w-4" />
                                QR Code
                              </DropdownMenuItem>
                              {canCreate && (
                                <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <InventoryItemForm
            open={showForm}
            onClose={handleCloseForm}
            editingItem={editingItem}
          />
        )}

        {selectedQRCodeItem && (
          <InventoryQRCodeDisplay
            open={showQRCode}
            onClose={() => {
              setShowQRCode(false);
              setSelectedQRCodeItem(null);
            }}
            itemId={selectedQRCodeItem.id}
            itemName={selectedQRCodeItem.name}
          />
        )}

        <PartsManagersSheet
          open={showManagersSheet}
          onOpenChange={setShowManagersSheet}
        />

        {isMobile && canCreate && (
          <Button
            type="button"
            size="icon"
            onClick={handleAddItem}
            aria-label="Add inventory item"
            className={cn(
              'fixed bottom-[78px] right-4 z-fixed h-14 w-14 rounded-full shadow-elevation-3',
              'touch-manipulation transition-transform duration-100 active:scale-[0.97]',
              'motion-reduce:active:scale-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            <Plus className="h-6 w-6" aria-hidden />
          </Button>
        )}
      </div>
    </Page>
  );
};

export default InventoryList;
