/**
 * Export services for the audit explorer's multi-select bulk actions (#1166).
 * Selected entries can be downloaded as Markdown, Excel, or PDF. Heavy
 * libraries (xlsx / jspdf) are loaded on demand.
 */

import { FormattedAuditEntry } from '@/types/audit';
import { downloadBlob, filenameWithDate, createLetterPdfWriter } from '@/utils/exportUtils';
import { formatIsoZulu } from '@/utils/dateFormatter';
import { formatAuditEntriesMarkdown } from './auditEntryMarkdown';

function changesSummaryText(entry: FormattedAuditEntry): string {
  return Object.entries(entry.changes)
    .map(([field, change]) => {
      const oldText = change.old === null || change.old === undefined ? '—' : String(change.old);
      const newText = change.new === null || change.new === undefined ? '—' : String(change.new);
      return `${field}: ${oldText} → ${newText}`;
    })
    .join('; ');
}

export function downloadAuditEntriesMarkdown(entries: FormattedAuditEntry[]): void {
  const markdown = formatAuditEntriesMarkdown(entries);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  downloadBlob(blob, filenameWithDate('audit-log-selection', 'md'));
}

export async function downloadAuditEntriesExcel(entries: FormattedAuditEntry[]): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  const entryRows = entries.map((entry) => [
    formatIsoZulu(entry.created_at),
    entry.entityTypeLabel,
    entry.actionLabel,
    entry.entity_name ?? '',
    entry.actor_name,
    entry.actor_email ?? '',
    changesSummaryText(entry),
    entry.id,
    entry.entity_id,
  ]);
  const entriesSheet = XLSX.utils.aoa_to_sheet([
    ['Date', 'Entity Type', 'Action', 'Entity Name', 'Actor', 'Actor Email', 'Changes', 'Entry ID', 'Entity ID'],
    ...entryRows,
  ]);
  XLSX.utils.book_append_sheet(workbook, entriesSheet, 'Entries');

  const changeRows = entries.flatMap((entry) =>
    Object.entries(entry.changes).map(([field, change]) => [
      formatIsoZulu(entry.created_at),
      entry.entity_name ?? '',
      entry.actionLabel,
      field,
      change.old === null || change.old === undefined ? '' : String(change.old),
      change.new === null || change.new === undefined ? '' : String(change.new),
      entry.id,
    ]),
  );
  if (changeRows.length > 0) {
    const changesSheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Entity Name', 'Action', 'Field', 'Old Value', 'New Value', 'Entry ID'],
      ...changeRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, changesSheet, 'Field Changes');
  }

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filenameWithDate('audit-log-selection', 'xlsx'));
}

export async function downloadAuditEntriesPdf(entries: FormattedAuditEntry[]): Promise<void> {
  const { writeLine, addGap, doc } = await createLetterPdfWriter();

  writeLine('Audit Log Export', { bold: true, size: 16 });
  addGap(4);
  writeLine(
    `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} — generated ${formatIsoZulu(new Date().toISOString())}`,
  );
  addGap(10);

  for (const entry of entries) {
    writeLine(
      `${entry.entityTypeLabel}: ${entry.entity_name ?? 'Unknown'} — ${entry.actionLabel}`,
      { bold: true, size: 12 },
    );
    writeLine(`Date: ${formatIsoZulu(entry.created_at)}`);
    writeLine(
      `Changed by: ${entry.actor_name}${entry.actor_email ? ` (${entry.actor_email})` : ''}`,
    );
    writeLine(`Entry ID: ${entry.id}   Entity ID: ${entry.entity_id}`);

    const changeEntries = Object.entries(entry.changes);
    if (changeEntries.length > 0) {
      writeLine('Changes:', { bold: true });
      for (const [field, change] of changeEntries) {
        const oldText = change.old === null || change.old === undefined ? '—' : String(change.old);
        const newText = change.new === null || change.new === undefined ? '—' : String(change.new);
        writeLine(`• ${field}: ${oldText} → ${newText}`);
      }
    } else {
      writeLine('No field changes recorded.');
    }
    addGap(10);
  }

  downloadBlob(doc.output('blob'), filenameWithDate('audit-log-selection', 'pdf'));
}
