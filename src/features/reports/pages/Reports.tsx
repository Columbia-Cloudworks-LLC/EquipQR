import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Forklift, 
  ClipboardList, 
  Package, 
  ScanLine, 
  Download,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Info,
  Zap,
  Settings2,
  Columns3,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { ReportExportDialog } from '@/features/reports/components/ReportExportDialog';
import { WorkOrderExcelExportDialog } from '@/features/work-orders/components/WorkOrderExcelExportDialog';
import { useReportRecordCount, useReportExportDialog } from '@/features/reports/hooks/useReportExport';
import { useWorkOrderExcelExport, useWorkOrderExcelCount } from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { REPORT_CARDS, getDefaultColumns } from '@/features/reports/constants/reportColumns';
import type { ReportType, ExportFilters } from '@/features/reports/types/reports';
import type { WorkOrderExcelFilters } from '@/features/work-orders/types/workOrderExcel';

// Icon mapping for report cards
const REPORT_ICONS: Record<string, React.ReactNode> = {
  'Forklift': <Forklift className="h-8 w-8" />,
  'ClipboardList': <ClipboardList className="h-8 w-8" />,
  'Package': <Package className="h-8 w-8" />,
  'ScanLine': <ScanLine className="h-8 w-8" />,
  'FileSpreadsheet': <FileSpreadsheet className="h-8 w-8" />,
  'Layers': <Layers className="h-8 w-8" />,
};

/**
 * ReportCard - Individual card for each report type
 */
interface ReportCardProps {
  type: ReportType;
  title: string;
  description: string;
  icon: string;
  format: 'csv' | 'excel';
  columnCount: number;
  recordCount: number;
  isLoadingCount: boolean;
  onExport: () => void;
  onQuickExport: () => void;
  canExport: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({
  title,
  description,
  icon,
  format,
  columnCount,
  recordCount,
  isLoadingCount,
  onExport,
  onQuickExport,
  canExport,
}) => {
  const isDisabled = !canExport || recordCount === 0;
  const isExcel = format === 'excel';

  return (
    <Card className="flex flex-col transition-all duration-200 hover:border-primary/50 hover:shadow-md group">
      {/* Desktop Layout */}
      <CardHeader className="flex-1 hidden sm:block">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
            {REPORT_ICONS[icon] || <FileSpreadsheet className="h-8 w-8" />}
          </div>
          <Badge 
            variant={isExcel ? 'default' : 'secondary'} 
            className="text-xs"
          >
            {isExcel ? 'Excel' : 'CSV'}
          </Badge>
        </div>
        <CardTitle className="text-lg mt-4">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 hidden sm:block">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {isLoadingCount ? (
              <Skeleton className="h-4 w-20" />
            ) : recordCount === 0 ? (
              <span className="text-sm text-muted-foreground">No data available</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {recordCount.toLocaleString()} records
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Columns3 className="h-3 w-3" />
              <span>{columnCount} columns</span>
            </div>
          </div>
          {isExcel ? (
            // Excel exports go directly to the dialog (no quick export for multi-sheet)
            <Button
              size="sm"
              onClick={onExport}
              disabled={isDisabled}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          ) : (
            // CSV exports have quick export + customize options
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  disabled={isDisabled}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onQuickExport} className="gap-2">
                  <Zap className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>Quick Export</span>
                    <span className="text-xs text-muted-foreground">Default columns</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onExport} className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>Customize Export</span>
                    <span className="text-xs text-muted-foreground">Choose columns</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>

      {/* Mobile Compact Layout */}
      <div className="sm:hidden p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
            {REPORT_ICONS[icon] || <FileSpreadsheet className="h-6 w-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{title}</h3>
              <Badge 
                variant={isExcel ? 'default' : 'secondary'} 
                className="text-[10px] px-1.5 py-0"
              >
                {isExcel ? 'Excel' : 'CSV'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {isLoadingCount ? (
                <Skeleton className="h-3 w-16" />
              ) : recordCount === 0 ? (
                <span>No data</span>
              ) : (
                <span>{recordCount.toLocaleString()} records</span>
              )}
              <span className="flex items-center gap-0.5">
                <Columns3 className="h-3 w-3" />
                {columnCount}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onExport}
            disabled={isDisabled}
            className="flex-shrink-0"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

/**
 * Reports Page - Main reports page with export cards
 */
const Reports: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { hasRole } = usePermissions();

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [excelExportDialogOpen, setExcelExportDialogOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('equipment');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Default filters (empty for now - can be expanded later)
  const [filters] = useState<ExportFilters>({});
  const [excelFilters, setExcelFilters] = useState<WorkOrderExcelFilters>({ dateField: 'created_date' });
  
  // Check permissions
  const canExport = hasRole(['owner', 'admin']);
  
  // Get record counts for each report type
  const equipmentCount = useReportRecordCount('equipment', currentOrganization?.id, filters);
  const inventoryCount = useReportRecordCount('inventory', currentOrganization?.id, filters);
  const scansCount = useReportRecordCount('scans', currentOrganization?.id, filters);
  const alternateGroupsCount = useReportRecordCount('alternate-groups', currentOrganization?.id, filters);
  
  // Work orders detailed count (with Excel filters)
  const workOrdersDetailedCount = useWorkOrderExcelCount(currentOrganization?.id, excelFilters);
  
  // Excel export hook
  const {
    bulkExport,
    isBulkExporting,
    bulkExportError,
    exportToSheets,
    isExportingToSheets,
  } = useWorkOrderExcelExport(currentOrganization?.id, currentOrganization?.name ?? '');
  
  // Google Workspace connection status (for showing "Export to Google Sheets" option)
  const { isConnected: isGoogleWorkspaceConnected } = useGoogleWorkspaceConnectionStatus({
    organizationId: currentOrganization?.id,
  });
  
  // CSV Export dialog handler
  const { handleExport } = useReportExportDialog(
    currentOrganization?.id,
    currentOrganization?.name ?? ''
  );
  
  const getCountForType = (type: ReportType) => {
    switch (type) {
      case 'equipment':
        return { count: equipmentCount.data ?? 0, isLoading: equipmentCount.isLoading };
      case 'work-orders-detailed':
        return { count: workOrdersDetailedCount.data ?? 0, isLoading: workOrdersDetailedCount.isLoading };
      case 'inventory':
        return { count: inventoryCount.data ?? 0, isLoading: inventoryCount.isLoading };
      case 'scans':
        return { count: scansCount.data ?? 0, isLoading: scansCount.isLoading };
      case 'alternate-groups':
        return { count: alternateGroupsCount.data ?? 0, isLoading: alternateGroupsCount.isLoading };
      default:
        return { count: 0, isLoading: false };
    }
  };
  
  // Info section collapse state
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleOpenExportDialog = useCallback((reportType: ReportType) => {
    if (reportType === 'work-orders-detailed') {
      // Open the Excel export dialog for detailed work orders
      setExcelFilters({ dateField: 'created_date' });
      setExcelExportDialogOpen(true);
    } else {
      // Open the standard CSV export dialog
      setSelectedReportType(reportType);
      setExportError(null);
      setExportDialogOpen(true);
    }
  }, []);
  
  // Quick export with default columns (CSV only)
  const handleQuickExport = useCallback(async (reportType: ReportType) => {
    if (!currentOrganization) return;
    
    // Get default columns for this report type
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
  }, [currentOrganization, handleExport, filters]);
  
  const handleExportWithColumns = useCallback(async (columns: string[]) => {
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
  }, [currentOrganization, handleExport, selectedReportType, filters]);
  
  const handleExcelExport = useCallback(async (newFilters: WorkOrderExcelFilters) => {
    setExcelFilters(newFilters);
    bulkExport(newFilters);
    setExcelExportDialogOpen(false);
  }, [bulkExport]);
  
  const handleExportToSheets = useCallback((newFilters: WorkOrderExcelFilters) => {
    setExcelFilters(newFilters);
    exportToSheets(newFilters);
    // Don't close dialog immediately - let the user see the loading state
    // The dialog will be closed when they click Cancel or the export completes
  }, [exportToSheets]);
  
  // Get title for selected report type
  const getReportTitle = (type: ReportType) => {
    const card = REPORT_CARDS.find(c => c.type === type);
    return card?.title ?? 'Report';
  };

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader 
          title="Reports" 
          description="Please select an organization to view reports." 
        />
      </Page>
    );
  }

  if (!canExport) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader 
          title="Reports" 
          description="Export detailed reports for your fleet management data." 
        />
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
              <p className="text-muted-foreground">
                Only organization owners and admins can export reports.
                Please contact your administrator for access.
              </p>
            </div>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <PageHeader 
          title="Reports" 
          description="Export detailed reports for your fleet management data. Select a report type to customize and download." 
        />

        {/* Report Cards Grid */}
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {REPORT_CARDS.map((card) => {
            const { count, isLoading } = getCountForType(card.type);
            
            return (
              <ReportCard
                key={card.type}
                type={card.type}
                title={card.title}
                description={card.description}
                icon={card.icon}
                format={card.format}
                columnCount={card.columnCount}
                recordCount={count}
                isLoadingCount={isLoading}
                onExport={() => handleOpenExportDialog(card.type)}
                onQuickExport={() => handleQuickExport(card.type)}
                canExport={canExport}
              />
            );
          })}
        </div>

        {/* Collapsible Info Section */}
        <Collapsible open={isInfoOpen} onOpenChange={setIsInfoOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <button className="w-full text-left">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">About Report Exports</CardTitle>
                    </div>
                    <ChevronDown 
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                        isInfoOpen ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>
                </CardHeader>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="text-sm text-muted-foreground space-y-3 pt-0">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-1 rounded-full bg-primary/30" />
                  <p>
                    Reports are exported as CSV or Excel files that can be opened in Excel, 
                    Google Sheets, or any spreadsheet application.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-1 rounded-full bg-primary/30" />
                  <p>
                    Use <strong>Quick Export</strong> for default columns, or <strong>Customize Export</strong> to 
                    select specific columns. Large datasets (over 50,000 records) will be automatically limited.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-1 rounded-full bg-primary/30" />
                  <p>
                    Exports are rate limited to prevent system abuse: 5 exports per minute, 
                    50 exports per hour per organization.
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* CSV Export Dialog */}
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

      {/* Work Orders Excel Export Dialog */}
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
    </Page>
  );
};

export default Reports;
