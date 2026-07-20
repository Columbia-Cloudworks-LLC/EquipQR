import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
import type { EquipmentViewMode } from '@/features/equipment/components/EquipmentCard';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useEquipmentFiltering } from '@/features/equipment/hooks/useEquipmentFiltering';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';

import EquipmentForm from '@/features/equipment/components/EquipmentForm';
import QRCodeDisplay from '@/features/equipment/components/QRCodeDisplay';
import { EquipmentFilters } from '@/features/equipment/components/EquipmentFilters';
import EquipmentGrid from '@/features/equipment/components/EquipmentGrid';
import EquipmentLoadingState from '@/features/equipment/components/EquipmentLoadingState';
// `ImportCsvWizard` statically imports `papaparse` (~45 KB gzipped). Most
// users on this page never open the importer, so lazy-load it to keep the
// list page slim on Slow 4G.
const ImportCsvWizard = lazy(() => import('@/features/equipment/components/ImportCsvWizard'));
import EquipmentColumnPicker from '@/features/equipment/components/EquipmentColumnPicker';
import EquipmentPaginationFooter from '@/features/equipment/components/EquipmentPaginationFooter';
import { EQUIPMENT_TABLE_COLUMN_META } from '@/features/equipment/components/equipmentTableColumns';
import { useEquipmentTableColumns } from '@/features/equipment/hooks/useEquipmentTableColumns';
import { useOfflineMergedEquipment } from '@/features/equipment/hooks/useOfflineMergedEquipment';
import { useOrgEquipmentPMStatuses } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { EquipmentListTransitionRoot } from '@/features/equipment/transitions/EquipmentListTransitionRoot';

const Equipment = () => {
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment, canCreateEquipmentForAnyTeam, hasRole } = usePermissions();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initializedFromUrl = useRef(false);
  const { selectedTeamId, setSelectedTeamId } = useSelectedTeam();

  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentRecord | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [showImportCsv, setShowImportCsv] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<EquipmentViewMode>(() => {
    const stored = localStorage.getItem('equipqr:equipment-view-mode');
    let initial: EquipmentViewMode;
    switch (stored) {
      case 'table':
        initial = 'table';
        break;
      case 'list':
        initial = 'grid';
        break;
      default:
        initial = 'grid';
    }
    if (initial === 'table' && isMobile) {
      return 'grid';
    }
    return initial;
  });

  const {
    filters,
    sortConfig,
    paginatedEquipment,
    filterOptions,
    isLoading,
    hasActiveFilters,
    activeQuickFilter,
    equipment,
    currentPage,
    pageSize,
    pageSizeOptions,
    totalFilteredCount,
    updateFilter,
    updateSort,
    clearFilters,
    applyQuickFilter,
    setCurrentPage,
    setPageSize,
  } = useEquipmentFiltering(currentOrganization?.id, viewMode);

  // Merge server equipment with pending offline queue items
  const mergedEquipment = useOfflineMergedEquipment(paginatedEquipment);

  // Per-org column visibility for the dense table view (issue #633).
  const {
    visibleColumns,
    toggleColumn,
    resetToDefaults: resetColumnVisibility,
    hasOverrides: hasColumnOverrides,
  } = useEquipmentTableColumns(currentOrganization?.id);

  // PM interval status for all equipment (gated by feature flag internally)
  const { data: pmStatusList } = useOrgEquipmentPMStatuses(currentOrganization?.id);
  const pmStatuses = React.useMemo(() => {
    if (!pmStatusList) return undefined;
    const map = new Map<string, (typeof pmStatusList)[number]>();
    for (const s of pmStatusList) map.set(s.equipment_id, s);
    return map;
  }, [pmStatusList]);

  useEffect(() => {
    if (isMobile && viewMode === 'table') {
      setViewMode('grid');
    }
  }, [isMobile, viewMode]);

  const handleViewModeChange = useCallback((mode: EquipmentViewMode) => {
    setViewMode(mode);
    localStorage.setItem('equipqr:equipment-view-mode', mode);
  }, []);

  // Apply URL parameter filters on initial load.
  // The `team` parameter writes to the GLOBAL `useSelectedTeam` selection (not
  // the page-local filter) — the page is now driven by the TopBar selection,
  // so a deep link like `/dashboard/equipment?team=<uuid>` updates the global
  // scope and the sync effect below mirrors it onto the page filter.
  useEffect(() => {
    if (initializedFromUrl.current) return;
    let didApply = false;
    const team = searchParams.get('team');
    const status = searchParams.get('status');
    if (team) {
      // 'all' in a deep link means "clear the team filter" (global scope = null).
      // 'unassigned' is already the UNASSIGNED_TEAM_ID sentinel value.
      // Any other value is treated as a team UUID.
      setSelectedTeamId(team === 'all' ? null : team);
      didApply = true;
    }
    if (status) {
      const normalizedStatus =
        status === 'out_of_service'
          ? 'out_of_service'
          : ['active', 'maintenance', 'inactive'].includes(status)
            ? status
            : null;
      if (normalizedStatus) {
        updateFilter('status', normalizedStatus);
        didApply = true;
      }
    }
    if (searchParams.get('create') === 'true') {
      setShowForm(true);
      didApply = true;
    }
    if (didApply) {
      initializedFromUrl.current = true;
    }
  }, [searchParams, updateFilter, setSelectedTeamId]);

  // Mirror the global TopBar team selection onto the page-local filter.
  // `null` (= "All teams") and `UNASSIGNED_TEAM_ID` are translated to the
  // sentinel values `useEquipmentFiltering` already understands.
  useEffect(() => {
    const value =
      selectedTeamId === null
        ? 'all'
        : selectedTeamId === UNASSIGNED_TEAM_ID
          ? 'unassigned'
          : selectedTeamId;
    updateFilter('team', value);
  }, [selectedTeamId, updateFilter]);

  // Show "Add Equipment" / "Bulk Edit" when the user can create org-wide
  // OR for at least one team they belong to. Owners/admins clear via
  // canCreateEquipment(); team managers/technicians clear via the per-team
  // gate exposed by canCreateEquipmentForAnyTeam().
  const canCreate = canCreateEquipment() || canCreateEquipmentForAnyTeam();
  const canImport = hasRole(['owner', 'admin']);
  const canExport = hasRole(['owner', 'admin', 'member']);

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader 
          title="Equipment" 
          description="Please select an organization to view equipment." 
        />
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <EquipmentLoadingState />
      </Page>
    );
  }

  const handleAddEquipment = () => {
    setEditingEquipment(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEquipment(null);
  };

  const handleEquipmentCreated = (equipmentId: string) => {
    setSelectedTeamId(null);
    navigate(`/dashboard/equipment/${equipmentId}`);
  };

  return (
    <Page maxWidth="7xl" padding="responsive">
      <EquipmentListTransitionRoot
        className={cn('space-y-4 md:space-y-6', isMobile && canCreate && 'pb-28')}
      >
        <div data-equipment-list-chrome="">
          <PageHeader 
            title="Equipment" 
            description={`Manage equipment for ${currentOrganization.name}`}
            hideDescriptionOnMobile
            actions={
              canCreate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="hidden sm:inline-flex">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Equipment
                      <ChevronDown className="ml-1 h-4 w-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handleAddEquipment}>
                      Add Single Equipment
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate('/dashboard/equipment/bulk')}>
                      Bulk Edit (Grid)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }
          />
        </div>

      <div data-equipment-list-chrome="">
        <EquipmentFilters
          filters={filters}
          sortConfig={sortConfig}
          onFilterChange={updateFilter}
          onClearFilters={clearFilters}
          onQuickFilter={applyQuickFilter}
          onSortChange={updateSort}
          filterOptions={filterOptions}
          hasActiveFilters={hasActiveFilters}
          activeQuickFilter={activeQuickFilter}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          canImport={canImport}
          canExport={canExport}
          onImportCsv={() => setShowImportCsv(true)}
          equipment={equipment}
          columnPicker={
            viewMode === 'table' ? (
              <EquipmentColumnPicker
                allColumns={EQUIPMENT_TABLE_COLUMN_META}
                visibleColumns={visibleColumns}
                onToggle={toggleColumn}
                onReset={resetColumnVisibility}
                hasOverrides={hasColumnOverrides}
              />
            ) : undefined
          }
        />
      </div>

      <div className="space-y-4">
        <EquipmentGrid
          equipment={mergedEquipment}
          searchQuery={filters.search}
          statusFilter={filters.status}
          organizationName={currentOrganization.name}
          canCreate={canCreate}
          onShowQRCode={setShowQRCode}
          onAddEquipment={handleAddEquipment}
          onClearFilters={clearFilters}
          viewMode={viewMode}
          pmStatuses={pmStatuses}
          sortConfig={sortConfig}
          onSortChange={updateSort}
          visibleColumns={visibleColumns}
        />

        <div data-equipment-list-chrome="">
          <EquipmentPaginationFooter
            totalItems={totalFilteredCount}
            page={currentPage}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            itemLabel="result"
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Equipment Form Modal */}
      <EquipmentForm 
        open={showForm} 
        onClose={handleCloseForm}
        equipment={editingEquipment}
        onCreated={editingEquipment ? undefined : handleEquipmentCreated}
      />

      {/* QR Code Modal */}
      <QRCodeDisplay
        equipmentId={showQRCode || ''}
        open={!!showQRCode}
        onClose={() => setShowQRCode(null)}
        equipmentName={equipment.find(eq => eq.id === showQRCode)?.name}
        organizationId={currentOrganization?.id}
      />

      {/* CSV Import Wizard — lazy-loaded so papaparse (~45 KB gzipped)
          only ships when the user actually opens the importer. */}
      {showImportCsv && (
        <Suspense fallback={null}>
          <ImportCsvWizard
            open={showImportCsv}
            onClose={() => setShowImportCsv(false)}
            organizationId={currentOrganization.id}
            organizationName={currentOrganization.name}
          />
        </Suspense>
      )}

      {isMobile && canCreate && (
        <Button
          type="button"
          size="icon"
          data-equipment-list-chrome=""
          onClick={handleAddEquipment}
          aria-label="Add equipment"
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
      </EquipmentListTransitionRoot>
    </Page>
  );
};

export default Equipment;
