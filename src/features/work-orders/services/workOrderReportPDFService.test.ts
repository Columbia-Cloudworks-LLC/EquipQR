// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRecordingJsPdfModule,
  readPdfBlobPages,
  readPdfImagePlacementsMm,
  readPdfPages,
  countPdfImages,
  type SavedPdf,
} from '@vitest-harness/utils/pdf-text';
import {
  base64Bytes,
  installFailingFileReader,
  installImageDecoder,
  JPEG_BASE64,
  makeNote,
  makeNoteImage,
  makePmData,
  makeWorkOrderPdfData,
  stubImageFetch,
  TALL_PNG_BASE64,
  WIDE_PNG_BASE64,
  WIDE_PNG_DATA_URL,
} from '@vitest-harness/fixtures/workOrderPdf';
import { logger } from '@/utils/logger';
import type { WorkOrderPDFData } from './workOrderReportPDFService';

const saved = vi.hoisted(() => [] as SavedPdf[]);

vi.mock('jspdf', async (importOriginal) =>
  createRecordingJsPdfModule(await importOriginal<typeof import('jspdf')>(), saved),
);

const { WorkOrderReportPDFGenerator, generateWorkOrderPDF, generateWorkOrderPDFBlob } = await import(
  './workOrderReportPDFService'
);

const GENERATED = 'Document generated: 03/22/2026 7:00 AM';
const PLACEHOLDER = '(Image could not be loaded)';

/** Page text without the repeated page chrome (counter + generated footer). */
function bodies(pages: string[][]): string[][] {
  return pages.map((page) => page.filter((line) => !/^Page \d+ of \d+$/.test(line) && line !== GENERATED));
}

async function renderPdf(data: WorkOrderPDFData): Promise<SavedPdf> {
  await generateWorkOrderPDF(data);
  expect(saved).toHaveLength(1);
  return saved[0]!;
}

const png = { status: 200, contentType: 'image/png', bytes: base64Bytes(WIDE_PNG_BASE64) };

describe('WorkOrderReportPDFGenerator', () => {
  beforeEach(() => {
    saved.length = 0;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'));
    installImageDecoder();
    stubImageFetch({});
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders a complete customer-facing report across pages', async () => {
    stubImageFetch({ 'https://files/fitting.png': png });
    const data = makeWorkOrderPdfData({
      organizationName: 'Acme Fleet',
      workOrder: {
        ...makeWorkOrderPdfData().workOrder,
        completed_date: '2026-03-05T15:00:00.000Z',
        teamName: 'North Team',
        assigneeName: 'Avery Tech',
        has_pm: true,
      },
      equipment: {
        id: 'eq-1',
        name: 'Loader 7',
        status: 'active',
        manufacturer: 'Cat',
        model: '950M',
        serial_number: 'SN-123',
        location: 'Yard B',
        customerName: 'Granite Co',
      },
      pmData: makePmData({
        status: 'completed',
        completed_at: '2026-03-04T21:30:00.000Z',
        notes: 'All good overall.',
        checklist_data: [
          { id: '1', title: 'Check oil', condition: 1, required: true, section: 'Engine', notes: 'Topped up' },
          { id: '2', title: 'Inspect belt', condition: null, required: true, section: 'Engine' },
          { id: '3', title: 'Test horn', condition: 2, required: false, section: 'Safety' },
        ],
      }),
      notes: [
        makeNote({
          id: 'photo',
          author_name: 'Jordan Lead',
          content: 'Photo of the new fitting.',
          created_at: '2026-03-03T15:00:00.000Z',
          images: [makeNoteImage('fitting.png', 'https://files/fitting.png')],
        }),
        makeNote({ id: 'text', hours_worked: 2.5 }),
        makeNote({ id: 'secret', is_private: true, content: 'Internal: customer is late paying.' }),
      ],
      includeCosts: true,
      costs: [
        {
          id: 'c1', work_order_id: 'wo', description: 'Hydraulic hose', quantity: 2,
          unit_price_cents: 4550, total_price_cents: 9100, created_by: 'u', created_at: '', updated_at: '',
        },
        {
          id: 'c2', work_order_id: 'wo', description: 'Labor', quantity: 1,
          unit_price_cents: 12000, total_price_cents: 12000, created_by: 'u', created_at: '', updated_at: '',
        },
      ],
    });

    const pdf = await renderPdf(data);

    expect(pdf.filename).toBe('WorkOrder-Replace-hydraulic-hose-2026-03-22.pdf');
    expect(pdf.pages.map((page) => page.filter((l) => /^Page /.test(l)))).toEqual([
      ['Page 1 of 4'], ['Page 2 of 4'], ['Page 3 of 4'], ['Page 4 of 4'],
    ]);
    expect(bodies(pdf.pages)).toEqual([
      [
        'Acme Fleet',
        'Work Order: Replace hydraulic hose',
        'ID: 660e...0000 | Status: In Progress',
        'DETAILS',
        'Created: 03/01/2026',
        'Priority: High',
        'Due: 03/11/2026 (10 days from created)',
        'Completed: 03/05/2026 (4 days from created)',
        'EQUIPMENT',
        'Loader 7 - active',
        'Mfr: Cat | Model: 950M | S/N: SN-123',
        'Location: Yard B',
        'Customer: Granite Co',
        'Serviced By: North Team',
        'Assigned To: Avery Tech',
        'DESCRIPTION',
        'Hose is leaking at the boom cylinder.',
      ],
      [
        'PM CHECKLIST',
        'Status: COMPLETED',
        'Completed: 03/04/2026 3:30 PM',
        'Engine',
        '☑ Check oil - OK',
        'Notes: Topped up',
        '☐ Inspect belt - Not Rated',
        'Safety',
        '☑ Test horn - Adjusted',
        'General Notes:',
        'All good overall.',
      ],
      [
        'PUBLIC WORK ORDER NOTES',
        '03/02/2026 9:00 AM - Avery Tech',
        'Replaced the hose and bled the system.',
        'Hours worked: 2.5',
      ],
      [
        '03/03/2026 9:00 AM - Jordan Lead',
        'Photo of the new fitting.',
        'fitting.png',
        'ITEMIZED COSTS',
        'Hydraulic hose x2 @ $45.50 = $91.00',
        'Labor x1 @ $120.00 = $120.00',
        'TOTAL: $211.00',
      ],
    ]);
    expect(pdf.pages.flat().join('\n')).not.toContain('customer is late paying');
    expect(countPdfImages(pdf.raw)).toBe(1);
  });

  it('fills defaults for a minimal work order on a single page', async () => {
    const pdf = await renderPdf(
      makeWorkOrderPdfData({
        workOrder: { ...makeWorkOrderPdfData().workOrder, description: '', due_date: null },
      }),
    );

    expect(bodies(pdf.pages)).toEqual([
      [
        'Work Order: Replace hydraulic hose',
        'ID: 660e...0000 | Status: In Progress',
        'DETAILS',
        'Created: 03/01/2026',
        'Priority: High',
        'Due: —',
        'Serviced By: Unassigned',
        'Assigned To: Unassigned',
        'DESCRIPTION',
        'No description provided.',
      ],
    ]);
  });

  it('falls back to the snake_case assignee name', async () => {
    const pdf = await renderPdf(
      makeWorkOrderPdfData({ workOrder: { ...makeWorkOrderPdfData().workOrder, assignee_name: 'Sam Field' } }),
    );

    expect(pdf.pages[0]).toContain('Assigned To: Sam Field');
  });

  it('prints only the equipment name and status when other equipment fields are empty', async () => {
    const pdf = await renderPdf(
      makeWorkOrderPdfData({
        equipment: { id: 'eq', name: 'Generator', status: 'maintenance', model: null, location: null },
      }),
    );

    const page = bodies(pdf.pages)[0]!;
    const start = page.indexOf('EQUIPMENT');
    expect(page.slice(start, start + 3)).toEqual(['EQUIPMENT', 'Generator - maintenance', 'Serviced By: Unassigned']);
  });

  it('prints the equipment details that are present', async () => {
    const pdf = await renderPdf(
      makeWorkOrderPdfData({ equipment: { id: 'eq', name: 'Generator', status: 'active', serial_number: 'G-9' } }),
    );

    expect(pdf.pages[0]).toContain('S/N: G-9');
  });

  describe('PM checklist', () => {
    const withPm = (pmData: WorkOrderPDFData['pmData'], hasPm = true) =>
      makeWorkOrderPdfData({ workOrder: { ...makeWorkOrderPdfData().workOrder, has_pm: hasPm }, pmData });

    it('is left out unless the work order has PM enabled', async () => {
      const pdf = await renderPdf(withPm(makePmData({ checklist_data: '[]' }), false));

      expect(pdf.pages).toHaveLength(1);
      expect(pdf.pages.flat()).not.toContain('PM CHECKLIST');
    });

    it('reads checklist JSON strings and names every condition rating', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, null].map((condition, i) => ({
        id: String(i), title: `Item ${i + 1}`, condition, required: true, section: 'All',
      }));
      const pdf = await renderPdf(withPm(makePmData({ checklist_data: JSON.stringify(items) })));

      expect(bodies(pdf.pages)[1]).toEqual([
        'PM CHECKLIST',
        'Status: IN PROGRESS',
        'All',
        '☑ Item 1 - OK',
        '☑ Item 2 - Adjusted',
        '☑ Item 3 - Recommend Repairs',
        '☑ Item 4 - Requires Immediate Repairs',
        '☑ Item 5 - Unsafe Condition Present',
        '☑ Item 6 - Not Applicable',
        '☑ Item 7 - Unknown',
        '☐ Item 8 - Not Rated',
      ]);
    });

    it('reports unparseable checklist JSON instead of failing the export', async () => {
      const pdf = await renderPdf(withPm(makePmData({ checklist_data: '{not json' })));

      expect(bodies(pdf.pages)[1]).toEqual(['PM CHECKLIST', 'Status: IN PROGRESS', 'Unable to parse checklist data.']);
    });

    it.each([
      ['an empty list', []],
      ['a non-list value', { items: [] }],
    ])('says there are no items for %s', async (_label, checklist_data) => {
      const pdf = await renderPdf(withPm(makePmData({ checklist_data })));

      expect(bodies(pdf.pages)[1]).toEqual(['PM CHECKLIST', 'Status: IN PROGRESS', 'No checklist items.']);
    });

    it('flows long checklists onto extra pages', async () => {
      const items = Array.from({ length: 60 }, (_, i) => ({
        id: String(i), title: `Step ${i + 1}`, condition: 1, required: true, section: `Section ${Math.floor(i / 6)}`,
      }));
      const pdf = await renderPdf(withPm(makePmData({ checklist_data: items })));

      expect(pdf.pages.length).toBeGreaterThan(2);
      expect(pdf.pages.flat().filter((line) => line.startsWith('☑ Step'))).toHaveLength(60);
    });
  });

  describe('notes', () => {
    it('lists public notes oldest first and labels missing authors as Unknown', async () => {
      const pdf = await renderPdf(
        makeWorkOrderPdfData({
          notes: [
            makeNote({ id: 'b', content: 'Second visit.', created_at: '2026-03-04T15:00:00.000Z' }),
            makeNote({ id: 'a', content: 'First visit.', author_name: undefined, images: [] }),
          ],
        }),
      );

      expect(bodies(pdf.pages)[1]).toEqual([
        'PUBLIC WORK ORDER NOTES',
        '03/02/2026 9:00 AM - Unknown',
        'First visit.',
        '03/04/2026 9:00 AM - Avery Tech',
        'Second visit.',
      ]);
    });

    it('shows a dash for a note without a timestamp', async () => {
      const pdf = await renderPdf(makeWorkOrderPdfData({ notes: [makeNote({ created_at: '' })] }));

      expect(bodies(pdf.pages)[1]?.[1]).toBe('— - Avery Tech');
    });

    it('adds no notes section when every note is private', async () => {
      const pdf = await renderPdf(makeWorkOrderPdfData({ notes: [makeNote({ is_private: true })] }));

      expect(pdf.pages.flat()).not.toContain('PUBLIC WORK ORDER NOTES');
      expect(pdf.pages.flat().join('\n')).not.toContain('Replaced the hose');
    });

    it('gives each photo its own page, embedding JPEG/PNG and falling back to a placeholder', async () => {
      const requested = stubImageFetch({
        'https://f/wide.png': png,
        'https://f/photo.jpg': { status: 200, contentType: 'image/jpeg', bytes: base64Bytes(JPEG_BASE64) },
        'https://f/tall.png': { status: 200, contentType: 'image/png', bytes: base64Bytes(TALL_PNG_BASE64) },
        'https://f/missing.png': { status: 404 },
        'https://f/untyped': { status: 200, bytes: base64Bytes(WIDE_PNG_BASE64) },
        'https://f/anim.webp': { status: 200, contentType: 'image/webp', bytes: new Uint8Array([1]) },
        'https://f/blank-subtype': { status: 200, contentType: 'image/', bytes: new Uint8Array([1]) },
        'https://f/offline.png': 'network-error',
        'https://f/corrupt.png': { status: 200, contentType: 'image/png', bytes: new Uint8Array([1, 2, 3]) },
      });
      const files = [
        'wide.png', 'photo.jpg', 'tall.png', 'missing.png', 'untyped', 'anim.webp', 'blank-subtype',
        'offline.png', 'corrupt.png',
      ];
      const pdf = await renderPdf(
        makeWorkOrderPdfData({
          notes: [
            makeNote({
              content: 'Site photos.',
              hours_worked: 1,
              images: files.map((name) => makeNoteImage(name, `https://f/${name}`)),
            }),
          ],
        }),
      );

      expect(requested.sort()).toEqual(files.map((name) => `https://f/${name}`).sort());
      const photoPages = bodies(pdf.pages).slice(2);
      expect(photoPages).toHaveLength(files.length);
      photoPages.forEach((page, i) => {
        expect(page.slice(0, 3)).toEqual(['03/02/2026 9:00 AM - Avery Tech', 'Site photos.', 'Hours worked: 1']);
        const embedded = i < 3;
        expect(page.slice(3)).toEqual(embedded ? [files[i]] : [`Photo: ${files[i]}`, PLACEHOLDER]);
      });
      expect(countPdfImages(pdf.raw)).toBe(3);

      const placements = readPdfImagePlacementsMm(pdf.raw).slice(2, 5).map((page) => page[0]!);
      // Wide images fill the 170mm content width; tall ones are capped by height.
      expect(placements[0]!.width).toBeCloseTo(170, 1);
      expect(placements[0]!.height).toBeCloseTo(85, 1);
      expect(placements[2]!.width / placements[2]!.height).toBeCloseTo(0.25, 3);
      expect(placements[2]!.width).toBeLessThan(170);
    });

    it('uses a placeholder when the photo cannot be read', async () => {
      stubImageFetch({ 'https://f/a.png': png });
      installFailingFileReader();

      const pdf = await renderPdf(
        makeWorkOrderPdfData({ notes: [makeNote({ images: [makeNoteImage('a.png', 'https://f/a.png')] })] }),
      );

      expect(bodies(pdf.pages)[2]?.slice(-2)).toEqual(['Photo: a.png', PLACEHOLDER]);
      expect(countPdfImages(pdf.raw)).toBe(0);
    });
  });

  describe('costs', () => {
    const cost = (i: number) => ({
      id: `c${i}`, work_order_id: 'wo', description: `Part ${i}`, quantity: 1,
      unit_price_cents: 100 * i, total_price_cents: 100 * i, created_by: 'u', created_at: '', updated_at: '',
    });

    it('are hidden from customer-facing reports unless requested', async () => {
      const hidden = await renderPdf(makeWorkOrderPdfData({ costs: [cost(1)] }));
      saved.length = 0;
      const empty = await renderPdf(makeWorkOrderPdfData({ costs: [], includeCosts: true }));

      expect(hidden.pages.flat()).not.toContain('ITEMIZED COSTS');
      expect(empty.pages.flat()).not.toContain('ITEMIZED COSTS');
    });

    it('itemizes and totals long cost lists across pages', async () => {
      const costs = Array.from({ length: 40 }, (_, i) => cost(i + 1));
      const pdf = await renderPdf(makeWorkOrderPdfData({ costs, includeCosts: true }));

      expect(pdf.pages.length).toBeGreaterThan(1);
      const lines = pdf.pages.flat();
      expect(lines.filter((line) => /^Part \d+ x1 @ /.test(line))).toHaveLength(40);
      expect(lines).toContain('Part 40 x1 @ $40.00 = $40.00');
      expect(lines).toContain('TOTAL: $820.00');
    });
  });

  it('stamps QR codes and identity labels on every page', async () => {
    const pdf = await renderPdf(
      makeWorkOrderPdfData({
        notes: [makeNote()],
        qrCodes: { workOrder: { targetUrl: 'https://wo', dataUrl: WIDE_PNG_DATA_URL } },
        pageIdentity: { workOrderLabel: 'WO: Replace hydraulic hose' },
      }),
    );

    expect(pdf.pages[1]).toEqual(expect.arrayContaining(['Page 2 of 2', 'WO: Replace hydraulic hose', 'Work Order', 'No equipment assigned']));
  });

  it('omits the day count when the dates cannot be compared', async () => {
    // Simulate a runtime whose Date parser rejects the first parse of each due/completed value.
    const RealDate = Date;
    const rejectOnce = new Set(['2026-03-11T15:00:00.000Z', '2026-03-05T15:00:00.000Z']);
    vi.stubGlobal(
      'Date',
      class extends RealDate {
        constructor(...args: ConstructorParameters<DateConstructor>) {
          const [value] = args;
          if (typeof value === 'string' && rejectOnce.delete(value)) throw new RangeError('Invalid time value');
          super(...args);
        }
      },
    );

    const pdf = await renderPdf(
      makeWorkOrderPdfData({
        workOrder: { ...makeWorkOrderPdfData().workOrder, completed_date: '2026-03-05T15:00:00.000Z' },
      }),
    );

    expect(pdf.pages[0]).toEqual(expect.arrayContaining(['Due: 03/11/2026', 'Completed: 03/05/2026']));
  });

  describe('defensive guards on internal helpers', () => {
    it('fetches a photo itself when no prefetch cache is supplied', async () => {
      const requested = stubImageFetch({ 'https://f/direct.png': png });
      const generator = await WorkOrderReportPDFGenerator.create();

      await generator['addEmbeddedImage']('https://f/direct.png', 'direct.png');

      expect(requested).toEqual(['https://f/direct.png']);
      expect(countPdfImages(generator['doc'].output())).toBe(1);
    });

    it('draws nothing for an empty cost list', async () => {
      const generator = await WorkOrderReportPDFGenerator.create();
      const before = generator['doc'].output();

      generator['generateCostsSection']([]);

      expect(generator['doc'].output()).toBe(before);
    });
  });

  describe('entry points', () => {
    it('generatePDF returns the finished document without downloading it', async () => {
      const generator = await WorkOrderReportPDFGenerator.create();

      const doc = await generator.generatePDF(makeWorkOrderPdfData({ organizationName: 'Acme Fleet' }));

      expect(saved).toHaveLength(0);
      expect(bodies(readPdfPages(doc.output()))[0]?.slice(0, 2)).toEqual([
        'Acme Fleet',
        'Work Order: Replace hydraulic hose',
      ]);
    });

    it('generateWorkOrderPDFBlob returns the PDF and the download filename', async () => {
      const { blob, filename } = await generateWorkOrderPDFBlob(makeWorkOrderPdfData());

      expect(filename).toBe('WorkOrder-Replace-hydraulic-hose-2026-03-22.pdf');
      expect(blob.type).toBe('application/pdf');
      expect(bodies(await readPdfBlobPages(blob))[0]?.[0]).toBe('Work Order: Replace hydraulic hose');
      expect(saved).toHaveLength(0);
    });

    it.each([
      ['generateWorkOrderPDF', () => generateWorkOrderPDF(makeWorkOrderPdfData())],
      ['generateWorkOrderPDFBlob', () => generateWorkOrderPDFBlob(makeWorkOrderPdfData())],
    ])('%s rethrows generation failures', async (_name, run) => {
      vi.spyOn(WorkOrderReportPDFGenerator, 'create').mockRejectedValueOnce(new Error('jsPDF failed to load'));

      await expect(run()).rejects.toThrow('jsPDF failed to load');
      expect(saved).toHaveLength(0);
    });
  });
});
