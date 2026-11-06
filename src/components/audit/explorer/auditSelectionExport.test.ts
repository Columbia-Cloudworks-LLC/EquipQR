import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readPdfBlobPages } from '@vitest-harness/utils/pdf-text';
import type { FormattedAuditEntry } from '@/types/audit';
import { formatAuditEntriesMarkdown } from './auditEntryMarkdown';

const downloads = vi.hoisted(() => [] as { blob: Blob; filename: string }[]);

vi.mock('@/utils/exportUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exportUtils')>()),
  downloadBlob: (blob: Blob, filename: string) => {
    downloads.push({ blob, filename });
  },
}));

const { downloadAuditEntriesExcel, downloadAuditEntriesMarkdown, downloadAuditEntriesPdf } = await import(
  './auditSelectionExport'
);

function makeEntry(overrides: Partial<FormattedAuditEntry> = {}): FormattedAuditEntry {
  return {
    id: 'entry-1',
    organization_id: 'org-1',
    entity_type: 'inventory_item',
    entity_id: 'item-1',
    entity_name: 'Hydraulic Oil',
    action: 'UPDATE',
    actor_id: 'actor-1',
    actor_name: 'Alex Apex',
    actor_email: 'alex@apex.test',
    changes: {
      default_unit_cost: { old: 89.99, new: 42.5 },
      notes: { old: null, new: undefined },
    },
    metadata: {},
    created_at: '2026-07-07T21:58:00.000Z',
    actionLabel: 'Updated',
    entityTypeLabel: 'Inventory Item',
    formattedDate: 'Jul 7, 2026',
    relativeTime: '2 minutes ago',
    changeCount: 2,
    ...overrides,
  };
}

const bareEntry = makeEntry({
  id: 'entry-2',
  entity_id: 'item-2',
  entity_name: null,
  actor_email: null,
  action: 'DELETE',
  actionLabel: 'Deleted',
  changes: {},
  created_at: '2026-07-08T09:00:00.000Z',
});

function lastDownload() {
  expect(downloads).toHaveLength(1);
  return downloads[0]!;
}

describe('auditSelectionExport', () => {
  beforeEach(() => {
    downloads.length = 0;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 6, 9, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads the selection as Markdown', async () => {
    const entries = [makeEntry(), bareEntry];

    downloadAuditEntriesMarkdown(entries);

    const { blob, filename } = lastDownload();
    expect(filename).toBe('audit-log-selection-2026-07-09.md');
    expect(blob.type).toBe('text/markdown;charset=utf-8;');
    expect(await blob.text()).toBe(formatAuditEntriesMarkdown(entries));
  });

  describe('Excel', () => {
    async function readWorkbook() {
      const XLSX = await import('xlsx');
      const { blob, filename } = lastDownload();
      const workbook = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
      const rows = (name: string) =>
        XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name]!, { header: 1, defval: '' });
      return { filename, sheetNames: workbook.SheetNames, rows };
    }

    it('writes an entries sheet and a per-field changes sheet', async () => {
      await downloadAuditEntriesExcel([makeEntry(), bareEntry]);

      const { filename, sheetNames, rows } = await readWorkbook();
      expect(filename).toBe('audit-log-selection-2026-07-09.xlsx');
      expect(sheetNames).toEqual(['Entries', 'Field Changes']);
      expect(rows('Entries')).toEqual([
        ['Date', 'Entity Type', 'Action', 'Entity Name', 'Actor', 'Actor Email', 'Changes', 'Entry ID', 'Entity ID'],
        [
          '2026-07-07T21:58:00.000Z', 'Inventory Item', 'Updated', 'Hydraulic Oil', 'Alex Apex', 'alex@apex.test',
          'default_unit_cost: 89.99 → 42.5; notes: — → —', 'entry-1', 'item-1',
        ],
        ['2026-07-08T09:00:00.000Z', 'Inventory Item', 'Deleted', '', 'Alex Apex', '', '', 'entry-2', 'item-2'],
      ]);
      expect(rows('Field Changes')).toEqual([
        ['Date', 'Entity Name', 'Action', 'Field', 'Old Value', 'New Value', 'Entry ID'],
        ['2026-07-07T21:58:00.000Z', 'Hydraulic Oil', 'Updated', 'default_unit_cost', '89.99', '42.5', 'entry-1'],
        ['2026-07-07T21:58:00.000Z', 'Hydraulic Oil', 'Updated', 'notes', '', '', 'entry-1'],
      ]);
    });

    it('skips the changes sheet when no selected entry changed a field', async () => {
      await downloadAuditEntriesExcel([bareEntry]);

      const { sheetNames } = await readWorkbook();
      expect(sheetNames).toEqual(['Entries']);
    });

    it('uses an empty entity name for unnamed entities on the changes sheet', async () => {
      await downloadAuditEntriesExcel([makeEntry({ entity_name: null, changes: { qty: { old: 1, new: 2 } } })]);

      const { rows } = await readWorkbook();
      expect(rows('Field Changes')[1]).toEqual(['2026-07-07T21:58:00.000Z', '', 'Updated', 'qty', '1', '2', 'entry-1']);
    });
  });

  describe('PDF', () => {
    it('writes a titled summary and one block per entry', async () => {
      await downloadAuditEntriesPdf([makeEntry(), bareEntry]);

      const { blob, filename } = lastDownload();
      expect(filename).toBe('audit-log-selection-2026-07-09.pdf');
      expect(await readPdfBlobPages(blob)).toEqual([
        [
          'Audit Log Export',
          `2 entries — generated ${new Date(2026, 6, 9, 12, 0, 0).toISOString()}`,
          'Inventory Item: Hydraulic Oil — Updated',
          'Date: 2026-07-07T21:58:00.000Z',
          'Changed by: Alex Apex (alex@apex.test)',
          'Entry ID: entry-1   Entity ID: item-1',
          'Changes:',
          '• default_unit_cost: 89.99 → 42.5',
          '• notes: — → —',
          'Inventory Item: Unknown — Deleted',
          'Date: 2026-07-08T09:00:00.000Z',
          'Changed by: Alex Apex',
          'Entry ID: entry-2   Entity ID: item-2',
          'No field changes recorded.',
        ],
      ]);
    });

    it('uses the singular for a single entry', async () => {
      await downloadAuditEntriesPdf([bareEntry]);

      const pages = await readPdfBlobPages(lastDownload().blob);
      expect(pages[0]?.[1]).toMatch(/^1 entry — generated /);
    });
  });
});
