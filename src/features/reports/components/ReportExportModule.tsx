import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Forklift,
  ClipboardList,
  Package,
  ScanLine,
  ClipboardSignature,
  FileSignature,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportCardConfig } from '@/features/reports/types/reports';
import { resolveInitialExportColumns } from '@/features/reports/constants/reportColumns';
import { ReportColumnSelector } from '@/features/reports/components/ReportColumnSelector';
import {
  DEFAULT_WORKSHEETS,
  type WorksheetKey,
} from '@/features/work-orders/types/workOrderExcel';
import { WorksheetSelector } from '@/features/work-orders/components/WorksheetSelector';

const EXPORT_ROW_LIMIT = 50_000;

const REPORT_ICONS: Record<string, React.ReactNode> = {
  Forklift: <Forklift className="h-8 w-8" />,
  ClipboardList: <ClipboardList className="h-8 w-8" />,
  Package: <Package className="h-8 w-8" />,
  ScanLine: <ScanLine className="h-8 w-8" />,
  ClipboardSignature: <ClipboardSignature className="h-8 w-8" />,
  FileSignature: <FileSignature className="h-8 w-8" />,
  FileSpreadsheet: <FileSpreadsheet className="h-8 w-8" />,
  Layers: <Layers className="h-8 w-8" />,
};

export interface ReportExportModuleProps {
  config: ReportCardConfig;
  recordCount: number;
  isLoadingCount: boolean;
  onCsvExport?: (columns: string[]) => void;
  onExcelExport?: (worksheets: WorksheetKey[]) => void;
  isExporting?: boolean;
  canExport: boolean;
  featured?: boolean;
}

interface ModuleHeaderProps {
  config: ReportCardConfig;
  icon: React.ReactNode;
  featured: boolean;
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ config, icon, featured }) => (
  <div className="flex min-w-0 items-start gap-3">
    <div
      className={cn(
        'shrink-0 border border-primary/20 bg-primary/10 p-2 text-primary transition-transform duration-200 group-hover:scale-105',
        featured && 'p-3',
      )}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <CardTitle className={cn('text-lg', featured && 'text-xl')}>{config.title}</CardTitle>
    </div>
  </div>
);

interface ModuleStatsProps {
  recordCount: number;
  isLoadingCount: boolean;
  compact?: boolean;
}

const ModuleStats: React.FC<ModuleStatsProps> = ({ recordCount, isLoadingCount, compact }) => (
  <div className={cn('space-y-1', compact && 'text-xs')}>
    {isLoadingCount ? (
      <Skeleton className="h-4 w-24" />
    ) : recordCount === 0 ? (
      <span className="font-tabular text-sm text-muted-foreground">NO RECORDS</span>
    ) : (
      <span className="font-tabular text-sm text-foreground">
        {recordCount.toLocaleString()} RECORDS
      </span>
    )}
    {recordCount > EXPORT_ROW_LIMIT && !isLoadingCount && (
      <p className="text-[10px] text-warning">Export capped at 50,000 rows</p>
    )}
  </div>
);

interface ExportActionsProps {
  isExcel: boolean;
  isDisabled: boolean;
  isExporting?: boolean;
  featured: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  onCsvExport?: (columns: string[]) => void;
  onExcelExport?: (worksheets: WorksheetKey[]) => void;
  selectedColumns?: string[];
  selectedWorksheets?: WorksheetKey[];
}

const ExportActions: React.FC<ExportActionsProps> = ({
  isExcel,
  isDisabled,
  isExporting = false,
  featured,
  compact,
  fullWidth,
  onCsvExport,
  onExcelExport,
  selectedColumns,
  selectedWorksheets,
}) => {
  if (isExcel && onExcelExport && selectedWorksheets) {
    return (
      <Button
        size={compact ? 'sm' : featured ? 'default' : 'sm'}
        onClick={() => onExcelExport(selectedWorksheets)}
        disabled={isDisabled || isExporting}
        className={cn(fullWidth && 'w-full')}
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Exporting…
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            {compact ? 'Export' : 'Export Packet'}
          </>
        )}
      </Button>
    );
  }

  if (!isExcel && onCsvExport && selectedColumns) {
    return (
      <Button
        size={compact ? 'sm' : featured ? 'default' : 'sm'}
        onClick={() => onCsvExport(selectedColumns)}
        disabled={isDisabled || isExporting}
        className={cn(fullWidth && 'w-full')}
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Exporting…
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Export
          </>
        )}
      </Button>
    );
  }

  return null;
};

/**
 * NASA-Punk export module card for a single report type.
 */
export const ReportExportModule: React.FC<ReportExportModuleProps> = ({
  config,
  recordCount,
  isLoadingCount,
  onCsvExport,
  onExcelExport,
  isExporting = false,
  canExport,
  featured = false,
}) => {
  const [selectedWorksheets, setSelectedWorksheets] = useState<WorksheetKey[]>(DEFAULT_WORKSHEETS);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() =>
    resolveInitialExportColumns(config.type),
  );

  const isDisabled = !canExport || recordCount === 0;
  const isExcel = config.format === 'excel';
  const hasWorksheetSelection = featured && isExcel;
  const hasColumnSelection = !isExcel;
  const isExportBlocked =
    isDisabled ||
    (hasWorksheetSelection && selectedWorksheets.length === 0) ||
    (hasColumnSelection && selectedColumns.length === 0);
  const iconSize = featured ? 'h-10 w-10' : 'h-8 w-8';

  const iconNode = REPORT_ICONS[config.icon] ?? <FileSpreadsheet className={iconSize} />;
  const scaledIcon = React.cloneElement(iconNode as React.ReactElement, { className: iconSize });

  const fieldSelector = hasColumnSelection ? (
    <div className="mt-3">
      <ReportColumnSelector
        reportType={config.type}
        selectedColumns={selectedColumns}
        onChange={setSelectedColumns}
      />
    </div>
  ) : null;

  const worksheetSelector = hasWorksheetSelection ? (
    <div className="mt-3">
      <WorksheetSelector
        selectedWorksheets={selectedWorksheets}
        onChange={setSelectedWorksheets}
      />
    </div>
  ) : null;

  const exportActions = (
    <ExportActions
      isExcel={isExcel}
      isDisabled={isExportBlocked}
      isExporting={isExporting}
      featured={featured}
      onCsvExport={onCsvExport}
      onExcelExport={onExcelExport}
      selectedColumns={hasColumnSelection ? selectedColumns : undefined}
      selectedWorksheets={hasWorksheetSelection ? selectedWorksheets : undefined}
      fullWidth={featured}
    />
  );

  return (
    <Card
      className={cn(
        'group flex h-full flex-col border-border/60 transition-all duration-200 hover:border-primary/50 hover:shadow-md texture-grain',
        featured && 'gradient-primary border-primary/30',
      )}
    >
      {/* Desktop */}
      <CardHeader className={cn('hidden flex-1 sm:flex sm:flex-col', featured ? 'pb-4' : 'pb-2')}>
        {featured ? (
          <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_minmax(12rem,16rem)] lg:items-stretch">
            <div className="flex min-w-0 flex-col">
              <ModuleHeader config={config} icon={scaledIcon} featured />
              <CardDescription className="mt-2 text-sm">{config.description}</CardDescription>
              {worksheetSelector}
            </div>
            <div className="flex flex-col justify-between border-border/40 lg:border-l lg:pl-6">
              <ModuleStats recordCount={recordCount} isLoadingCount={isLoadingCount} />
              <div className="mt-6">{exportActions}</div>
            </div>
          </div>
        ) : (
          <>
            <ModuleHeader config={config} icon={scaledIcon} featured={false} />
            <CardDescription className="mt-2 text-sm">{config.description}</CardDescription>
            {fieldSelector}
          </>
        )}
      </CardHeader>

      {!featured && (
        <CardContent className="mt-auto hidden pt-0 sm:block">
          <div className="flex items-end justify-between gap-3 border-t border-border/40 pt-4">
            <ModuleStats recordCount={recordCount} isLoadingCount={isLoadingCount} />
            {exportActions}
          </div>
        </CardContent>
      )}

      {/* Mobile compact */}
      <div className="flex flex-1 flex-col p-4 sm:hidden">
        <div className="flex items-start gap-3">
          <div className="shrink-0 border border-primary/20 bg-primary/10 p-2 text-primary">
            {React.cloneElement(iconNode as React.ReactElement, { className: 'h-6 w-6' })}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-sm">{config.title}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{config.description}</p>
            {fieldSelector}
            {worksheetSelector}
            <div className="mt-2">
              <ModuleStats
                recordCount={recordCount}
                isLoadingCount={isLoadingCount}
                compact
              />
            </div>
          </div>
        </div>
        <div className="mt-auto flex justify-end pt-3">
          <ExportActions
            isExcel={isExcel}
            isDisabled={isExportBlocked}
            isExporting={isExporting}
            featured={featured}
            compact
            onCsvExport={onCsvExport}
            onExcelExport={onExcelExport}
            selectedColumns={hasColumnSelection ? selectedColumns : undefined}
            selectedWorksheets={hasWorksheetSelection ? selectedWorksheets : undefined}
          />
        </div>
      </div>
    </Card>
  );
};
