import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAdjustInventoryQuantity, useInventoryItems, useInventoryListMetadata } from '@/features/inventory/hooks/useInventory';
import { useInventoryGroupMembershipCounts } from '@/features/inventory/hooks/useAlternateGroups';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import type { InventoryItem, InventoryFilters } from '@/features/inventory/types/inventory';
import { useIsMobile } from '@/hooks/use-mobile';
import { InventoryListPageActions } from '@/features/inventory/components/InventoryListPageActions';
import { InventoryListFilterToolbar } from '@/features/inventory/components/InventoryListFilterToolbar';
import { InventoryListDesktopTable } from '@/features/inventory/components/InventoryListDesktopTable';
import { InventoryListMobileList } from '@/features/inventory/components/InventoryListMobileList';
import { InventoryListDialogs } from '@/features/inventory/components/InventoryListDialogs';
import { cn } from '@/lib/utils';

const InventoryList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const { data: groupMembershipCounts = {} } = useInventoryGroupMembershipCounts(currentOrganization?.id);
  const initializedFromUrl = useRef(false);

  useEffect(() => {
    if (initializedFromUrl.current) return;
    if (searchParams.get('create') === 'true') {
      setShowForm(true);
      initializedFromUrl.current = true;
    }
  }, [searchParams]);

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

  const handleManageAlternateGroups = (itemId: string) => {
    navigate(`/dashboard/inventory/${itemId}?alternateAction=add`);
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
            <InventoryListPageActions
              canCreate={canCreate}
              canManage={canManage}
              onOpenManagersSheet={() => setShowManagersSheet(true)}
              onAddItem={handleAddItem}
              onNavigateBulk={() => navigate('/dashboard/inventory/bulk')}
            />
          }
        />

        <InventoryListFilterToolbar
          isMobile={isMobile}
          filters={filters}
          uniqueLocations={uniqueLocations}
          resultCount={items.length}
          lowStockOrgWide={lowStockOrgWide}
          activeFilterCount={activeFilterCount}
          canExport={canCreate}
          items={items}
          onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          onClearFilters={() =>
            setFilters((prev) => ({
              ...prev,
              search: '',
              lowStockOnly: false,
              location: undefined,
            }))
          }
          onClearSheetFilters={handleMobileResetSortAndFilters}
        />

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
          <InventoryListMobileList
            items={items}
            groupMembershipCounts={groupMembershipCounts}
            canCreate={canCreate}
            adjustPending={adjustMutation.isPending}
            onOpen={handleViewItem}
            onKeyDown={handleItemKeyDown}
            onQuickAdjust={handleQuickAdjust}
            onShowQR={handleShowQRCode}
            onEdit={handleEditItem}
            onManageGroups={handleManageAlternateGroups}
          />
        ) : (
          <InventoryListDesktopTable
            items={items}
            filters={filters}
            groupMembershipCounts={groupMembershipCounts}
            canCreate={canCreate}
            adjustPending={adjustMutation.isPending}
            onSortChange={handleSortChange}
            onViewItem={handleViewItem}
            onItemKeyDown={handleItemKeyDown}
            onQuickAdjust={handleQuickAdjust}
            onShowQR={handleShowQRCode}
            onEditItem={handleEditItem}
            onManageAlternateGroups={handleManageAlternateGroups}
          />
        )}

        <InventoryListDialogs
          showForm={showForm}
          showManagersSheet={showManagersSheet}
          showQRCode={showQRCode}
          selectedQRCodeItem={selectedQRCodeItem}
          editingItem={editingItem}
          isMobile={isMobile}
          canCreate={canCreate}
          onCloseForm={handleCloseForm}
          onCloseQRCode={() => {
            setShowQRCode(false);
            setSelectedQRCodeItem(null);
          }}
          onManagersSheetOpenChange={setShowManagersSheet}
          onAddItem={handleAddItem}
        />
      </div>
    </Page>
  );
};

export default InventoryList;
