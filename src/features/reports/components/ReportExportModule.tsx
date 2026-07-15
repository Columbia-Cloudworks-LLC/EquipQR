import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  Zap,
  Settings2,
  Columns3,
  Table2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportCardConfig } from '@/features/reports/types/reports';
import { WORKSHEET_NAMES } from '@/features/work-orders/types/workOrderExcel';

const EXPORT_ROW_LIMIT = 50_000;
const WORKSHEET_COUNT = Object.values(WORKSHEET_NAMES).length;

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
  onExport: () => void;
  onQuickExport: () => void;
  canExport: boolean;
  featured?: boolean;
}

type StatusVariant = 'default' | 'secondary' | 'outline' | 'destructive';

function getStatusMeta(
  recordCount: number,
  isLoadingCount: boolean,
): { label: string; variant: StatusVariant } {
  if (isLoadingCount) {
    return { label: 'COUNTING', variant: 'outline' };
  }
  if (recordCount === 0) {
    return { label: 'NO DATA', variant: 'secondary' };
  }
  if (recordCount > EXPORT_ROW_LIMIT) {
    return { label: 'LIMITED', variant: 'destructive' };
  }
  return {
    label: `${recordCount.toLocaleString()} READY`,
    variant: 'default',
  };
}

interface ModuleHeaderProps {
  config: ReportCardConfig;
  statusLabel: string;
  statusVariant: StatusVariant;
  icon: React.ReactNode;
  featured: boolean;
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  config,
  statusLabel,
  statusVariant,
  icon,
  featured,
}) => (
  <div className="flex min-w-0 items-start gap-3">
    <div
      className={cn(
        'shrink-0 border border-primary/20 bg-primary/10 p-2 text-primary transition-transform duration-200 group-hover:scale-105',
        featured && 'p-3',
      )}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1 space-y-1">
      <Badge variant={statusVariant} className="font-mono text-[10px] uppercase">
        {statusLabel}
      </Badge>
      <CardTitle className={cn('text-lg', featured && 'text-xl')}>{config.title}</CardTitle>
    </div>
  </div>
);

interface ModuleMetadataProps {
  config: ReportCardConfig;
  featured: boolean;
}

/** Preview chips with a clear visual hierarchy. */
const ModuleMetadata: React.FC<ModuleMetadataProps> = ({ config, featured }) => (
  <div className="mt-3 flex min-h-21 flex-col justify-end gap-2.5">
    {featured && config.format === 'excel' && (
      <div className="border border-border/60 bg-muted/20 p-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Worksheets included
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(WORKSHEET_NAMES).map((name) => (
            <Badge
              key={name}
              variant="secondary"
              className="bg-muted/60 text-[10px] font-normal text-muted-foreground"
            >
              {name}
            </Badge>
          ))}
        </div>
      </div>
    )}

    {!featured && config.previewFields.length > 0 && (
      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
          Key fields
        </p>
        <div className="flex flex-wrap gap-1.5">
          {config.previewFields.map((field) => (
            <Badge
              key={field}
              variant="secondary"
              className="bg-secondary/50 text-[10px] font-normal text-muted-foreground"
            >
              {field}
            </Badge>
          ))}
        </div>
      </div>
    )}
  </div>
);

interface ModuleStatsProps {
  recordCount: number;
  isLoadingCount: boolean;
  config: ReportCardConfig;
  featured: boolean;
  compact?: boolean;
}

const ModuleStats: React.FC<ModuleStatsProps> = ({
  recordCount,
  isLoadingCount,
  config,
  featured,
  compact,
}) => {
  const showWorksheets = featured && config.format === 'excel';

  return (
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
      <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
        {showWorksheets ? (
          <>
            <Table2 className="h-3 w-3" aria-hidden />
            <span className="font-tabular">{WORKSHEET_COUNT} WORKSHEETS</span>
          </>
        ) : (
          <>
            <Columns3 className="h-3 w-3" aria-hidden />
            <span className="font-tabular">{config.columnCount} FIELDS</span>
          </>
        )}
      </div>
      {recordCount > EXPORT_ROW_LIMIT && !isLoadingCount && (
        <p className="text-[10px] text-warning">Export capped at 50,000 rows</p>
      )}
    </div>
  );
};

/**
 * NASA-Punk export module card for a single report type.
 */
export const ReportExportModule: React.FC<ReportExportModuleProps> = ({
  config,
  recordCount,
  isLoadingCount,
  onExport,
  onQuickExport,
  canExport,
  featured = false,
}) => {
  const isDisabled = !canExport || recordCount === 0;
  const isExcel = config.format === 'excel';
  const { label: statusLabel, variant: statusVariant } = getStatusMeta(recordCount, isLoadingCount);
  const iconSize = featured ? 'h-10 w-10' : 'h-8 w-8';

  const iconNode = REPORT_ICONS[config.icon] ?? <FileSpreadsheet className={iconSize} />;
  const scaledIcon = React.cloneElement(iconNode as React.ReactElement, { className: iconSize });

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
              <ModuleHeader
                config={config}
                statusLabel={statusLabel}
                statusVariant={statusVariant}
                icon={scaledIcon}
                featured
              />
              <CardDescription className="mt-2 text-sm">{config.description}</CardDescription>
              <ModuleMetadata config={config} featured />
            </div>
            <div className="flex flex-col justify-between border-border/40 lg:border-l lg:pl-6">
              <ModuleStats
                recordCount={recordCount}
                isLoadingCount={isLoadingCount}
                config={config}
                featured
              />
              <div className="mt-6">
                <ExportActions
                  isExcel={isExcel}
                  isDisabled={isDisabled}
                  featured
                  onExport={onExport}
                  onQuickExport={onQuickExport}
                  fullWidth
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <ModuleHeader
              config={config}
              statusLabel={statusLabel}
              statusVariant={statusVariant}
              icon={scaledIcon}
              featured={false}
            />
            <CardDescription className="mt-2 text-sm">{config.description}</CardDescription>
            <ModuleMetadata config={config} featured={false} />
          </>
        )}
      </CardHeader>

      {!featured && (
        <CardContent className="mt-auto hidden pt-0 sm:block">
          <div className="flex items-end justify-between gap-3 border-t border-border/40 pt-4">
            <ModuleStats
              recordCount={recordCount}
              isLoadingCount={isLoadingCount}
              config={config}
              featured={false}
            />
            <ExportActions
              isExcel={isExcel}
              isDisabled={isDisabled}
              featured={false}
              onExport={onExport}
              onQuickExport={onQuickExport}
            />
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant} className="text-[10px]">
                {statusLabel}
              </Badge>
            </div>
            <h3 className="mt-1 truncate font-semibold text-sm">{config.title}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{config.description}</p>
            <div className="mt-2">
              <ModuleStats
                recordCount={recordCount}
                isLoadingCount={isLoadingCount}
                config={config}
                featured={featured}
                compact
              />
            </div>
          </div>
        </div>
        <div className="mt-auto flex justify-end pt-3">
          <ExportActions
            isExcel={isExcel}
            isDisabled={isDisabled}
            featured={featured}
            compact
            onExport={onExport}
            onQuickExport={onQuickExport}
          />
        </div>
      </div>
    </Card>
  );
};

interface ExportActionsProps {
  isExcel: boolean;
  isDisabled: boolean;
  featured: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  onExport: () => void;
  onQuickExport: () => void;
}

const ExportActions: React.FC<ExportActionsProps> = ({
  isExcel,
  isDisabled,
  featured,
  compact,
  fullWidth,
  onExport,
  onQuickExport,
}) => {
  if (isExcel) {
    return (
      <Button
        size={compact ? 'sm' : featured ? 'default' : 'sm'}
        onClick={onExport}
        disabled={isDisabled}
        className={cn(fullWidth && 'w-full')}
      >
        <Download className="h-4 w-4 mr-2" aria-hidden />
        {compact ? 'Export' : 'Configure Export'}
      </Button>
    );
  }

  if (compact) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onQuickExport}
          disabled={isDisabled}
          aria-label="Quick export"
        >
          <Zap className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onExport} disabled={isDisabled} aria-label="Customize export">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" variant="outline" onClick={onQuickExport} disabled={isDisabled}>
        <Zap className="h-4 w-4 mr-1.5" aria-hidden />
        Quick
      </Button>
      <Button size="sm" onClick={onExport} disabled={isDisabled}>
        <Settings2 className="h-4 w-4 mr-1.5" aria-hidden />
        Customize
      </Button>
    </div>
  );
};
