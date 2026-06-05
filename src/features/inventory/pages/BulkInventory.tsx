import React from 'react';
import {
  Navigate,
  BulkEditOfflinePanel,
  useBrowserOnline,
  BulkEditBackButton,
  Page,
  PageHeader,
  useOrganization,
  usePermissions,
  useIsMobile,
  BulkCommitToolbar,
} from '@/components/bulk-edit/bulkEditPageImports';
import { useInventoryItems } from '@/features/inventory/hooks/useInventory';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import { useBulkEditInventory } from '@/features/inventory/hooks/useBulkEditInventory';
import { InventoryBulkGrid } from '@/features/inventory/components/InventoryBulkGrid';

const BulkInventory: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const { canManageInventory } = usePermissions();
  const canBulkEdit = canManageInventory(isPartsManager);
  const isOnline = useBrowserOnline();
  const isMobile = useIsMobile();

  const { data: inventoryItems = [], isLoading } = useInventoryItems(
    currentOrganization?.id,
    {},
    { staleTime: 0 }
  );

  const {
    dirtyRows,
    selectedRowIds,
    dirtyCount,
    selectedCount,
    isPending,
    setCellValue,
    setCellValueOnRows,
    clearDirty,
    toggleSelected,
    selectAll,
    clearSelection,
    commit,
  } = useBulkEditInventory(inventoryItems, { canCommit: canBulkEdit });

  // Desktop-only surface — redirect mobile to the standard inventory list.
  // Placed after hook calls to keep React's hook ordering stable.
  if (isMobile) {
    return <Navigate to="/dashboard/inventory" replace />;
  }

  if (!currentOrganization) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Bulk Edit Inventory"
          description="Please select an organization to edit inventory."
          actions={<BulkEditBackButton to="/dashboard/inventory" />}
        />
      </Page>
    );
  }

  if (!canBulkEdit) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Bulk Edit Inventory"
          description="Bulk inventory editing is restricted to administrators and parts managers. Contact an organization administrator if you need access."
          actions={<BulkEditBackButton to="/dashboard/inventory" />}
        />
      </Page>
    );
  }

  if (!isOnline) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader title="Bulk Edit Inventory" actions={<BulkEditBackButton to="/dashboard/inventory" />} />
        <BulkEditOfflinePanel
          message="Bulk editing requires an internet connection. Use the single-item form to update individual records offline."
          backHref="/dashboard/inventory"
          backLabel="Back to Inventory"
        />
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader title="Bulk Edit Inventory" actions={<BulkEditBackButton to="/dashboard/inventory" />} />
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 rounded-md bg-muted" />
          ))}
        </div>
      </Page>
    );
  }

  return (
    <Page maxWidth="full" padding="responsive">
      <div className="space-y-4 pb-4">
        <PageHeader
          title="Bulk Edit Inventory"
          description={`Edit inventory for ${currentOrganization.name}. Single-click to select, double-click to edit.`}
          hideDescriptionOnMobile
          actions={<BulkEditBackButton to="/dashboard/inventory" />}
        />

        <InventoryBulkGrid
          rows={inventoryItems}
          dirtyRows={dirtyRows}
          selectedRowIds={selectedRowIds}
          onSetCellValue={setCellValue}
          onSetCellValueOnRows={setCellValueOnRows}
          onToggleSelected={toggleSelected}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
        />

        <BulkCommitToolbar
          dirtyCount={dirtyCount}
          selectedCount={selectedCount}
          isPending={isPending}
          onDiscard={clearDirty}
          onCommit={() => {
            void commit();
          }}
        />
      </div>
    </Page>
  );
};

export default BulkInventory;
