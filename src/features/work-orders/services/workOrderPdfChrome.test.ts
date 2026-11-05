import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { countPdfImages, countPdfLineSegments, readPdfPages } from '@vitest-harness/utils/pdf-text';
import { makeWorkOrderPdfData, WIDE_PNG_DATA_URL } from '@vitest-harness/fixtures/workOrderPdf';
import {
  applyWorkOrderPdfPageChrome,
  formatWorkOrderIdForPdf,
  renderWorkOrderPdfFooterQRStrip,
  renderWorkOrderPdfPageHeader,
  type WorkOrderPdfPageLayout,
} from './workOrderPdfChrome';

const LAYOUT: WorkOrderPdfPageLayout = { margin: 20, pageWidth: 210, footerY: 255, qrSize: 20 };
const GENERATED = 'Document generated: 03/22/2026 7:00 AM';
const DISCLAIMER =
  'Field worksheet only — all results must be entered into EquipQR as the official record';

const qr = (targetUrl: string) => ({ targetUrl, dataUrl: WIDE_PNG_DATA_URL });

describe('workOrderPdfChrome', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('formatWorkOrderIdForPdf', () => {
    it('returns short ids unchanged', () => {
      expect(formatWorkOrderIdForPdf('abcd1234')).toBe('abcd1234');
      expect(formatWorkOrderIdForPdf('short')).toBe('short');
    });

    it('truncates long ids to first4...last4', () => {
      expect(formatWorkOrderIdForPdf('660e8400-e29b-41d4-a716-446655440000')).toBe(
        '660e...0000',
      );
    });
  });

  describe('renderWorkOrderPdfPageHeader', () => {
    const identity = { workOrderLabel: 'WO: Replace hose', equipmentLabel: 'Loader 7 (S/N 123)' };

    it('shows only the page counter on page 1, even with identity labels', () => {
      const doc = new jsPDF();
      renderWorkOrderPdfPageHeader(doc, LAYOUT, makeWorkOrderPdfData({ pageIdentity: identity }), 1, 3);

      expect(readPdfPages(doc.output())).toEqual([['Page 1 of 3']]);
      expect(countPdfLineSegments(doc.output())).toBe(0);
      expect(doc.getTextColor()).toBe('#000000');
    });

    it('repeats work order and equipment labels with a separator on later pages', () => {
      const doc = new jsPDF();
      renderWorkOrderPdfPageHeader(doc, LAYOUT, makeWorkOrderPdfData({ pageIdentity: identity }), 2, 3);

      expect(readPdfPages(doc.output())).toEqual([
        ['Page 2 of 3', 'WO: Replace hose', 'Loader 7 (S/N 123)'],
      ]);
      expect(countPdfLineSegments(doc.output())).toBe(1);
      expect(doc.getTextColor()).toBe('#000000');
    });

    it('omits the equipment line when there is no equipment label', () => {
      const doc = new jsPDF();
      renderWorkOrderPdfPageHeader(
        doc,
        LAYOUT,
        makeWorkOrderPdfData({ pageIdentity: { workOrderLabel: 'WO: Replace hose' } }),
        2,
        2,
      );

      expect(readPdfPages(doc.output())).toEqual([['Page 2 of 2', 'WO: Replace hose']]);
      expect(countPdfLineSegments(doc.output())).toBe(1);
    });

    it('truncates labels to the first line that fits beside the page counter', () => {
      const doc = new jsPDF();
      const longLabel = `WO: ${'Very long work order title '.repeat(10)}`;
      renderWorkOrderPdfPageHeader(
        doc,
        LAYOUT,
        makeWorkOrderPdfData({ pageIdentity: { workOrderLabel: longLabel, equipmentLabel: longLabel } }),
        2,
        2,
      );

      const [[, woLine, eqLine]] = readPdfPages(doc.output());
      expect(longLabel.startsWith(woLine!)).toBe(true);
      expect(woLine!.length).toBeLessThan(longLabel.length);
      expect(longLabel.startsWith(eqLine!)).toBe(true);
    });

    it('falls back to the full labels if wrapping yields no lines', () => {
      const doc = new jsPDF();
      vi.spyOn(doc, 'splitTextToSize').mockReturnValue([]);
      renderWorkOrderPdfPageHeader(doc, LAYOUT, makeWorkOrderPdfData({ pageIdentity: identity }), 2, 2);

      expect(readPdfPages(doc.output())).toEqual([
        ['Page 2 of 2', 'WO: Replace hose', 'Loader 7 (S/N 123)'],
      ]);
    });

    it('skips identity labels on later pages when none were provided', () => {
      const doc = new jsPDF();
      renderWorkOrderPdfPageHeader(doc, LAYOUT, makeWorkOrderPdfData(), 2, 2);

      expect(readPdfPages(doc.output())).toEqual([['Page 2 of 2']]);
      expect(countPdfLineSegments(doc.output())).toBe(0);
    });
  });

  describe('renderWorkOrderPdfFooterQRStrip', () => {
    it('prints a divider and generated timestamp in the export timezone without QR codes', () => {
      const doc = new jsPDF();
      renderWorkOrderPdfFooterQRStrip(doc, LAYOUT, makeWorkOrderPdfData(), 'report');

      expect(readPdfPages(doc.output())).toEqual([[GENERATED]]);
      expect(countPdfLineSegments(doc.output())).toBe(1);
      expect(countPdfImages(doc.output())).toBe(0);
      expect(doc.getTextColor()).toBe('#000000');
    });

    it('embeds work order and equipment QR codes with labels', () => {
      const doc = new jsPDF();
      renderWorkOrderPdfFooterQRStrip(
        doc,
        LAYOUT,
        makeWorkOrderPdfData({ qrCodes: { workOrder: qr('https://wo'), equipment: qr('https://eq') } }),
        'report',
      );

      expect(readPdfPages(doc.output())).toEqual([['Work Order', 'Equipment', GENERATED]]);
      // jsPDF de-duplicates identical image data into one XObject.
      expect(countPdfImages(doc.output())).toBe(1);
      expect(doc.output()).toMatch(/\/I\d+ Do[\s\S]*\/I\d+ Do/);
    });

    it('notes when no equipment is assigned', () => {
      const doc = new jsPDF();
      renderWorkOrderPdfFooterQRStrip(
        doc,
        LAYOUT,
        makeWorkOrderPdfData({ qrCodes: { workOrder: qr('https://wo') } }),
        'report',
      );

      expect(readPdfPages(doc.output())).toEqual([['Work Order', 'No equipment assigned', GENERATED]]);
    });

    it('keeps the labels when a QR image cannot be embedded', () => {
      const doc = new jsPDF();
      const broken = { targetUrl: 'x', dataUrl: 'data:image/png;base64,AAAA' };
      renderWorkOrderPdfFooterQRStrip(
        doc,
        LAYOUT,
        makeWorkOrderPdfData({ qrCodes: { workOrder: broken, equipment: broken } }),
        'report',
      );

      expect(readPdfPages(doc.output())).toEqual([['Work Order', 'Equipment', GENERATED]]);
      expect(countPdfImages(doc.output())).toBe(0);
    });

    it('adds the field-worksheet disclaimer for worksheets', () => {
      const doc = new jsPDF();
      renderWorkOrderPdfFooterQRStrip(doc, LAYOUT, makeWorkOrderPdfData(), 'fieldWorksheet');

      expect(readPdfPages(doc.output())).toEqual([[GENERATED, DISCLAIMER]]);
    });
  });

  describe('applyWorkOrderPdfPageChrome', () => {
    it('stamps a header and footer on every page', () => {
      const doc = new jsPDF();
      doc.text('Body 1', 20, 40);
      doc.addPage();
      doc.text('Body 2', 20, 40);

      applyWorkOrderPdfPageChrome(
        doc,
        LAYOUT,
        makeWorkOrderPdfData({ pageIdentity: { workOrderLabel: 'WO: Replace hose' } }),
        'report',
      );

      expect(readPdfPages(doc.output())).toEqual([
        ['Body 1', 'Page 1 of 2', GENERATED],
        ['Body 2', 'Page 2 of 2', 'WO: Replace hose', GENERATED],
      ]);
    });
  });
});
