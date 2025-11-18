
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useEquipmentFiltering } from '@/components/equipment/hooks/useEquipmentFiltering';
import { exportEquipmentCSV } from '@/services/equipmentCSVService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EquipmentRecord } from '@/types/equipment';

import EquipmentForm from '@/components/equipment/EquipmentForm';
import QRCodeDisplay from '@/components/equipment/QRCodeDisplay';
import EquipmentHeader from '@/components/equipment/EquipmentHeader';
import { EquipmentFilters } from '@/components/equipment/EquipmentFilters';
import EquipmentSortHeader from '@/components/equipment/EquipmentSortHeader';
import EquipmentGrid from '@/components/equipment/EquipmentGrid';
import EquipmentLoadingState from '@/components/equipment/EquipmentLoadingState';
import ImportCsvWizard from '@/components/equipment/ImportCsvWizard';

const Equipment = () => {
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment, hasRole } = usePermissions();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initializedFromUrl = useRef(false);
  
  // Use the new enhanced filtering hook with explicit organization ID
  const {
    filters,
    sortConfig,
    filteredAndSortedEquipment,
    paginatedEquipment,
    filterOptions,
    isLoading,
    hasActiveFilters,
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
  
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentRecord | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [showImportCsv, setShowImportCsv] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Apply URL parameter filters on initial load
  useEffect(() => {
    if (initializedFromUrl.current) return;
    const team = searchParams.get('team');
    if (team) {
      updateFilter('team', team);
      initializedFromUrl.current = true;
    }
  }, [searchParams, updateFilter]);

  const canCreate = canCreateEquipment();
  const canExport = hasRole(['owner', 'admin']);

  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground">
            Please select an organization to view equipment.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <EquipmentLoadingState />;
  }

  const handleAddEquipment = () => {
    setEditingEquipment(null);
    setShowForm(true);
  };


  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEquipment(null);
  };

  const handleExportCSV = async () => {
    if (!currentOrganization || !canExport) return;
    
    setIsExporting(true);
    try {
      await exportEquipmentCSV(
        filteredAndSortedEquipment,
        filterOptions.teams || [],
        currentOrganization.name
      );
      toast({
        title: "Export successful",
        description: `Exported ${filteredAndSortedEquipment.length} equipment records to CSV.`,
      });
    } catch (error) {
      console.error('Failed to export equipment CSV:', error);
      toast({
        title: "Export failed", 
        description: "There was an error exporting the equipment data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Equipment data comes from the filtering hook

  return (
    <div className="space-y-4 md:space-y-6">
      <EquipmentHeader
        organizationName={currentOrganization.name}
        canCreate={canCreate}
        canImport={canExport}
        onAddEquipment={handleAddEquipment}
        onImportCsv={() => setShowImportCsv(true)}
      />

      <EquipmentFilters
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        onQuickFilter={applyQuickFilter}
        filterOptions={filterOptions}
        hasActiveFilters={hasActiveFilters}
      />

      <EquipmentSortHeader
        sortConfig={sortConfig}
        onSortChange={updateSort}
        resultCount={totalFilteredCount}
        totalCount={equipment.length}
        canExport={canExport}
        onExportCSV={handleExportCSV}
        isExporting={isExporting}
      />

      <EquipmentGrid
        equipment={paginatedEquipment}
        searchQuery={filters.search}
        statusFilter={filters.status}
        organizationName={currentOrganization.name}
        canCreate={canCreate}
        onShowQRCode={setShowQRCode}
        onAddEquipment={handleAddEquipment}
      />

      {/* Pagination and Page Size Selector */}
      {(totalPages > 1 || totalFilteredCount > 0) && (
        <div className="flex flex-col gap-4 border-t pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Items per page:</label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1); // Reset to first page when page size changes
                }}
              >
                <SelectTrigger className="w-full sm:w-[100px]">
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
          
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex-1 sm:flex-none h-10"
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
                  className="flex-1 sm:flex-none h-10"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
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
  );
};

export default Equipment;
