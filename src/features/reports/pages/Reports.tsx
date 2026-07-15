import React, { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { ReportExportDialog } from '@/features/reports/components/ReportExportDialog';
import { WorkOrderExcelExportDialog } from '@/features/work-orders/components/WorkOrderExcelExportDialog';
import { ReportExportModule } from '@/features/reports/components/ReportExportModule';
import { ReportsStatusStrip } from '@/features/reports/components/ReportsStatusStrip';
import { ReportsConsoleState } from '@/features/reports/components/ReportsConsoleState';
import { useReportRecordCount, useReportExportDialog } from '@/features/reports/hooks/useReportExport';
import { useScopedExportTeamIds } from '@/features/reports/hooks/useScopedExportTeamIds';
import { useWorkOrderExcelExport, useWorkOrderExcelCount } from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { canAccessScopedReportsExport } from '@/features/work-orders/utils/workOrderExportAccess';

import {
  REPORT_CARDS,
  FEATURED_REPORT_CARD,
  getReportsByCategory,
  getDefaultColumns,
} from '@/features/reports/constants/reportColumns';
import type { ReportType, ExportFilters } from '@/features/reports/types/reports';
import type { WorkOrderExcelFilters } from '@/features/work-orders/types/workOrderExcel';

/**
 * Reports Page - Fleet Export Console (admin) or scoped work-order export (requestor/viewer)
 */
const Reports: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { hasRole } = usePermissions();
  const { teamMemberships, isLoading: teamsLoading } = useTeamMembership();

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [excelExportDialogOpen, setExcelExportDialogOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('equipment');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [filters] = useState<ExportFilters>({});
  const [excelFilters, setExcelFilters] = useState<WorkOrderExcelFilters>({ dateField: 'created_date' });
  const isOrgAdmin = hasRole(['owner', 'admin']);
  const { teamIds: scopedTeamIds, isLoading: scopedTeamsLoading } = useScopedExportTeamIds(isOrgAdmin);
  const scopeReady = isOrgAdmin || !scopedTeamsLoading;
  const canAccessReports = !teamsLoading && canAccessScopedReportsExport(isOrgAdmin, teamMemberships);
  const reportAudience = isOrgAdmin ? 'admin' : 'scoped';

  const scopedTeamFilter = isOrgAdmin ? undefined : scopedTeamIds;

  const equipmentCount = useReportRecordCount('equipment', currentOrganization?.id, filters);
  const inventoryCount = useReportRecordCount('inventory', currentOrganization?.id, filters);
  const scansCount = useReportRecordCount('scans', currentOrganization?.id, filters);
  const operatorCheckinsCount = useReportRecordCount('operator-check-ins', currentOrganization?.id, filters);
  const quickFormsCount = useReportRecordCount('quick-forms', currentOrganization?.id, filters);
  const alternateGroupsCount = useReportRecordCount('alternate-groups', currentOrganization?.id, filters);
  const workOrdersCount = useReportRecordCount(
    'work-orders',
    currentOrganization?.id,
    filters,
    scopedTeamFilter,
    { scopeReady },
  );
  const workOrdersDetailedCount = useWorkOrderExcelCount(currentOrganization?.id, excelFilters);

  const {
    bulkExport,
    isBulkExporting,
    bulkExportError,
    exportToSheetsAsync,
    isExportingToSheets,
  } = useWorkOrderExcelExport(currentOrganization?.id, currentOrganization?.name ?? '');

  const { isConnected: isGoogleWorkspaceConnected } = useGoogleWorkspaceConnectionStatus({
    organizationId: currentOrganization?.id,
  });

  const { handleExport } = useReportExportDialog(
    currentOrganization?.id,
    currentOrganization?.name ?? '',
  );

  const categoryGroups = useMemo(
    () => getReportsByCategory(reportAudience),
    [reportAudience],
  );

  const getCountForType = useCallback(
    (type: ReportType) => {
      switch (type) {
        case 'equipment':
          return { count: equipmentCount.data ?? 0, isLoading: equipmentCount.isLoading };
        case 'work-orders':
          return { count: workOrdersCount.data ?? 0, isLoading: workOrdersCount.isLoading };
        case 'work-orders-detailed':
          return { count: workOrdersDetailedCount.data ?? 0, isLoading: workOrdersDetailedCount.isLoading };
        case 'inventory':
          return { count: inventoryCount.data ?? 0, isLoading: inventoryCount.isLoading };
        case 'scans':
          return { count: scansCount.data ?? 0, isLoading: scansCount.isLoading };
        case 'operator-check-ins':
          return { count: operatorCheckinsCount.data ?? 0, isLoading: operatorCheckinsCount.isLoading };
        case 'quick-forms':
          return { count: quickFormsCount.data ?? 0, isLoading: quickFormsCount.isLoading };
        case 'alternate-groups':
          return { count: alternateGroupsCount.data ?? 0, isLoading: alternateGroupsCount.isLoading };
        default:
          return { count: 0, isLoading: false };
      }
    },
    [
      equipmentCount.data,
      equipmentCount.isLoading,
      workOrdersCount.data,
      workOrdersCount.isLoading,
      workOrdersDetailedCount.data,
      workOrdersDetailedCount.isLoading,
      inventoryCount.data,
      inventoryCount.isLoading,
      scansCount.data,
      scansCount.isLoading,
      operatorCheckinsCount.data,
      operatorCheckinsCount.isLoading,
      quickFormsCount.data,
      quickFormsCount.isLoading,
      alternateGroupsCount.data,
      alternateGroupsCount.isLoading,
    ],
  );

  const handleOpenExportDialog = useCallback((reportType: ReportType) => {
    if (reportType === 'work-orders-detailed') {
      setExcelFilters({ dateField: 'created_date' });
      setExcelExportDialogOpen(true);
    } else {
      setSelectedReportType(reportType);
      setExportError(null);
      setExportDialogOpen(true);
    }
  }, []);

  const handleQuickExport = useCallback(
    async (reportType: ReportType) => {
      if (!currentOrganization) return;

      const defaultColumns = getDefaultColumns(reportType);

      setSelectedReportType(reportType);
      setIsExporting(true);
      setExportError(null);

      try {
        await handleExport(reportType, filters, defaultColumns);
      } catch (error) {
        setExportError(error instanceof Error ? error.message : 'Export failed');
      } finally {
        setIsExporting(false);
      }
    },
    [currentOrganization, handleExport, filters],
  );

  const handleExportWithColumns = useCallback(
    async (columns: string[]) => {
      if (!currentOrganization) return;

      setIsExporting(true);
      setExportError(null);

      try {
        await handleExport(selectedReportType, filters, columns);
        setExportDialogOpen(false);
      } catch (error) {
        setExportError(error instanceof Error ? error.message : 'Export failed');
      } finally {
        setIsExporting(false);
      }
    },
    [currentOrganization, handleExport, selectedReportType, filters],
  );

  const handleExcelExport = useCallback(
    async (newFilters: WorkOrderExcelFilters) => {
      setExcelFilters(newFilters);
      bulkExport(newFilters);
      setExcelExportDialogOpen(false);
    },
    [bulkExport],
  );

  const handleExportToSheets = useCallback(
    async (newFilters: WorkOrderExcelFilters) => {
      setExcelFilters(newFilters);
      try {
        await exportToSheetsAsync(newFilters);
        setExcelExportDialogOpen(false);
      } catch {
        // Keep dialog open on error so user can retry.
      }
    },
    [exportToSheetsAsync],
  );

  const getReportTitle = (type: ReportType) => {
    const card = REPORT_CARDS.find((c) => c.type === type);
    return card?.title ?? 'Report';
  };

  if (!currentOrganization) {
    return <ReportsConsoleState variant="no-organization" />;
  }

  if (teamsLoading || scopedTeamsLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="py-12 text-center text-sm text-muted-foreground">Loading export console…</div>
      </Page>
    );
  }

  if (!canAccessReports) {
    return <ReportsConsoleState variant="access-restricted" />;
  }

  const isScopedConsole = reportAudience === 'scoped';

  /** Responsive grid: single-card sections stay compact; pairs fill two columns. */
  const getSectionGridClass = (cardCount: number) => {
    if (cardCount === 1) return 'grid max-w-xl gap-4 sm:gap-6';
    if (cardCount === 2) return 'grid gap-4 sm:gap-6 sm:grid-cols-2';
    return 'grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3';
  };

  const renderExportModule = (card: (typeof REPORT_CARDS)[number], featured = false) => {
    const { count, isLoading } = getCountForType(card.type);
    return (
      <ReportExportModule
        key={card.type}
        config={card}
        recordCount={count}
        isLoadingCount={isLoading}
        onExport={() => handleOpenExportDialog(card.type)}
        onQuickExport={() => handleQuickExport(card.type)}
        canExport={canAccessReports}
        featured={featured}
      />
    );
  };

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <PageHeader
          title={isScopedConsole ? 'Work Order Exports' : 'Fleet Export Console'}
          description={
            isScopedConsole
              ? 'Download CSV summaries for work orders on equipment you can view. Private notes and costs are never included.'
              : 'Export fleet, maintenance, inventory, and scan data. Select a module to configure columns and download.'
          }
          meta={
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide">
              {isScopedConsole ? 'Scoped Export' : 'Export Console'}
            </Badge>
          }
        />

        <ReportsStatusStrip
          organizationName={currentOrganization.name}
          canExport={canAccessReports}
          isGoogleWorkspaceConnected={isGoogleWorkspaceConnected}
        />

        {!isScopedConsole && FEATURED_REPORT_CARD && (
          <section aria-labelledby="featured-export-heading">
            <h2
              id="featured-export-heading"
              className="mb-3 font-tabular text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Primary Export
            </h2>
            <div className="grid gap-4">
              {renderExportModule(FEATURED_REPORT_CARD, true)}
            </div>
          </section>
        )}

        {categoryGroups.map((group) => (
          <section key={group.category} aria-labelledby={`export-section-${group.category}`}>
            <h2
              id={`export-section-${group.category}`}
              className="mb-3 font-tabular text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {group.label}
            </h2>
            <div className={getSectionGridClass(group.cards.length)}>
              {group.cards.map((card) => (
                <div key={card.type} className="h-full min-h-0">
                  {renderExportModule(card)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <ReportExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        reportType={selectedReportType}
        reportTitle={getReportTitle(selectedReportType)}
        filters={filters}
        recordCount={getCountForType(selectedReportType).count}
        isLoadingCount={getCountForType(selectedReportType).isLoading}
        onExport={handleExportWithColumns}
        isExporting={isExporting}
        exportError={exportError}
      />

      {!isScopedConsole && (
        <WorkOrderExcelExportDialog
          open={excelExportDialogOpen}
          onOpenChange={setExcelExportDialogOpen}
          organizationId={currentOrganization.id}
          recordCount={workOrdersDetailedCount.data ?? 0}
          isLoadingCount={workOrdersDetailedCount.isLoading}
          onExport={handleExcelExport}
          isExporting={isBulkExporting}
          exportError={bulkExportError}
          isGoogleWorkspaceConnected={isGoogleWorkspaceConnected}
          onExportToSheets={handleExportToSheets}
          isExportingToSheets={isExportingToSheets}
        />
      )}
    </Page>
  );
};

export default Reports;
