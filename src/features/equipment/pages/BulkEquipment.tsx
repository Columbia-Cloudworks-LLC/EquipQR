import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, WifiOff } from 'lucide-react';

import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEquipmentFiltering } from '@/features/equipment/hooks/useEquipmentFiltering';
import { useBulkEditEquipment } from '@/features/equipment/hooks/useBulkEditEquipment';
import EquipmentLoadingState from '@/features/equipment/components/EquipmentLoadingState';

import { BulkCommitToolbar } from '../components/BulkCommitToolbar';
import { BulkEquipmentGrid } from '../components/BulkEquipmentGrid';

const useOnlineStatus = (): boolean => {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return online;
};

const BackToEquipmentButton: React.FC = () => (
  <Button asChild variant="outline">
    <Link to="/dashboard/equipment">
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
      Done
    </Link>
  </Button>
);

const BulkEquipment: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment, canCreateEquipmentForAnyTeam } = usePermissions();
  const isOnline = useOnlineStatus();
  const isMobile = useIsMobile();

  const {
    filteredAndSortedEquipment,
    isLoading,
  } = useEquipmentFiltering(currentOrganization?.id);

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
  } = useBulkEditEquipment(filteredAndSortedEquipment);

  // Bulk edit is a desktop-only surface (#627 AC#1). Mobile users that hit
  // /dashboard/equipment/bulk directly (deep link, browser back, mistaken
  // dropdown menu nav, etc.) are redirected to the equipment list — bulk is
  // an edit-only surface, so we do NOT pass `?create=true` here (that would
  // auto-open the creation modal via the initializedFromUrl effect in
  // `Equipment.tsx`, which is the wrong intent for someone who landed on the
  // bulk-edit URL). Placed below the hook calls so React sees a stable hook
  // order on every render.
  if (isMobile) {
    return <Navigate to="/dashboard/equipment" replace />;
  }

  if (!currentOrganization) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Bulk Edit Equipment"
          description="Please select an organization to edit equipment."
          actions={<BackToEquipmentButton />}
        />
      </Page>
    );
  }

  // Gate by the same matrix as the "Add Equipment" affordance on
  // `/dashboard/equipment` (issue #650): owners/admins org-wide, plus team
  // managers/technicians who can create equipment for at least one of their
  // teams. Per-row edit writes are still RLS-gated through the same
  // `equipment.update` path used by the single-item form, so opening the
  // grid does not bypass row-level permissions.
  if (!canCreateEquipment() && !canCreateEquipmentForAnyTeam()) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Bulk Edit Equipment"
          description="Bulk equipment editing is restricted to roles that can create equipment. Contact an organization administrator or a team manager if you need access."
          actions={<BackToEquipmentButton />}
        />
      </Page>
    );
  }

  if (!isOnline) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Bulk Edit Equipment"
          actions={<BackToEquipmentButton />}
        />
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border bg-card py-16 text-center">
          <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="max-w-md text-sm text-muted-foreground">
            Bulk editing requires an internet connection. Use the single-item form to queue
            offline edits.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard/equipment">Back to Equipment</Link>
          </Button>
        </div>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="full" padding="responsive">
        <EquipmentLoadingState />
      </Page>
    );
  }

  return (
    <Page maxWidth="full" padding="responsive">
      <div className="space-y-4 pb-4">
        <PageHeader
          title="Bulk Edit Equipment"
          description={`Edit equipment for ${currentOrganization.name}. Single-click to select, double-click to edit.`}
          hideDescriptionOnMobile
          actions={<BackToEquipmentButton />}
        />

        <BulkEquipmentGrid
          rows={filteredAndSortedEquipment}
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

export default BulkEquipment;
