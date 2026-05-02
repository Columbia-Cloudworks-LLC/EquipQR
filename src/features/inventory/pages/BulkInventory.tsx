import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, WifiOff } from 'lucide-react';

import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useInventoryItems } from '@/features/inventory/hooks/useInventory';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import { useBulkEditInventory } from '@/features/inventory/hooks/useBulkEditInventory';
import { BulkCommitToolbar } from '@/features/equipment/components/BulkCommitToolbar';
import { InventoryBulkGrid } from '@/features/inventory/components/InventoryBulkGrid';

// ── Online status helper (mirrors BulkEquipment) ─────────────────────────────

const useOnlineStatus = (): boolean => {
  const [online, setOnline] = useState<boolean>(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine)
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const BackButton: React.FC = () => (
  <Button asChild variant="outline">
    <Link to="/dashboard/inventory">
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
      Done
    </Link>
  </Button>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const BulkInventory: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const { canManageInventory } = usePermissions();
  const isOnline = useOnlineStatus();
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
  } = useBulkEditInventory(inventoryItems);

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
          actions={<BackButton />}
        />
      </Page>
    );
  }

  if (!canManageInventory(isPartsManager)) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Bulk Edit Inventory"
          description="Bulk inventory editing is restricted to administrators and parts managers. Contact an organization administrator if you need access."
          actions={<BackButton />}
        />
      </Page>
    );
  }

  if (!isOnline) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader title="Bulk Edit Inventory" actions={<BackButton />} />
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border bg-card py-16 text-center">
          <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="max-w-md text-sm text-muted-foreground">
            Bulk editing requires an internet connection. Use the single-item form to
            update individual records offline.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard/inventory">Back to Inventory</Link>
          </Button>
        </div>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader title="Bulk Edit Inventory" actions={<BackButton />} />
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
          actions={<BackButton />}
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
