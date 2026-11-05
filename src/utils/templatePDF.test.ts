import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countPdfLineSegments,
  createRecordingJsPdfModule,
  type SavedPdf,
} from '@vitest-harness/utils/pdf-text';
import { defaultUserSettings } from '@/types/settings';
import { formatDateTime } from '@/utils/dateFormatter';

const saved = vi.hoisted(() => [] as SavedPdf[]);

vi.mock('jspdf', async (importOriginal) =>
  createRecordingJsPdfModule(await importOriginal<typeof import('jspdf')>(), saved),
);

const { generateTemplatePreviewPDF } = await import('./templatePDF');

type Params = Parameters<typeof generateTemplatePreviewPDF>[0];

const CHICAGO = { timezone: 'America/Chicago', dateFormat: 'yyyy-MM-dd' } as const;

function items(count: number, prefix = 'Item') {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    title: `${prefix} ${i + 1}`,
    required: i % 2 === 0,
  }));
}

function baseParams(overrides: Partial<Params> = {}): Params {
  return {
    name: 'Daily  Forklift Check',
    createdAt: '2026-01-05T15:30:00.000Z',
    updatedAt: '2026-02-10T23:45:00.000Z',
    exportDateSettings: CHICAGO,
    sections: [
      {
        name: 'Engine',
        items: [
          { id: 'oil', title: 'Check oil', description: 'Dipstick between marks', required: true },
          { id: 'belt', title: 'Inspect belt', required: false },
        ],
      },
    ],
    ...overrides,
  };
}

async function render(params: Params): Promise<SavedPdf> {
  await generateTemplatePreviewPDF(params);
  expect(saved).toHaveLength(1);
  return saved[0]!;
}

describe('generateTemplatePreviewPDF', () => {
  beforeEach(() => {
    saved.length = 0;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the header, sections, and items in reading order', async () => {
    const pdf = await render(baseParams({ description: 'Run before first shift' }));

    expect(pdf.pages).toEqual([
      [
        'PM Template Preview',
        'Daily  Forklift Check',
        'Run before first shift',
        'Created: 2026-01-05 9:30 AM',
        'Updated: 2026-02-10 5:45 PM',
        'ENGINE',
        '1. Check oil (Required)',
        'Dipstick between marks',
        '2. Inspect belt (Optional)',
      ],
    ]);
  });

  it('omits the description line when the template has none', async () => {
    const pdf = await render(baseParams());

    expect(pdf.pages[0]?.slice(0, 3)).toEqual([
      'PM Template Preview',
      'Daily  Forklift Check',
      'Created: 2026-01-05 9:30 AM',
    ]);
  });

  it('formats dates with default personalization when no settings are passed', async () => {
    const pdf = await render(baseParams({ exportDateSettings: undefined }));

    expect(pdf.pages[0]).toContain(
      `Created: ${formatDateTime('2026-01-05T15:30:00.000Z', defaultUserSettings)}`,
    );
  });

  it('names the file after the template with whitespace runs collapsed and today’s date', async () => {
    const pdf = await render(baseParams());

    expect(pdf.filename).toBe('PM-Template-Daily-Forklift-Check-2026-03-22.pdf');
  });

  it('wraps long descriptions instead of running off the page', async () => {
    const description = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ');
    const pdf = await render(baseParams({ description }));

    const page = pdf.pages[0]!;
    const start = page.indexOf('Daily  Forklift Check') + 1;
    const end = page.findIndex((line) => line.startsWith('Created:'));
    expect(end - start).toBeGreaterThan(1);
    expect(page.slice(start, end).join(' ')).toBe(description);
  });

  it('continues on a new page when text reaches the bottom margin', async () => {
    const pdf = await render(baseParams({ sections: [{ name: 'Walkaround', items: items(60) }] }));

    expect(pdf.pages.length).toBeGreaterThan(1);
    const allLines = pdf.pages.flat();
    for (let i = 1; i <= 60; i += 1) {
      expect(allLines.filter((line) => line.startsWith(`${i}. Item ${i} `))).toHaveLength(1);
    }
    expect(pdf.pages[1]?.[0]).toMatch(/^\d+\. Item \d+ \((Required|Optional)\)$/);
  });

  describe('handwriting lines', () => {
    const sections = [{ name: 'Hydraulics', items: items(3, 'Hose') }];

    async function renderWith(options: Params['options']): Promise<SavedPdf> {
      saved.length = 0;
      return render(baseParams({ sections, options }));
    }

    async function drawnLines(options: Params['options']): Promise<number> {
      return countPdfLineSegments((await renderWith(options)).raw);
    }

    it('adds writing space under each item, pushing later items onto new pages', async () => {
      const plain = await renderWith(undefined);
      const lined = await renderWith({ includeHandwritingLines: true, linesPerItem: 20 });

      expect(plain.pages).toHaveLength(1);
      expect(lined.pages.length).toBeGreaterThan(1);
      expect(countPdfLineSegments(lined.raw)).toBe(60);
      expect(lined.pages.flat().filter((line) => /^\d\. Hose \d/.test(line))).toEqual([
        '1. Hose 1 (Required)',
        '2. Hose 2 (Optional)',
        '3. Hose 3 (Required)',
      ]);
    });

    it('draws five lines per item by default', async () => {
      expect(await drawnLines({ includeHandwritingLines: true })).toBe(15);
      expect(await drawnLines({ includeHandwritingLines: true, linesPerItem: 6 })).toBe(18);
    });

    it('caps lines per item at 20', async () => {
      expect(await drawnLines({ includeHandwritingLines: true, linesPerItem: 50 })).toBe(60);
    });

    it('draws no lines for zero or negative counts, or when not requested', async () => {
      expect(await drawnLines(undefined)).toBe(0);
      expect(await drawnLines({ includeHandwritingLines: true, linesPerItem: -3 })).toBe(0);
      expect(await drawnLines({ includeHandwritingLines: true, linesPerItem: 0 })).toBe(0);
      expect(await drawnLines({ includeHandwritingLines: false, linesPerItem: 20 })).toBe(0);
    });
  });
});
