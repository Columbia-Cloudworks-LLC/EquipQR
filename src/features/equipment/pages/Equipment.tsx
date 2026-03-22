import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Upload } from 'lucide-react';
import type { EquipmentViewMode } from '@/features/equipment/components/EquipmentCard';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useEquipmentFiltering } from '@/features/equipment/hooks/useEquipmentFiltering';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';

import EquipmentForm from '@/features/equipment/components/EquipmentForm';
import QRCodeDisplay from '@/features/equipment/components/QRCodeDisplay';
import { EquipmentFilters } from '@/features/equipment/components/EquipmentFilters';
import EquipmentSortHeader from '@/features/equipment/components/EquipmentSortHeader';
import EquipmentGrid from '@/features/equipment/components/EquipmentGrid';
import EquipmentLoadingState from '@/features/equipment/components/EquipmentLoadingState';
import ImportCsvWizard from '@/features/equipment/components/ImportCsvWizard';
import { useOfflineMergedEquipment } from '@/features/equipment/hooks/useOfflineMergedEquipment';
import { useOrgEquipmentPMStatuses } from '@/features/equipment/hooks/useEquipmentPMStatus';

const Equipment = () => {
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment, hasRole } = usePermissions();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const initializedFromUrl = useRef(false);
  
  // Use the new enhanced filtering hook with explicit organization ID
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
    totalPages,
    totalFilteredCount,
    updateFilter,
    updateSort,
    clearFilters,
    applyQuickFilter,
    setCurrentPage,
    setPageSize
  } = useEquipmentFiltering(currentOrganization?.id);
  
  // Merge server equipment with pending offline queue items
  const mergedEquipment = useOfflineMergedEquipment(paginatedEquipment);

  // PM interval status for all equipment (gated by feature flag internally)
  const { data: pmStatusList } = useOrgEquipmentPMStatuses(currentOrganization?.id);
  const pmStatuses = React.useMemo(() => {
    if (!pmStatusList) return undefined;
    const map = new Map<string, (typeof pmStatusList)[number]>();
    for (const s of pmStatusList) map.set(s.equipment_id, s);
    return map;
  }, [pmStatusList]);

  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentRecord | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [showImportCsv, setShowImportCsv] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<EquipmentViewMode>(() => {
    const stored = localStorage.getItem('equipqr:equipment-view-mode');
    return stored === 'list' ? 'list' : 'grid';
  });
  const pageSizeSelectId = 'equipment-page-size-select';

  const handleViewModeChange = useCallback((mode: EquipmentViewMode) => {
    setViewMode(mode);
    localStorage.setItem('equipqr:equipment-view-mode', mode);
  }, []);

  // Apply URL parameter filters on initial load
  useEffect(() => {
    if (initializedFromUrl.current) return;
    let didApply = false;
    const team = searchParams.get('team');
    const status = searchParams.get('status');
    if (team) {
      updateFilter('team', team);
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
    if (didApply) {
      initializedFromUrl.current = true;
    }
  }, [searchParams, updateFilter]);

  const canCreate = canCreateEquipment();
  const canImport = hasRole(['owner', 'admin']);

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

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 md:space-y-6">
        <PageHeader 
          title="Equipment" 
          description={`Manage equipment for ${currentOrganization.name}`}
          hideDescriptionOnMobile
          actions={
            <div className="flex flex-col sm:flex-row gap-2">
              {canImport && (
                <Button 
                  variant="outline"
                  onClick={() => setShowImportCsv(true)}
                  className="hidden w-full min-h-11 md:inline-flex sm:w-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              )}
              {canCreate && (
                <Button 
                  onClick={handleAddEquipment}
                  className="w-full min-h-11 sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Equipment
                </Button>
              )}
            </div>
          }
        />

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
        resultCount={totalFilteredCount}
        totalCount={equipment.length}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Mobile-only: sort + view mode below the filter bar */}
      {isMobile && (
        <EquipmentSortHeader
          sortConfig={sortConfig}
          onSortChange={updateSort}
          resultCount={totalFilteredCount}
          totalCount={equipment.length}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      )}

      <EquipmentGrid
        equipment={mergedEquipment}
        searchQuery={filters.search}
        statusFilter={filters.status}
        organizationName={currentOrganization.name}
        canCreate={canCreate}
        onShowQRCode={setShowQRCode}
        onAddEquipment={handleAddEquipment}
        viewMode={viewMode}
        pmStatuses={pmStatuses}
      />

      {/* Pagination */}
      {(totalPages > 1 || totalFilteredCount > 0) && (
        <div className="flex flex-col gap-4 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {totalFilteredCount > 0 ? (
                <>
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalFilteredCount)} of{' '}
                  {totalFilteredCount} results
                </>
              ) : (
                'No results found'
              )}
            </p>
            
            {/* Items per page: desktop only */}
            <div className="hidden md:flex items-center gap-2">
              <label htmlFor={pageSizeSelectId} className="text-sm text-muted-foreground whitespace-nowrap">Items per page:</label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id={pageSizeSelectId} className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Mobile: simple page strip */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 md:hidden">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-3 whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Desktop: full pagination */}
          {totalPages > 1 && (
            <div className="hidden md:flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm px-4 whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Equipment Form Modal */}
      <EquipmentForm 
        open={showForm} 
        onClose={handleCloseForm}
        equipment={editingEquipment}
      />

      {/* QR Code Modal */}
      <QRCodeDisplay
        equipmentId={showQRCode || ''}
        open={!!showQRCode}
        onClose={() => setShowQRCode(null)}
        equipmentName={equipment.find(eq => eq.id === showQRCode)?.name}
      />

      {/* CSV Import Wizard */}
      <ImportCsvWizard
        open={showImportCsv}
        onClose={() => setShowImportCsv(false)}
        organizationId={currentOrganization.id}
        organizationName={currentOrganization.name}
      />
      </div>
    </Page>
  );
};

export default Equipment;
