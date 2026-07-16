import React, { useState, useCallback, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { ReportExportModule } from '@/features/reports/components/ReportExportModule';
import { ReportsStatusStrip } from '@/features/reports/components/ReportsStatusStrip';
import { ReportsConsoleState } from '@/features/reports/components/ReportsConsoleState';
import { useReportRecordCount, useReportExportDialog } from '@/features/reports/hooks/useReportExport';
import { useScopedExportTeamIds } from '@/features/reports/hooks/useScopedExportTeamIds';
import { useWorkOrderExcelExport, useWorkOrderExcelCount } from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { canAccessScopedReportsExport } from '@/features/work-orders/utils/workOrderExportAccess';
import { saveColumnPreferences } from '@/features/reports/utils/column-preferences';

import {
  REPORT_CARDS,
  FEATURED_REPORT_CARD,
  getReportsByCategory,
} from '@/features/reports/constants/reportColumns';
import type { ReportType, ExportFilters } from '@/features/reports/types/reports';
import type { WorkOrderExcelFilters, WorksheetKey } from '@/features/work-orders/types/workOrderExcel';

/**
 * Reports Page - Fleet Export Console (admin) or scoped work-order export (requestor/viewer)
 */
const Reports: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { hasRole } = usePermissions();
  const { teamMemberships, isLoading: teamsLoading } = useTeamMembership();

  const [exportingReportType, setExportingReportType] = useState<ReportType | null>(null);
  const [filters] = useState<ExportFilters>({});
  const [excelFilters] = useState<WorkOrderExcelFilters>({ dateField: 'created_date' });
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

  const { bulkExport, isBulkExporting } = useWorkOrderExcelExport(
    currentOrganization?.id,
    currentOrganization?.name ?? '',
  );

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

  const handleFeaturedExcelExport = useCallback(
    (worksheets: WorksheetKey[]) => {
      bulkExport({
        dateField: 'created_date',
        worksheets,
      });
    },
    [bulkExport],
  );

  const handleCsvExport = useCallback(
    async (reportType: ReportType, columns: string[]) => {
      if (!currentOrganization) return;

      setExportingReportType(reportType);
      saveColumnPreferences(reportType, columns);

      try {
        await handleExport(reportType, filters, columns);
      } finally {
        setExportingReportType(null);
      }
    },
    [currentOrganization, handleExport, filters],
  );

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
    const isFeaturedExcel = featured && card.type === 'work-orders-detailed';
    const isCsv = card.format === 'csv';

    return (
      <ReportExportModule
        key={card.type}
        config={card}
        recordCount={count}
        isLoadingCount={isLoading}
        onCsvExport={isCsv ? (columns) => handleCsvExport(card.type, columns) : undefined}
        onExcelExport={isFeaturedExcel ? handleFeaturedExcelExport : undefined}
        isExporting={isFeaturedExcel ? isBulkExporting : exportingReportType === card.type}
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
              : 'Export fleet, maintenance, inventory, and scan data. Expand each module to choose fields, then export.'
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
    </Page>
  );
};

export default Reports;
