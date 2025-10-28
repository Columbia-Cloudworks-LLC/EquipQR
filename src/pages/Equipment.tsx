
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { useEquipmentFiltering } from '@/hooks/useEquipmentFiltering';
import { exportEquipmentCSV } from '@/services/equipmentCSVService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
  const { currentOrganization } = useSimpleOrganization();
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
    setCurrentPage
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
    <div className="space-y-6">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalFilteredCount)} of{' '}
            {totalFilteredCount} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm">
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
