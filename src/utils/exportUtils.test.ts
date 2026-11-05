import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readPdfPages } from '@vitest-harness/utils/pdf-text';
import {
  arrayToCsv,
  createLetterPdfWriter,
  downloadBlob,
  downloadCsv,
  downloadJson,
  filenameWithDate,
  sanitizeSpreadsheetCell,
} from './exportUtils';

interface ClickedLink {
  href: string;
  download: string;
  attached: boolean;
}

describe('exportUtils', () => {
  describe('sanitizeSpreadsheetCell', () => {
    it.each(['=SUM(A1:A2)', '+1', '-1', '@cmd', '   =HYPERLINK("x")'])(
      'prefixes formula-like value %j with an apostrophe',
      (value) => {
        expect(sanitizeSpreadsheetCell(value)).toBe(`'${value}`);
      },
    );

    it.each(['Truck 101', '', '1+1', 'a=b'])('leaves plain value %j unchanged', (value) => {
      expect(sanitizeSpreadsheetCell(value)).toBe(value);
    });
  });

  describe('arrayToCsv', () => {
    it('quotes every cell, doubles embedded quotes, and neutralizes formulas', () => {
      const csv = arrayToCsv(['Name', 'Note'], [
        ['Loader "A"', '=1+1'],
        ['Forklift', 'ok, fine'],
      ]);

      expect(csv.split('\n')).toEqual([
        '"Name","Note"',
        '"Loader ""A""","\'=1+1"',
        '"Forklift","ok, fine"',
      ]);
    });

    it('returns only the header row when there are no rows', () => {
      expect(arrayToCsv(['Only'], [])).toBe('"Only"');
    });
  });

  describe('browser downloads', () => {
    const createdUrls: Blob[] = [];
    const revokedUrls: string[] = [];
    const clicks: ClickedLink[] = [];

    beforeEach(() => {
      createdUrls.length = 0;
      revokedUrls.length = 0;
      clicks.length = 0;
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: (blob: Blob) => {
          createdUrls.push(blob);
          return `blob:test/${createdUrls.length}`;
        },
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: (url: string) => {
          revokedUrls.push(url);
        },
      });
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        clicks.push({ href: this.href, download: this.download, attached: document.body.contains(this) });
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('downloadBlob clicks an attached link to the blob URL, then cleans up', () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });

      downloadBlob(blob, 'hello.txt');

      expect(clicks).toEqual([{ href: 'blob:test/1', download: 'hello.txt', attached: true }]);
      expect(createdUrls[0]).toBe(blob);
      expect(revokedUrls).toEqual(['blob:test/1']);
      expect(document.body.querySelector('a')).toBeNull();
    });

    it('downloadCsv saves the CSV text with a CSV content type', async () => {
      downloadCsv('"a","b"', 'rows.csv');

      expect(clicks[0]?.download).toBe('rows.csv');
      expect(createdUrls[0]?.type).toBe('text/csv;charset=utf-8;');
      expect(await createdUrls[0]?.text()).toBe('"a","b"');
    });

    it('downloadJson saves pretty-printed JSON', async () => {
      downloadJson({ id: 1, tags: ['x'] }, 'data.json');

      expect(clicks[0]?.download).toBe('data.json');
      expect(createdUrls[0]?.type).toBe('application/json;charset=utf-8;');
      expect(await createdUrls[0]?.text()).toBe('{\n  "id": 1,\n  "tags": [\n    "x"\n  ]\n}');
    });
  });

  describe('filenameWithDate', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('appends the local calendar date and extension', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 2, 22, 12, 0, 0));

      expect(filenameWithDate('equipment', 'csv')).toBe('equipment-2026-03-22.csv');
    });
  });

  describe('createLetterPdfWriter', () => {
    it('creates a US Letter document measured in points', async () => {
      const { doc } = await createLetterPdfWriter();

      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(612, 0);
      expect(doc.internal.pageSize.getHeight()).toBeCloseTo(792, 0);
    });

    it('writes lines in order with the requested font weight and size', async () => {
      const { writeLine, doc } = await createLetterPdfWriter();

      writeLine('Heading', { bold: true, size: 16 });
      expect(doc.getFont().fontStyle).toBe('bold');
      expect(doc.getFontSize()).toBe(16);

      writeLine('Body');
      expect(doc.getFont().fontStyle).toBe('normal');
      expect(doc.getFontSize()).toBe(10);

      expect(readPdfPages(doc.output())).toEqual([['Heading', 'Body']]);
    });

    it('wraps long text to the 520pt content width', async () => {
      const { writeLine, doc } = await createLetterPdfWriter();
      const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');

      writeLine(words);

      const [page] = readPdfPages(doc.output());
      expect(page.length).toBeGreaterThan(1);
      expect(page.join(' ')).toBe(words);
      for (const line of page) {
        expect(doc.getTextWidth(line)).toBeLessThanOrEqual(520);
      }
    });

    it('starts a new page once the cursor passes 720pt', async () => {
      const { writeLine, doc } = await createLetterPdfWriter();

      // 10pt lines advance 14pt from a 48pt margin: lines 1–49 fit (y ≤ 720).
      for (let i = 1; i <= 60; i += 1) writeLine(`Line ${i}`);

      const pages = readPdfPages(doc.output());
      expect(pages).toHaveLength(2);
      expect(pages[0]).toHaveLength(49);
      expect(pages[0]?.[48]).toBe('Line 49');
      expect(pages[1]?.[0]).toBe('Line 50');
      expect(pages[1]).toHaveLength(11);
    });

    it('addGap moves the cursor down so a page break comes sooner', async () => {
      const { writeLine, addGap, doc } = await createLetterPdfWriter();

      addGap(700);
      writeLine('First');
      writeLine('Second');

      // 48 + 700 = 748 > 720, so even the first line goes to a new page.
      expect(readPdfPages(doc.output())).toEqual([[], ['First', 'Second']]);
    });
  });
});
