import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { readPdfPages } from '@vitest-harness/utils/pdf-text';
import { WorkOrderPdfTextLayout, type WorkOrderPdfTextLayoutOptions } from './workOrderPdfTextLayout';

const LONG_TEXT = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ');

function layout(options: Partial<WorkOrderPdfTextLayoutOptions> = {}) {
  const doc = new jsPDF();
  return new WorkOrderPdfTextLayout(doc, { margin: 20, pageHeight: 100, lineHeight: 6, ...options });
}

/** Greedy wrapping proof: every line fits, and pulling up the next word would not. */
function expectWrappedTo(doc: jsPDF, lines: string[], width: number) {
  expect(lines.length).toBeGreaterThan(1);
  lines.forEach((line, i) => {
    expect(doc.getTextWidth(line)).toBeLessThanOrEqual(width);
    const nextWord = lines[i + 1]?.split(' ')[0];
    if (nextWord) expect(doc.getTextWidth(`${line} ${nextWord}`)).toBeGreaterThan(width);
  });
}

describe('WorkOrderPdfTextLayout', () => {
  it('starts at y=20 by default, or at the configured page top', () => {
    expect(layout().yPosition).toBe(20);
    expect(layout({ pageTopY: 35 }).yPosition).toBe(35);
  });

  describe('checkPageBreak', () => {
    it('stays on the page while the requested space fits (default 20)', () => {
      const text = layout();
      text.yPosition = 80;

      text.checkPageBreak();

      expect(text.doc.getNumberOfPages()).toBe(1);
      expect(text.yPosition).toBe(80);
    });

    it('adds a page and returns to the page top when space runs out', () => {
      const text = layout({ pageTopY: 30 });
      text.yPosition = 81;

      text.checkPageBreak();

      expect(text.doc.getNumberOfPages()).toBe(2);
      expect(text.yPosition).toBe(30);
    });

    it('honours a custom required space', () => {
      const text = layout();
      text.yPosition = 60;

      text.checkPageBreak(40);
      expect(text.doc.getNumberOfPages()).toBe(1);

      text.checkPageBreak(41);
      expect(text.doc.getNumberOfPages()).toBe(2);
    });
  });

  describe('addText', () => {
    it('writes one line in normal 10pt helvetica and advances by the line height', () => {
      const text = layout();

      text.addText('Hello');

      expect(text.doc.getFontSize()).toBe(10);
      expect(text.doc.getFont()).toMatchObject({ fontName: 'helvetica', fontStyle: 'normal' });
      expect(text.yPosition).toBe(26);
      expect(readPdfPages(text.doc.output())).toEqual([['Hello']]);
    });

    it('applies the requested size and weight', () => {
      const text = layout();

      text.addText('Heading', 40, 14, 'bold');

      expect(text.doc.getFontSize()).toBe(14);
      expect(text.doc.getFont().fontStyle).toBe('bold');
    });

    it('moves to a new page before writing when the line would not fit', () => {
      const text = layout();
      for (let i = 1; i <= 15; i += 1) text.addText(`Row ${i}`);

      const pages = readPdfPages(text.doc.output());
      // Rows land at y = 20, 26, … ; y + 20 > 100 first happens at y = 86 (row 12).
      expect(pages[0]).toEqual(Array.from({ length: 11 }, (_, i) => `Row ${i + 1}`));
      expect(pages[1]).toEqual(['Row 12', 'Row 13', 'Row 14', 'Row 15']);
    });
  });

  describe('addMultilineText', () => {
    it('wraps to an explicit maxWidth first', () => {
      const text = layout({ contentWidth: 150, pageWidth: 210 });
      text.addMultilineText(LONG_TEXT, 20, 40);
      const lines = readPdfPages(text.doc.output()).flat();
      expectWrappedTo(text.doc, lines, 40);
    });

    it('falls back to contentWidth, then defaultMultilineMaxWidth, then pageWidth − 2·margin, then 170', () => {
      const cases: [Partial<WorkOrderPdfTextLayoutOptions>, number][] = [
        [{ contentWidth: 60, defaultMultilineMaxWidth: 90, pageWidth: 210, pageHeight: 1000 }, 60],
        [{ defaultMultilineMaxWidth: 90, pageWidth: 210, pageHeight: 1000 }, 90],
        [{ pageWidth: 150, pageHeight: 1000 }, 110],
        [{ pageHeight: 1000 }, 170],
      ];
      for (const [options, width] of cases) {
        const text = layout(options);
        text.addMultilineText(LONG_TEXT);
        expectWrappedTo(text.doc, readPdfPages(text.doc.output()).flat(), width);
      }
    });

    it('resets to normal weight at the requested size and flows across pages', () => {
      const text = layout();
      text.doc.setFont('helvetica', 'bold');

      text.addMultilineText(LONG_TEXT, 20, 30, 8);

      expect(text.doc.getFont().fontStyle).toBe('normal');
      expect(text.doc.getFontSize()).toBe(8);
      const pages = readPdfPages(text.doc.output());
      expect(pages.length).toBeGreaterThan(1);
      expect(pages.flat().join(' ')).toBe(LONG_TEXT);
    });
  });
});
