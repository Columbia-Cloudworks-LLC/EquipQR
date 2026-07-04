import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import type { OperatorChecklistTemplate } from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import type {
  OperatorChecklistDataField,
  OperatorChecklistTemplateItem,
} from '@/features/operator-check-ins/types/operatorChecklist';
import {
  buildLedgerTableRows,
  DEFAULT_LEDGER_PAGE_SIZE,
  DEFAULT_LEDGER_SORT_BY,
  DEFAULT_LEDGER_SORT_ORDER,
  getLedgerDisplayDataFields,
  getLedgerPageCount,
  paginateLedgerRows,
  resolveLedgerTableTemplateData,
  sortLedgerTableRows,
  type LedgerSortOrder,
  type LedgerTableRow,
} from '@/features/operator-check-ins/utils/operatorCheckinLedgerTable';

interface OperatorCheckinLedgerTableProps {
  submissions: OperatorCheckinSubmission[];
  selectedTemplate: OperatorChecklistTemplate | null;
  /** Resets sort to defaults when the report template changes. */
  selectedTemplateId: string;
  /** Resets pagination to page 1 when date or equipment scope changes. */
  paginationScopeKey: string;
  formatDateTime: (value: string) => string;
  isLoading?: boolean;
  scopeControls: ReactNode;
  headerActions?: ReactNode;
  bodyFallback?: ReactNode;
}

function StatusBadge({ status }: { status: LedgerTableRow['status'] }) {
  return status === 'complete' ? (
    <Badge>Complete</Badge>
  ) : (
    <Badge variant="destructive">Incomplete</Badge>
  );
}

function ChecklistCell({ value, notes }: { value: unknown; notes?: unknown }) {
  if (value === 'pass') {
    return (
      <div className="space-y-0.5 text-center">
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
          Pass
        </Badge>
        {typeof notes === 'string' && notes ? (
          <p className="text-xs text-muted-foreground">{notes}</p>
        ) : null}
      </div>
    );
  }
  if (value === 'fail') {
    return (
      <div className="space-y-0.5 text-center">
        <Badge variant="destructive">Fail</Badge>
        {typeof notes === 'string' && notes ? (
          <p className="text-xs text-muted-foreground">{notes}</p>
        ) : null}
      </div>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function ChecklistValue({ value, notes }: { value: unknown; notes?: unknown }) {
  if (value === 'pass') {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
          Pass
        </Badge>
        {typeof notes === 'string' && notes ? (
          <span className="text-muted-foreground">{notes}</span>
        ) : null}
      </span>
    );
  }
  if (value === 'fail') {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <Badge variant="destructive">Fail</Badge>
        {typeof notes === 'string' && notes ? (
          <span className="text-muted-foreground">{notes}</span>
        ) : null}
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function LedgerFieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,42%)_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-foreground">{children}</dd>
    </div>
  );
}

function LedgerSubmissionCard({
  row,
  dataFields,
  checklistItems,
}: {
  row: LedgerTableRow;
  dataFields: OperatorChecklistDataField[];
  checklistItems: OperatorChecklistTemplateItem[];
}) {
  return (
    <article
      className="rounded-lg border border-border/60 bg-card p-4 shadow-sm touch-manipulation"
      aria-label={`${row.equipmentName} check-in`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{row.equipmentName}</h3>
          <p className="text-sm text-muted-foreground">{row.submittedAt}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <dl className="space-y-2">
        {dataFields.map((field) => (
          <LedgerFieldRow key={field.id} label={field.label}>
            {String(row[`field_${field.id}`] ?? '—')}
          </LedgerFieldRow>
        ))}
        {checklistItems.map((item) => (
          <LedgerFieldRow key={item.id} label={item.title}>
            <ChecklistValue
              value={row[`checklist_${item.id}`]}
              notes={row[`checklist_${item.id}_notes`]}
            />
          </LedgerFieldRow>
        ))}
      </dl>
    </article>
  );
}

function LedgerPaginationFooter({
  totalRows,
  completeCount,
  page,
  pageSize,
  onPageChange,
}: {
  totalRows: number;
  completeCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = getLedgerPageCount(totalRows, pageSize);
  const rangeStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalRows);

  return (
    <div
      className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="ledger-pagination-footer"
    >
      <p className="text-sm text-muted-foreground">
        {totalRows} submission{totalRows === 1 ? '' : 's'} · {completeCount} complete
        {totalRows > 0 ? (
          <>
            {' '}
            · Showing {rangeStart}–{rangeEnd}
          </>
        ) : null}
      </p>

      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function OperatorCheckinLedgerTable({
  submissions,
  selectedTemplate,
  selectedTemplateId,
  paginationScopeKey,
  formatDateTime,
  isLoading = false,
  scopeControls,
  headerActions,
  bodyFallback,
}: OperatorCheckinLedgerTableProps) {
  const [sortBy, setSortBy] = useState(DEFAULT_LEDGER_SORT_BY);
  const [sortOrder, setSortOrder] = useState<LedgerSortOrder>(DEFAULT_LEDGER_SORT_ORDER);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSortBy(DEFAULT_LEDGER_SORT_BY);
    setSortOrder(DEFAULT_LEDGER_SORT_ORDER);
  }, [selectedTemplateId]);

  useEffect(() => {
    setPage(1);
  }, [selectedTemplateId, paginationScopeKey]);

  const templateData = useMemo(
    () => resolveLedgerTableTemplateData(selectedTemplate, submissions),
    [selectedTemplate, submissions],
  );

  const displayDataFields = useMemo(
    () => getLedgerDisplayDataFields(templateData),
    [templateData],
  );

  const rows = useMemo(
    () => buildLedgerTableRows(submissions, templateData, formatDateTime),
    [submissions, templateData, formatDateTime],
  );

  const sortedRows = useMemo(
    () => sortLedgerTableRows(rows, sortBy, sortOrder, templateData),
    [rows, sortBy, sortOrder, templateData],
  );

  const totalPages = getLedgerPageCount(sortedRows.length, DEFAULT_LEDGER_PAGE_SIZE);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const paginatedRows = useMemo(
    () => paginateLedgerRows(sortedRows, safePage, DEFAULT_LEDGER_PAGE_SIZE),
    [sortedRows, safePage],
  );

  const columns = useMemo<Column<LedgerTableRow>[]>(() => {
    const cols: Column<LedgerTableRow>[] = [
      {
        key: 'equipmentName',
        title: 'Equipment',
        width: '220px',
        sortable: true,
        render: (value) => <span className="font-medium">{String(value ?? '—')}</span>,
      },
      {
        key: 'submittedAtIso',
        title: 'Submitted',
        width: '160px',
        mono: true,
        sortable: true,
        render: (_value, row) => row.submittedAt,
      },
    ];

    for (const field of displayDataFields) {
      cols.push({
        key: `field_${field.id}`,
        title: field.label,
        sortable: true,
        mono: field.inputType === 'number',
        align: field.inputType === 'number' ? 'right' : 'left',
        render: (value) => String(value ?? '—'),
      });
    }

    for (const item of templateData.checklistItems) {
      cols.push({
        key: `checklist_${item.id}`,
        title: item.title,
        width: '140px',
        align: 'center',
        sortable: true,
        render: (value, row) => (
          <ChecklistCell value={value} notes={row[`checklist_${item.id}_notes`]} />
        ),
      });
    }

    cols.push({
      key: 'status',
      title: 'Status',
      width: '110px',
      align: 'center',
      sortable: true,
      render: (value) => <StatusBadge status={value as LedgerTableRow['status']} />,
    });

    return cols;
  }, [displayDataFields, templateData.checklistItems]);

  const completeCount = submissions.filter((submission) => submission.is_complete).length;
  const hasRows = sortedRows.length > 0;

  const handleSortChange = (nextSortBy: string, nextSortOrder: LedgerSortOrder) => {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  };

  return (
    <Card data-testid="operator-checkin-ledger">
      <CardHeader className="gap-4 space-y-0 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-base">Daily ledger</CardTitle>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
          ) : null}
        </div>

        <div
          className="rounded-lg border border-border/60 bg-muted/20 p-3 sm:p-4"
          data-testid="ledger-scope-toolbar"
        >
          {scopeControls}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading ledger…</p>
        ) : bodyFallback ? (
          bodyFallback
        ) : hasRows ? (
          <>
            <div className="md:hidden space-y-3" data-testid="ledger-mobile-list">
              {paginatedRows.map((row) => (
                <LedgerSubmissionCard
                  key={row.id}
                  row={row}
                  dataFields={displayDataFields}
                  checklistItems={templateData.checklistItems}
                />
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto" data-testid="ledger-desktop-table">
              <DataTable
                data={paginatedRows}
                columns={columns}
                density="compact"
                stickyHeader
                freezeFirstColumn
                maxBodyHeight="55vh"
                sorting={{
                  sortBy,
                  sortOrder,
                  onSortChange: handleSortChange,
                }}
                emptyMessage="No operator check-ins for the selected scope."
                className="min-w-full rounded-md border"
              />
            </div>

            <LedgerPaginationFooter
              totalRows={sortedRows.length}
              completeCount={completeCount}
              page={safePage}
              pageSize={DEFAULT_LEDGER_PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No operator check-ins for the selected scope.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
