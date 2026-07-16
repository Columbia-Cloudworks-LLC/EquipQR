import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useAdjustInventoryQuantity,
  useInventoryItems,
  useInventoryListMetadata,
  useRecentlyAdjustedInventoryItemIds,
} from '@/features/inventory/hooks/useInventory';
import { useInventoryGroupMembershipCounts } from '@/features/inventory/hooks/useAlternateGroups';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import { useInventoryTablePreferences } from '@/features/inventory/hooks/useInventoryTablePreferences';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import type {
  InventoryItem,
  InventoryFilters,
  InventoryListMetadata,
  InventoryQuickFilterKey,
  InventorySavedView,
  InventorySortField,
} from '@/features/inventory/types/inventory';
import { useIsMobile } from '@/hooks/use-mobile';
import { InventoryListPageActions } from '@/features/inventory/components/InventoryListPageActions';
import { InventoryPartsAccessFooterButton } from '@/features/inventory/components/InventoryPartsAccessFooterButton';
import { InventoryListFilterToolbar } from '@/features/inventory/components/InventoryListFilterToolbar';
import { InventoryListDesktopTable } from '@/features/inventory/components/InventoryListDesktopTable';
import { InventoryListMobileList } from '@/features/inventory/components/InventoryListMobileList';
import { InventoryListDialogs } from '@/features/inventory/components/InventoryListDialogs';
import { InventoryColumnManager } from '@/features/inventory/components/InventoryColumnManager';
import { InventorySavedViewsMenu } from '@/features/inventory/components/InventorySavedViewsMenu';
import { InventoryHealthSummary } from '@/features/inventory/components/InventoryHealthSummary';
import { InventoryQuickFilterChips } from '@/features/inventory/components/InventoryQuickFilterChips';
import type { InventoryTableColumnKey } from '@/features/inventory/components/inventoryTableColumns';
import {
  applyQuickFilters,
  countQuickFilterMatches,
} from '@/features/inventory/utils/inventoryQuickFilters';
import {
  buildInventoryTableRowViewModel,
  isClientSideSortField,
  sortInventoryViewModels,
} from '@/features/inventory/utils/inventoryListViewModel';
import { useAppToast } from '@/hooks/useAppToast';
import { cn } from '@/lib/utils';
import ListPaginationFooter from '@/components/common/ListPaginationFooter';
import {
  clampListPage,
  paginateListItems,
} from '@/utils/listPagination';
import {
  DEFAULT_INVENTORY_DESKTOP_PAGE_SIZE,
  DEFAULT_INVENTORY_MOBILE_PAGE_SIZE,
  INVENTORY_DESKTOP_PAGE_SIZE_OPTIONS,
  INVENTORY_MOBILE_PAGE_SIZE_OPTIONS,
} from '@/features/inventory/utils/inventoryListPagination';

const EMPTY_METADATA: InventoryListMetadata = {
  uniqueLocations: [],
  totalCount: 0,
  negativeStockCount: 0,
  outOfStockCount: 0,
  lowStockCount: 0,
  healthyCount: 0,
  missingLocationCount: 0,
  missingUnitCostCount: 0,
  missingSkuCount: 0,
  estimatedInventoryValue: 0,
};

const InventoryList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrganization } = useOrganization();
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const { canManageInventory, canManagePartsManagers } = usePermissions();
  const isMobile = useIsMobile();
  const { toast } = useAppToast();

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
  const [quickFilters, setQuickFilters] = useState<InventoryQuickFilterKey[]>([]);
  const [desktopPage, setDesktopPage] = useState(1);
  const [mobilePage, setMobilePage] = useState(1);
  const [desktopPageSize, setDesktopPageSize] = useState(DEFAULT_INVENTORY_DESKTOP_PAGE_SIZE);
  const [mobilePageSize, setMobilePageSize] = useState(DEFAULT_INVENTORY_MOBILE_PAGE_SIZE);

  const tablePrefs = useInventoryTablePreferences(currentOrganization?.id);
  const adjustMutation = useAdjustInventoryQuantity();
  const { data: groupMembershipCounts = {} } = useInventoryGroupMembershipCounts(currentOrganization?.id);
  const { data: recentAdjustments = {} } = useRecentlyAdjustedInventoryItemIds(currentOrganization?.id);
  const initializedFromUrl = useRef(false);

  useEffect(() => {
    if (initializedFromUrl.current) return;
    if (searchParams.get('create') === 'true') {
      setShowForm(true);
      initializedFromUrl.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    setDesktopPage(1);
    setMobilePage(1);
  }, [filters, quickFilters]);

  const { data: items = [], isPending: isInventoryPending } = useInventoryItems(
    currentOrganization?.id,
    filters,
  );

  const { data: inventoryListMetadata } = useInventoryListMetadata(
    currentOrganization?.id,
  );

  const metadata = inventoryListMetadata ?? EMPTY_METADATA;
  const uniqueLocations = metadata.uniqueLocations;
  const recentlyAdjustedIds = useMemo(
    () => new Set(Object.keys(recentAdjustments)),
    [recentAdjustments],
  );

  const viewModels = useMemo(() => {
    const rows = items.map((item) =>
      buildInventoryTableRowViewModel(item, groupMembershipCounts, recentAdjustments),
    );
    const filtered = applyQuickFilters(rows, quickFilters, recentlyAdjustedIds);
    const sortBy = filters.sortBy ?? 'name';
    const sortOrder = filters.sortOrder ?? 'asc';
    if (isClientSideSortField(sortBy)) {
      return sortInventoryViewModels(filtered, sortBy, sortOrder);
    }
    return filtered;
  }, [
    items,
    groupMembershipCounts,
    recentAdjustments,
    quickFilters,
    recentlyAdjustedIds,
    filters.sortBy,
    filters.sortOrder,
  ]);

  const safeDesktopPage = clampListPage(desktopPage, viewModels.length, desktopPageSize);
  const safeMobilePage = clampListPage(mobilePage, viewModels.length, mobilePageSize);

  const paginatedDesktopRows = useMemo(
    () => paginateListItems(viewModels, safeDesktopPage, desktopPageSize),
    [viewModels, safeDesktopPage, desktopPageSize],
  );

  const paginatedMobileItems = useMemo(
    () => paginateListItems(viewModels, safeMobilePage, mobilePageSize).map((row) => row.item),
    [viewModels, safeMobilePage, mobilePageSize],
  );

  const quickFilterCounts = useMemo(() => {
    const counts: Partial<Record<InventoryQuickFilterKey, number>> = {};
    const keys: InventoryQuickFilterKey[] = [
      'low-stock',
      'out-of-stock',
      'negative-stock',
      'reorder-needed',
      'has-alternates',
      'missing-data',
      'recently-adjusted',
    ];
    for (const key of keys) {
      counts[key] = countQuickFilterMatches(
        items,
        groupMembershipCounts,
        key,
        recentlyAdjustedIds,
      );
    }
    return counts;
  }, [items, groupMembershipCounts, recentlyAdjustedIds]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.search?.trim()) n += 1;
    if (filters.lowStockOnly) n += 1;
    if (filters.location) n += 1;
    return n;
  }, [filters.search, filters.lowStockOnly, filters.location]);

  const lowStockOrgWide = metadata.lowStockCount;

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

  const handleSortChange = (sortBy: InventorySortField) => {
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

  const handleToggleQuickFilter = (filter: InventoryQuickFilterKey) => {
    setQuickFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter],
    );
  };

  const handleMoveColumn = (key: InventoryTableColumnKey, direction: 'up' | 'down') => {
    const order = [...tablePrefs.columnOrder];
    const index = order.indexOf(key);
    if (index < 0) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= order.length) return;
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    tablePrefs.setColumnOrder(order);
  };

  const handleAddColumn = (key: InventoryTableColumnKey) => {
    tablePrefs.setColumnVisibility({
      ...tablePrefs.columnVisibility,
      [key]: true,
    });
  };

  const handleRemoveColumn = (key: InventoryTableColumnKey) => {
    tablePrefs.toggleColumn(key);
  };

  const handleApplyView = (view: InventorySavedView) => {
    tablePrefs.applyView(view);
    setFilters(view.filters);
    setQuickFilters(view.quickFilters);
  };

  const handleSaveCurrentView = (name: string) => {
    if (!currentOrganization) return;
    tablePrefs.saveView({
      name,
      filters,
      quickFilters,
      columnVisibility: tablePrefs.columnVisibility,
      columnOrder: tablePrefs.columnOrder,
      columnSizing: tablePrefs.columnSizing,
      density: tablePrefs.density,
    });
    toast({
      title: 'View saved',
      description: `"${name}" is now available in Saved views.`,
    });
  };

  const canCreate = canManageInventory(isPartsManager);
  const canManage = canManagePartsManagers();

  const hasActiveFilters =
    !!filters.search?.trim() || filters.lowStockOnly || !!filters.location || quickFilters.length > 0;

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

  if (isInventoryPending && items.length === 0) {
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

  const desktopToolbarControls = (
    <div className="flex items-center gap-2">
      <InventorySavedViewsMenu
        savedViews={tablePrefs.savedViews}
        activeViewId={tablePrefs.activeViewId}
        onApplyView={handleApplyView}
        onSaveCurrentView={handleSaveCurrentView}
        onDeleteView={tablePrefs.deleteView}
      />
      <InventoryColumnManager
        columnVisibility={tablePrefs.columnVisibility}
        columnOrder={tablePrefs.columnOrder}
        hasOverrides={tablePrefs.hasTableOverrides}
        onMoveColumn={handleMoveColumn}
        onAddColumn={handleAddColumn}
        onRemoveColumn={handleRemoveColumn}
        onResetColumns={tablePrefs.resetColumnVisibility}
        onResetWidths={tablePrefs.resetColumnWidths}
        onResetAll={tablePrefs.resetTablePreferences}
      />
    </div>
  );

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div
        className={cn(
          'space-y-4 md:space-y-6',
          isMobile && canCreate && 'pb-28',
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
          lowStockOrgWide={lowStockOrgWide}
          activeFilterCount={activeFilterCount}
          canExport={canCreate}
          items={items}
          toolbarControls={!isMobile ? desktopToolbarControls : undefined}
          density={!isMobile ? tablePrefs.density : undefined}
          onDensityChange={!isMobile ? tablePrefs.setDensity : undefined}
          healthSummary={!isMobile ? <InventoryHealthSummary metadata={metadata} /> : undefined}
          quickFilterChips={
            !isMobile ? (
              <InventoryQuickFilterChips
                activeQuickFilters={quickFilters}
                counts={quickFilterCounts}
                onToggle={handleToggleQuickFilter}
                onClear={() => setQuickFilters([])}
              />
            ) : undefined
          }
          onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          onClearFilters={() => {
            setFilters((prev) => ({
              ...prev,
              search: '',
              lowStockOnly: false,
              location: undefined,
            }));
            setQuickFilters([]);
          }}
        />

        {viewModels.length === 0 ? (
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
          <div className="space-y-4">
            <InventoryListMobileList
              items={paginatedMobileItems}
              groupMembershipCounts={groupMembershipCounts}
              canCreate={canCreate}
              adjustPending={adjustMutation.isPending}
              onViewDetails={handleViewItem}
              onKeyDown={handleItemKeyDown}
              onQuickAdjust={handleQuickAdjust}
              onShowQR={handleShowQRCode}
              onEdit={handleEditItem}
              onManageAlternateGroups={handleManageAlternateGroups}
            />
            <ListPaginationFooter
              testId="inventory-list-pagination-footer"
              totalItems={viewModels.length}
              page={safeMobilePage}
              pageSize={mobilePageSize}
              pageSizeOptions={INVENTORY_MOBILE_PAGE_SIZE_OPTIONS}
              itemLabel="item"
              onPageChange={setMobilePage}
              onPageSizeChange={setMobilePageSize}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <InventoryListDesktopTable
              rows={paginatedDesktopRows}
              filters={filters}
            columnVisibility={tablePrefs.columnVisibility}
            columnOrder={tablePrefs.columnOrder}
            columnSizing={tablePrefs.columnSizing}
            density={tablePrefs.density}
            canCreate={canCreate}
            adjustPending={adjustMutation.isPending}
            onColumnVisibilityChange={(visibility) =>
              tablePrefs.setColumnVisibility(visibility as Record<string, boolean>)
            }
            onColumnOrderChange={tablePrefs.setColumnOrder}
            onColumnSizingChange={tablePrefs.setColumnSizing}
            onSortChange={handleSortChange}
            onViewItem={handleViewItem}
            onQuickAdjust={handleQuickAdjust}
            onShowQR={handleShowQRCode}
            onEditItem={handleEditItem}
            onManageAlternateGroups={handleManageAlternateGroups}
          />
            <ListPaginationFooter
              testId="inventory-list-pagination-footer"
              totalItems={viewModels.length}
              page={safeDesktopPage}
              pageSize={desktopPageSize}
              pageSizeOptions={INVENTORY_DESKTOP_PAGE_SIZE_OPTIONS}
              itemLabel="item"
              onPageChange={setDesktopPage}
              onPageSizeChange={setDesktopPageSize}
            />
          </div>
        )}

        {isMobile && canManage && (
          <InventoryPartsAccessFooterButton
            className="sm:hidden"
            onOpenPartsAccess={() => setShowManagersSheet(true)}
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
