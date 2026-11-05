// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countPdfImages,
  countPdfLineSegments,
  createRecordingJsPdfModule,
  readPdfImagePlacementsMm,
  readPdfPages,
  type SavedPdf,
} from '@vitest-harness/utils/pdf-text';
import {
  base64Bytes,
  installFailingFileReader,
  installImageDecoder,
  JPEG_BASE64,
  makePmData,
  makeWorkOrderPdfData,
  stubImageFetch,
  WIDE_PNG_BASE64,
} from '@vitest-harness/fixtures/workOrderPdf';
import { logger } from '@/utils/logger';
import type { WorkOrderForPDF, WorkOrderPDFData } from './workOrderReportPDFService';

const saved = vi.hoisted(() => [] as SavedPdf[]);

vi.mock('jspdf', async (importOriginal) =>
  createRecordingJsPdfModule(await importOriginal<typeof import('jspdf')>(), saved),
);

const { WorkOrderFieldWorksheetPDFGenerator, generateFieldWorksheetPDF } = await import(
  './workOrderFieldWorksheetPDFService'
);

const GENERATED = 'Document generated: 03/22/2026 7:00 AM';
const DISCLAIMER =
  'Field worksheet only — all results must be entered into EquipQR as the official record';
const LEGEND =
  '1 = OK   |   6 = N/A   |   2 = Adjusted   |   3 = Recommend Repairs   |   4 = Immediate Repairs   |   5 = Unsafe';
const BOX_NUMBERS = ['1', '6', '2', '3', '4', '5'];

/** Page text without repeated chrome or the 1–6 condition box numbers. */
function bodies(pages: string[][]): string[][] {
  return pages.map((page) =>
    page.filter(
      (line) =>
        !/^Page \d+ of \d+$/.test(line) && line !== GENERATED && line !== DISCLAIMER && !BOX_NUMBERS.includes(line),
    ),
  );
}

const baseWorkOrder = makeWorkOrderPdfData().workOrder;
const workOrder = (overrides: Partial<WorkOrderForPDF>) => ({ ...baseWorkOrder, ...overrides });

const lastPage = (pdf: SavedPdf) => bodies(pdf.pages)[pdf.pages.length - 1]!;

async function renderWorksheet(data: WorkOrderPDFData): Promise<SavedPdf> {
  await generateFieldWorksheetPDF(data);
  expect(saved).toHaveLength(1);
  return saved[0]!;
}

async function coverPage(data: WorkOrderPDFData): Promise<string[]> {
  saved.length = 0;
  return bodies((await renderWorksheet(data)).pages)[0]!;
}

const checklist = (count: number, title = (i: number) => `Step ${i + 1}`) =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i), title: title(i), condition: null, required: true, section: `Section ${Math.floor(i / 5) + 1}`,
  }));

describe('WorkOrderFieldWorksheetPDFGenerator', () => {
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

  it('builds the full worksheet: cover, PM summary + detail, labor, parts, notes', async () => {
    stubImageFetch({
      'https://img/logo.png': { status: 200, contentType: 'image/png', bytes: base64Bytes(WIDE_PNG_BASE64) },
      'https://img/team.jpg': { status: 200, contentType: 'image/jpg', bytes: base64Bytes(JPEG_BASE64) },
    });

    const pdf = await renderWorksheet(
      makeWorkOrderPdfData({
        organizationName: 'Acme Fleet',
        organizationLogoUrl: 'https://img/logo.png',
        teamImageUrl: 'https://img/team.jpg',
        workOrder: workOrder({ has_pm: true, teamName: 'North', estimated_hours: 3, assigneeName: 'Avery Tech' }),
        equipment: {
          id: 'e', name: 'Loader 7', status: 'active', manufacturer: 'Cat', model: '950M', serial_number: 'SN', location: 'Yard',
        },
        pmData: makePmData({
          checklist_data: [
            { id: '1', title: 'Check oil', condition: null, required: true, section: 'Engine' },
            { id: '2', title: 'Horn', condition: null, required: true, section: 'Safety' },
          ],
        }),
      }),
    );

    expect(pdf.filename).toBe('FieldWorksheet-Replace-hydraulic-hose-2026-03-22.pdf');
    expect(pdf.pages.map((page) => page.filter((line) => /^Page \d/.test(line)))).toEqual(
      [1, 2, 3, 4, 5, 6].map((n) => [`Page ${n} of 6`]),
    );
    pdf.pages.forEach((page) => expect(page).toEqual(expect.arrayContaining([GENERATED, DISCLAIMER])));

    const [cover, summary, detail, labor, parts, notes] = bodies(pdf.pages);
    expect(cover).toEqual([
      'Acme Fleet',
      'FIELD WORKSHEET',
      'Replace hydraulic hose',
      'WO: 660e...0000  |  In Progress  |  Generated: 03/22/2026',
      'WORK ORDER DETAILS',
      'Created: 03/01/2026',
      'Due: 03/11/2026',
      'Priority: High',
      'Assigned To: Avery Tech',
      'Team: North',
      'Est. Hours: 3',
      'EQUIPMENT',
      'Loader 7',
      'Mfr: Cat',
      'Model: 950M',
      'S/N: SN',
      'Location: Yard',
      'DESCRIPTION',
      'Hose is leaking at the boom cylinder.',
    ]);
    expect(summary).toEqual(['PM CHECKLIST — SUMMARY', 'CONDITION SCALE:', LEGEND, 'Engine', 'Check oil', 'Safety', 'Horn']);
    expect(pdf.pages[1]!.filter((line) => BOX_NUMBERS.includes(line))).toHaveLength(12);
    expect(detail).toEqual([
      'PM CHECKLIST — DETAIL', 'CONDITION SCALE:', LEGEND,
      'Engine', 'Check oil', 'Condition:', 'Safety', 'Horn', 'Condition:', 'General PM Notes:',
    ]);
    // Labor rows are 15mm tall and parts rows 8mm, filling the space below the header.
    expect(labor!.filter((line) => line === 'Tech:')).toHaveLength(14);
    expect(labor!.filter((line) => line === 'Task:')).toHaveLength(14);
    expect(parts!.filter((line) => line === 'Part:')).toHaveLength(27);
    expect(notes).toEqual([
      'NOTES',
      'Date Signed:',
      'Technician Signature',
      'Technician Printed Name:',
      'Avery Tech',
      'I certify that the foregoing work and observations are accurate to the best of my knowledge.',
      'Entered into EquipQR By:',
      'Entry Date:',
    ]);

    // Team image: 22×16 box, right-aligned; logo: 50×18 box, centred on the 210mm page.
    expect(countPdfImages(pdf.raw)).toBe(2);
    const [team, logo] = readPdfImagePlacementsMm(pdf.raw)[0]!;
    expect(team).toMatchObject({ width: expect.closeTo(22, 1), height: expect.closeTo(11, 1), x: expect.closeTo(173, 1) });
    expect(logo).toMatchObject({ width: expect.closeTo(36, 1), height: expect.closeTo(18, 1), x: expect.closeTo(87, 1) });
  });

  describe('cover page details', () => {
    it('shows estimated hours in the first column when there is no team', async () => {
      const page = await coverPage(makeWorkOrderPdfData({ workOrder: workOrder({ estimated_hours: 2 }) }));
      expect(page.slice(page.indexOf('Priority: High'), page.indexOf('DESCRIPTION'))).toEqual([
        'Priority: High', 'Assigned To: Unassigned', 'Est. Hours: 2',
      ]);
    });

    it('shows the team alone when hours are not estimated, and the snake_case assignee', async () => {
      const page = await coverPage(
        makeWorkOrderPdfData({ workOrder: workOrder({ teamName: 'South', assignee_name: 'Sam Field' }) }),
      );
      expect(page.slice(page.indexOf('Priority: High'), page.indexOf('DESCRIPTION'))).toEqual([
        'Priority: High', 'Assigned To: Sam Field', 'Team: South',
      ]);
    });

    it('prints a dash for a missing due date and a placeholder for an empty description', async () => {
      const page = await coverPage(makeWorkOrderPdfData({ workOrder: workOrder({ due_date: null, description: '' }) }));
      expect(page).toEqual(expect.arrayContaining(['Due: —', 'No description provided.']));
    });

    it('wraps long titles over several centred lines', async () => {
      const title = 'Rebuild the main hydraulic pump, replace every worn hose on the boom assembly, and re-torque all cylinder mounting hardware to the manufacturer specification';
      const page = await coverPage(makeWorkOrderPdfData({ workOrder: workOrder({ title }) }));
      const titleLines = page.slice(page.indexOf('FIELD WORKSHEET') + 1, page.findIndex((l) => l.startsWith('WO: ')));
      expect(titleLines.length).toBeGreaterThan(1);
      expect(titleLines.join(' ')).toBe(title);
    });

    it.each([
      [{ manufacturer: 'Cat' }, ['Mfr: Cat']],
      [{ model: '950M' }, ['Model: 950M']],
      [{}, []],
    ])('lays out equipment make/model %j', async (fields, expected) => {
      const page = await coverPage(
        makeWorkOrderPdfData({ equipment: { id: 'e', name: 'Loader 7', status: 'active', ...fields } }),
      );
      expect(page.slice(page.indexOf('Loader 7') + 1, page.indexOf('DESCRIPTION'))).toEqual(expected);
    });

    it('prints no model line if the model is gone by the time it is written (live record)', async () => {
      // Defensive branch: the model is read twice; a live/proxied record can change in between.
      let reads = 0;
      const equipment = {
        id: 'e',
        name: 'Loader 7',
        status: 'active',
        get model(): string | null {
          reads += 1;
          return reads === 1 ? '950M' : null;
        },
      };

      const page = await coverPage(makeWorkOrderPdfData({ equipment }));

      expect(page.slice(page.indexOf('Loader 7') + 1, page.indexOf('DESCRIPTION'))).toEqual([]);
    });
  });

  describe('drawing helpers with default arguments', () => {
    it('addWriteLines spans the content width at the left margin by default', async () => {
      const generator = await WorkOrderFieldWorksheetPDFGenerator.create();
      const startY = generator['textLayout'].yPosition;

      generator['addWriteLines'](2);

      expect(countPdfLineSegments(generator['doc'].output())).toBe(2);
      expect(generator['doc'].output()).toMatch(/42\.519\d* \d+\.\d+ m\n552\.755\d* \d+\.\d+ l\nS/);
      expect(generator['textLayout'].yPosition).toBe(startY + 16);
    });

    it('addLabeledField writes at the current line by default', async () => {
      const generator = await WorkOrderFieldWorksheetPDFGenerator.create();
      generator['textLayout'].yPosition = 50;

      generator['addLabeledField']('Tech:', 17, 67);

      expect(readPdfPages(generator['doc'].output())).toEqual([['Tech:']]);
      expect(countPdfLineSegments(generator['doc'].output())).toBe(1);
      expect(generator['textLayout'].yPosition).toBe(50);
    });
  });

  describe('PM checklist pages', () => {
    const withPm = (pmData: WorkOrderPDFData['pmData'], hasPm = true) =>
      makeWorkOrderPdfData({ workOrder: workOrder({ has_pm: hasPm }), pmData });

    it('are skipped when PM is not enabled on the work order', async () => {
      const pdf = await renderWorksheet(withPm(makePmData({ checklist_data: checklist(2) }), false));

      expect(bodies(pdf.pages).map((page) => page[0])).toEqual([
        'FIELD WORKSHEET', 'LABOR SUMMARY', 'PARTS / MATERIALS USED', 'NOTES',
      ]);
    });

    it('accept checklist JSON strings', async () => {
      const pdf = await renderWorksheet(withPm(makePmData({ checklist_data: JSON.stringify(checklist(1)) })));

      expect(bodies(pdf.pages)[1]).toEqual(['PM CHECKLIST — SUMMARY', 'CONDITION SCALE:', LEGEND, 'Section 1', 'Step 1']);
    });

    it.each([
      ['an empty checklist', []],
      ['unparseable JSON', '{oops'],
      ['a non-list value', { items: [] }],
    ])('note "No checklist items configured." on the cover for %s', async (_label, checklist_data) => {
      const pdf = await renderWorksheet(withPm(makePmData({ checklist_data })));

      expect(pdf.pages).toHaveLength(4);
      const cover = bodies(pdf.pages)[0]!;
      expect(cover[cover.length - 1]).toBe('No checklist items configured.');
    });

    it('flow long checklists across pages, truncating titles in the summary and wrapping them in detail', async () => {
      const longTitle =
        'Inspect every hydraulic line, fitting, and clamp along the boom and stick for leaks, chafing, cracked sleeves, and loose or missing hardware before returning the machine to service';
      const items = checklist(40, (i) => (i === 0 ? longTitle : `Step ${i + 1}`));
      const pdf = await renderWorksheet(withPm(makePmData({ checklist_data: items })));
      const pages = bodies(pdf.pages);

      const summaryStart = pages.findIndex((p) => p[0] === 'PM CHECKLIST — SUMMARY');
      const detailStart = pages.findIndex((p) => p[0] === 'PM CHECKLIST — DETAIL');
      const laborStart = pages.findIndex((p) => p[0] === 'LABOR SUMMARY');
      expect(detailStart - summaryStart).toBeGreaterThan(1);
      expect(laborStart - detailStart).toBeGreaterThan(1);

      const summaryLines = pages.slice(summaryStart, detailStart).flat();
      const detailLines = pages.slice(detailStart, laborStart).flat();
      for (let i = 2; i <= 40; i += 1) {
        expect(summaryLines).toContain(`Step ${i}`);
        expect(detailLines).toContain(`Step ${i}`);
      }
      const summaryTitle = summaryLines[summaryLines.indexOf('Section 1') + 1]!;
      expect(longTitle.startsWith(summaryTitle)).toBe(true);
      expect(summaryTitle.length).toBeLessThan(longTitle.length);
      const detailTitle = detailLines.slice(detailLines.indexOf('Section 1') + 1, detailLines.indexOf('Condition:'));
      expect(detailTitle.length).toBeGreaterThan(1);
      expect(detailTitle.join(' ')).toBe(longTitle);
      expect(detailLines.filter((line) => line === 'Condition:')).toHaveLength(40);
    });

    it('keep the full title in the summary if wrapping yields no lines', async () => {
      const generator = await WorkOrderFieldWorksheetPDFGenerator.create();
      vi.spyOn(generator['doc'], 'splitTextToSize').mockReturnValue([]);

      generator['generatePMSummaryPage'](checklist(1));

      const pages = bodies(readPdfPages(generator['doc'].output()));
      expect(pages[pages.length - 1]).toEqual([
        'PM CHECKLIST — SUMMARY', 'CONDITION SCALE:', LEGEND, 'Section 1', 'Step 1',
      ]);
    });
  });

  describe('signature block', () => {
    it('prefills the snake_case assignee name', async () => {
      const pdf = await renderWorksheet(makeWorkOrderPdfData({ workOrder: workOrder({ assignee_name: 'Sam Field' }) }));
      const notes = lastPage(pdf);
      expect(notes.slice(3, 5)).toEqual(['Technician Printed Name:', 'Sam Field']);
    });

    it('leaves a blank printed-name line when nobody is assigned', async () => {
      const pdf = await renderWorksheet(makeWorkOrderPdfData());
      const notes = lastPage(pdf);
      expect(notes.slice(3, 5)).toEqual([
        'Technician Printed Name:',
        'I certify that the foregoing work and observations are accurate to the best of my knowledge.',
      ]);
    });
  });

  describe('branding images', () => {
    const cover = (data: Partial<WorkOrderPDFData>) =>
      renderWorksheet(makeWorkOrderPdfData({ organizationLogoUrl: 'https://img/logo', ...data }));

    it.each([
      ['HTTP error', { status: 500 }],
      ['missing content type', { status: 200, bytes: base64Bytes(WIDE_PNG_BASE64) }],
      ['unsupported type', { status: 200, contentType: 'image/gif', bytes: new Uint8Array([1]) }],
      ['undecodable image', { status: 200, contentType: 'image/png', bytes: new Uint8Array([1, 2, 3]) }],
      ['network failure', 'network-error'],
    ] as const)('fall back to a text-only header on %s', async (_label, response) => {
      stubImageFetch({ 'https://img/logo': response });

      const pdf = await cover({});

      expect(countPdfImages(pdf.raw)).toBe(0);
      expect(bodies(pdf.pages)[0]?.[0]).toBe('FIELD WORKSHEET');
    });

    it('fall back to a text-only header when the image cannot be read', async () => {
      stubImageFetch({ 'https://img/logo': { status: 200, contentType: 'image/png', bytes: base64Bytes(WIDE_PNG_BASE64) } });
      installFailingFileReader();

      const pdf = await cover({});

      expect(countPdfImages(pdf.raw)).toBe(0);
    });

    it('keep the space but skip the image when the PDF library rejects it', async () => {
      // A PNG header with no image data: browsers report a size, jsPDF cannot embed it.
      const headerOnly = base64Bytes(WIDE_PNG_BASE64).slice(0, 33);
      stubImageFetch({ 'https://img/logo': { status: 200, contentType: 'image/png', bytes: headerOnly } });

      const pdf = await cover({ organizationName: 'Acme Fleet' });

      expect(countPdfImages(pdf.raw)).toBe(0);
      expect(bodies(pdf.pages)[0]?.slice(0, 2)).toEqual(['Acme Fleet', 'FIELD WORKSHEET']);
    });

    it('left-aligns images at the margin when asked', async () => {
      const generator = await WorkOrderFieldWorksheetPDFGenerator.create();
      const image = { data: `data:image/png;base64,${WIDE_PNG_BASE64}`, format: 'PNG' as const, width: 4, height: 2 };

      const size = generator['embedImage'](image, 40, 40, 'left');

      expect(size).toEqual({ width: 40, height: 20 });
      expect(readPdfImagePlacementsMm(generator['doc'].output())[0]?.[0]?.x).toBeCloseTo(15, 1);
    });
  });

  it('generateWorksheet returns the finished document without downloading it', async () => {
    const generator = await WorkOrderFieldWorksheetPDFGenerator.create();

    const doc = await generator.generateWorksheet(makeWorkOrderPdfData());

    expect(saved).toHaveLength(0);
    expect(bodies(readPdfPages(doc.output())).map((page) => page[0])).toEqual([
      'FIELD WORKSHEET', 'LABOR SUMMARY', 'PARTS / MATERIALS USED', 'NOTES',
    ]);
  });

  it('rethrows generation failures without saving', async () => {
    vi.spyOn(WorkOrderFieldWorksheetPDFGenerator, 'create').mockRejectedValueOnce(new Error('jsPDF failed to load'));

    await expect(generateFieldWorksheetPDF(makeWorkOrderPdfData())).rejects.toThrow('jsPDF failed to load');
    expect(saved).toHaveLength(0);
  });
});
