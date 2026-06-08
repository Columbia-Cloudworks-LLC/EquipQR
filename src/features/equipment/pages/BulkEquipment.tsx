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
import { useEquipmentFiltering } from '@/features/equipment/hooks/useEquipmentFiltering';
import { useBulkEditEquipment } from '@/features/equipment/hooks/useBulkEditEquipment';
import EquipmentLoadingState from '@/features/equipment/components/EquipmentLoadingState';
import { BulkEquipmentGrid } from '../components/BulkEquipmentGrid';

const BulkEquipment: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment, canCreateEquipmentForAnyTeam } = usePermissions();
  const isOnline = useBrowserOnline();
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
          actions={<BulkEditBackButton to="/dashboard/equipment" />}
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
          actions={<BulkEditBackButton to="/dashboard/equipment" />}
        />
      </Page>
    );
  }

  if (!isOnline) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Bulk Edit Equipment"
          actions={<BulkEditBackButton to="/dashboard/equipment" />}
        />
        <BulkEditOfflinePanel
          message="Bulk editing requires an internet connection. Use the single-item form to queue offline edits."
          backHref="/dashboard/equipment"
          backLabel="Back to Equipment"
        />
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
          actions={<BulkEditBackButton to="/dashboard/equipment" />}
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
