/**
 * AuditLogBulkActionsPanel — replaces the single-entry detail panel when
 * multiple audit entries are selected (#1166). A group of entries cannot be
 * individualized, so this pane offers bulk actions instead: export the
 * selection as Markdown, Excel, or PDF.
 */

import React, { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Layers, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/utils/logger';
import { FormattedAuditEntry } from '@/types/audit';
import {
  downloadAuditEntriesExcel,
  downloadAuditEntriesMarkdown,
  downloadAuditEntriesPdf,
} from './auditSelectionExport';

export interface AuditLogBulkActionsPanelProps {
  entries: FormattedAuditEntry[];
  onClearSelection: () => void;
  canExport: boolean;
}

type BulkExportFormat = 'markdown' | 'excel' | 'pdf';

export function AuditLogBulkActionsPanel({
  entries,
  onClearSelection,
  canExport,
}: AuditLogBulkActionsPanelProps) {
  const [exporting, setExporting] = useState<BulkExportFormat | null>(null);

  const runExport = async (format: BulkExportFormat) => {
    if (!canExport || exporting) return;
    setExporting(format);
    try {
      if (format === 'markdown') {
        downloadAuditEntriesMarkdown(entries);
      } else if (format === 'excel') {
        await downloadAuditEntriesExcel(entries);
      } else {
        await downloadAuditEntriesPdf(entries);
      }
      toast.success(`Exported ${entries.length} entries`);
    } catch (error) {
      logger.error('Audit bulk export failed', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      data-testid="audit-bulk-actions-panel"
    >
      <div className="px-5 pt-4 pb-3 border-b shrink-0 flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
        <h2 className="text-sm font-semibold leading-tight">
          {entries.length} entries selected
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 px-2 text-xs"
          onClick={onClearSelection}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      </div>

      <div className="px-5 py-4 space-y-4 overflow-y-auto">
        <p className="text-xs text-muted-foreground">
          Multiple entries are selected, so this pane works on the group.
          Export the selected log entries or clear the selection to inspect a
          single entry.
        </p>

        {canExport ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Export selection
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={exporting !== null}
                onClick={() => runExport('markdown')}
              >
                <FileText className="h-4 w-4 mr-2" />
                {exporting === 'markdown' ? 'Exporting…' : 'Markdown (.md)'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={exporting !== null}
                onClick={() => runExport('excel')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {exporting === 'excel' ? 'Exporting…' : 'Excel (.xlsx)'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={exporting !== null}
                onClick={() => runExport('pdf')}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {exporting === 'pdf' ? 'Exporting…' : 'PDF (.pdf)'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Exports are available to organization owners and administrators.
          </p>
        )}

        <Separator />

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            Tip: use the row checkboxes, Ctrl/Cmd-click to toggle, or
            Shift-click to select a range.
          </p>
        </div>
      </div>
    </div>
  );
}
