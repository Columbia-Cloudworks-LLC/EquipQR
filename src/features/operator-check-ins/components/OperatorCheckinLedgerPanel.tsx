import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOperatorCheckinSubmissions } from '@/features/operator-check-ins/hooks/useOperatorCheckinSubmissions';
import { useOrganizationOperatorCheckinAssignments } from '@/features/operator-check-ins/hooks/useOperatorCheckinSettings';
import { useOperatorChecklistTemplates } from '@/features/operator-check-ins/hooks/useOperatorChecklistTemplates';
import { OperatorCheckinLedgerEquipmentSelector } from '@/features/operator-check-ins/components/OperatorCheckinLedgerEquipmentSelector';
import { OperatorCheckinLedgerDateRangePicker } from '@/features/operator-check-ins/components/OperatorCheckinLedgerDateRangePicker';
import { OperatorCheckinLedgerTable } from '@/features/operator-check-ins/components/OperatorCheckinLedgerTable';
import { OperatorCheckinReportExportDialog } from '@/features/operator-check-ins/components/OperatorCheckinReportExportDialog';
import { downloadOperatorCheckinDailyReport } from '@/features/operator-check-ins/services/operatorCheckinReportExcelService';
import type { OperatorCheckinReportExportOptions } from '@/features/operator-check-ins/services/operatorCheckinReportExportOptions';
import {
  buildEquipmentScopeLabel,
  buildLedgerSubmissionFilters,
  createDefaultLedgerDateRange,
  filterVisibleOperatorCheckinTemplates,
  formatLedgerDateRangeLabel,
  getAssignedEquipmentForTemplate,
  getReportTemplatesForEquipment,
  isEquipmentAssignedToTemplate,
  isLedgerQueryEnabled,
  normalizeLedgerDateRange,
} from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useAppToast } from '@/hooks/useAppToast';
import { cn } from '@/lib/utils';

interface OperatorCheckinLedgerPanelProps {
  organizationId: string;
  equipmentId?: string;
  equipmentName?: string;
  showDeletedCheckins?: boolean;
  onShowDeletedCheckinsChange?: (value: boolean) => void;
}

const TEMPLATE_SELECT_ID = 'report-template-select';
const TEMPLATE_LABEL_ID = 'report-template-label';

function LedgerEmptyMessage({ children }: { children: ReactNode }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
  );
}

export function OperatorCheckinLedgerPanel({
  organizationId,
  equipmentId,
  equipmentName,
  showDeletedCheckins: showDeletedCheckinsProp,
  onShowDeletedCheckinsChange,
}: OperatorCheckinLedgerPanelProps) {
  const isEquipmentScoped = Boolean(equipmentId);
  const { formatDateTime } = useFormatTimestamp();
  const { toast } = useAppToast();
  const defaultDateRange = useMemo(() => createDefaultLedgerDateRange(), []);
  const [startDate, setStartDate] = useState(defaultDateRange.startDate);
  const [endDate, setEndDate] = useState(defaultDateRange.endDate);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [internalShowDeletedCheckins, setInternalShowDeletedCheckins] = useState(false);
  const showDeletedCheckins = showDeletedCheckinsProp ?? internalShowDeletedCheckins;
  const setShowDeletedCheckins = onShowDeletedCheckinsChange ?? setInternalShowDeletedCheckins;
  const isShowDeletedControlled = showDeletedCheckinsProp !== undefined;

  const dateRange = useMemo(
    () => normalizeLedgerDateRange(startDate, endDate),
    [startDate, endDate],
  );

  const { data: templates = [], isLoading: isTemplatesLoading } =
    useOperatorChecklistTemplates(organizationId);
  const { data: assignments = [], isLoading: isAssignmentsLoading } =
    useOrganizationOperatorCheckinAssignments(organizationId);

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.is_active),
    [templates],
  );

  const reportTemplates = useMemo(() => {
    const scopedTemplates = isEquipmentScoped
      ? getReportTemplatesForEquipment(templates, assignments, equipmentId)
      : templates;
    return filterVisibleOperatorCheckinTemplates(scopedTemplates, showDeletedCheckins);
  }, [assignments, equipmentId, isEquipmentScoped, showDeletedCheckins, templates]);

  useEffect(() => {
    if (!selectedTemplateId) return;
    if (reportTemplates.some((template) => template.id === selectedTemplateId)) return;
    setSelectedTemplateId('');
  }, [reportTemplates, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => reportTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [reportTemplates, selectedTemplateId],
  );

  const includeDisabledAssignments = selectedTemplate?.is_active === false;

  const assignedEquipmentOptions = useMemo(
    () =>
      getAssignedEquipmentForTemplate(assignments, selectedTemplateId || undefined, {
        includeDisabledAssignments,
      }),
    [assignments, selectedTemplateId, includeDisabledAssignments],
  );

  useEffect(() => {
    if (selectedTemplateId) return;
    const autoSelectTemplates = isEquipmentScoped
      ? reportTemplates.filter((template) => template.is_active)
      : activeTemplates;
    if (autoSelectTemplates.length !== 1) return;
    setSelectedTemplateId(autoSelectTemplates[0].id);
  }, [activeTemplates, isEquipmentScoped, reportTemplates, selectedTemplateId]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedEquipmentIds([]);
      return;
    }

    if (isEquipmentScoped && equipmentId) {
      const includeDisabledAssignments = selectedTemplate?.is_active === false;
      setSelectedEquipmentIds(
        isEquipmentAssignedToTemplate(
          assignments,
          equipmentId,
          selectedTemplateId,
          includeDisabledAssignments,
        )
          ? [equipmentId]
          : [],
      );
      return;
    }

    const assignedIds = getAssignedEquipmentForTemplate(assignments, selectedTemplateId, {
      includeDisabledAssignments: selectedTemplate?.is_active === false,
    }).map((option) => option.equipmentId);
    setSelectedEquipmentIds(assignedIds);
  }, [
    assignments,
    equipmentId,
    isEquipmentScoped,
    selectedTemplate?.is_active,
    selectedTemplateId,
  ]);

  const submissionFilters = useMemo(
    () =>
      buildLedgerSubmissionFilters(
        dateRange.startDate,
        dateRange.endDate,
        selectedTemplateId || undefined,
        selectedEquipmentIds,
      ),
    [dateRange.startDate, dateRange.endDate, selectedTemplateId, selectedEquipmentIds],
  );

  const queryEnabled = isLedgerQueryEnabled(submissionFilters);
  const { data: submissions = [], isLoading: isSubmissionsLoading } = useOperatorCheckinSubmissions(
    organizationId,
    submissionFilters ?? { from: undefined, to: undefined },
    queryEnabled,
  );

  const equipmentLabel = useMemo(() => {
    if (isEquipmentScoped && equipmentName) return equipmentName;
    return buildEquipmentScopeLabel(assignedEquipmentOptions, selectedEquipmentIds);
  }, [
    assignedEquipmentOptions,
    equipmentName,
    isEquipmentScoped,
    selectedEquipmentIds,
  ]);

  const reportDateRangeLabel = useMemo(
    () => formatLedgerDateRangeLabel(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate, dateRange.endDate],
  );

  const isScopeLoading = isTemplatesLoading || isAssignmentsLoading;
  const canExport = Boolean(
    selectedTemplate &&
    selectedEquipmentIds.length > 0 &&
    submissions.length > 0 &&
    !isSubmissionsLoading,
  );

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value && endDate && value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    if (value && startDate && value < startDate) {
      setStartDate(value);
    }
    setEndDate(value);
  };

  const handleExport = async (options: OperatorCheckinReportExportOptions) => {
    if (!selectedTemplate) return;
    try {
      await downloadOperatorCheckinDailyReport(
        submissions,
        dateRange,
        selectedTemplate.name,
        equipmentLabel,
        options,
      );
      toast({
        title: 'Export complete',
        description: options.format === 'xlsx'
          ? 'Daily check-in workbook downloaded.'
          : 'Daily check-in PDF downloaded.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export daily report.';
      toast({
        title: 'Export failed',
        description: message,
        variant: 'error',
      });
      throw error;
    }
  };

  function resolveBodyFallback(): ReactNode | undefined {
    if (isScopeLoading) {
      return <LedgerEmptyMessage>Loading report scope…</LedgerEmptyMessage>;
    }
    if (isEquipmentScoped && reportTemplates.length === 0) {
      return (
        <LedgerEmptyMessage>
          No daily check-in reports are assigned to this equipment yet.
        </LedgerEmptyMessage>
      );
    }
    if (!selectedTemplateId) {
      return (
        <LedgerEmptyMessage>
          Select a report template to review daily check-ins.
        </LedgerEmptyMessage>
      );
    }
    if (assignedEquipmentOptions.length === 0) {
      return (
        <LedgerEmptyMessage>
          No equipment is assigned to {selectedTemplate?.name ?? 'this report template'} yet.
        </LedgerEmptyMessage>
      );
    }
    if (selectedEquipmentIds.length === 0) {
      return (
        <LedgerEmptyMessage>
          Select at least one equipment record to review submissions.
        </LedgerEmptyMessage>
      );
    }
    if (!queryEnabled || isSubmissionsLoading) {
      return undefined;
    }
    if (submissions.length === 0) {
      return (
        <LedgerEmptyMessage>
          No operator check-ins for the selected date range, report template, and equipment scope.
        </LedgerEmptyMessage>
      );
    }
    return undefined;
  }

  const scopeControls = (
    <div className="space-y-3">
      {!isShowDeletedControlled && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2">
          <Label htmlFor="show-deleted-checkins-ledger" className="text-sm font-normal">
            Show deleted check-ins
          </Label>
          <Switch
            id="show-deleted-checkins-ledger"
            checked={showDeletedCheckins}
            onCheckedChange={setShowDeletedCheckins}
            aria-label="Show deleted check-ins"
          />
        </div>
      )}

      <div
        className={cn(
          'grid gap-3',
          isEquipmentScoped ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4',
        )}
      >
      <div className="space-y-1.5">
        <Label id={TEMPLATE_LABEL_ID} htmlFor={TEMPLATE_SELECT_ID} className="text-xs">
          Report template
        </Label>
        <Select
          value={selectedTemplateId}
          onValueChange={setSelectedTemplateId}
          disabled={isTemplatesLoading || reportTemplates.length === 0}
        >
          <SelectTrigger id={TEMPLATE_SELECT_ID} aria-labelledby={TEMPLATE_LABEL_ID}>
            <SelectValue placeholder="Select report template" />
          </SelectTrigger>
          <SelectContent>
            {reportTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.is_active ? template.name : `${template.name} (deleted)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OperatorCheckinLedgerDateRangePicker
        className={isEquipmentScoped ? undefined : 'sm:col-span-2 xl:col-span-2'}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
      />

      {!isEquipmentScoped && (
        <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
          <Label className="text-xs">Equipment records</Label>
          <OperatorCheckinLedgerEquipmentSelector
            options={assignedEquipmentOptions}
            selectedEquipmentIds={selectedEquipmentIds}
            onSelectedEquipmentIdsChange={setSelectedEquipmentIds}
            disabled={!selectedTemplateId || isAssignmentsLoading}
          />
        </div>
      )}
    </div>
    </div>
  );

  const bodyFallback = resolveBodyFallback();

  const paginationScopeKey = useMemo(
    () =>
      `${dateRange.startDate}|${dateRange.endDate}|${[...selectedEquipmentIds].sort().join(',')}`,
    [dateRange.startDate, dateRange.endDate, selectedEquipmentIds],
  );

  return (
    <>
      <OperatorCheckinLedgerTable
        submissions={submissions}
        selectedTemplate={selectedTemplate}
        selectedTemplateId={selectedTemplateId}
        paginationScopeKey={paginationScopeKey}
        formatDateTime={formatDateTime}
        isLoading={queryEnabled && isSubmissionsLoading}
        scopeControls={scopeControls}
        bodyFallback={bodyFallback}
        headerActions={
          <Button
            variant="outline"
            size="sm"
            disabled={!canExport}
            onClick={() => setExportDialogOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Export
          </Button>
        }
      />

      <OperatorCheckinReportExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        reportDateRangeLabel={reportDateRangeLabel}
        templateName={selectedTemplate?.name ?? 'No report selected'}
        equipmentLabel={equipmentLabel}
        submissions={submissions}
        onExport={handleExport}
      />
    </>
  );
}
