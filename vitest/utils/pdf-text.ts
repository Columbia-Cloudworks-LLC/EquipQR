/**
 * Read the text that jsPDF actually wrote into a generated PDF.
 *
 * jsPDF writes uncompressed content streams by default, so each text-show
 * operator ("(...) Tj") can be recovered from the raw document. Pages are
 * returned in /Kids order, so tests can assert which page a line landed on.
 */

const OBJECT_PATTERN = /(\d+) 0 obj\r?\n([\s\S]*?)\r?\nendobj/g;
const TEXT_SHOW_PATTERN = /\(((?:\\[\s\S]|[^\\)])*)\)\s*Tj/g;

function unescapeLiteral(body: string): string {
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    i += 1;
    const next = body[i];
    const octal = /^[0-7]{1,3}/.exec(body.slice(i));
    if (octal) {
      out += String.fromCharCode(parseInt(octal[0], 8));
      i += octal[0].length - 1;
      continue;
    }
    const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
    out += escapes[next] ?? next;
  }
  return out;
}

/** WinAnsiEncoding bytes 0x80–0x9F that differ from Latin-1 (jsPDF standard fonts). */
const WIN_ANSI_HIGH: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ',
  0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“',
  0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›',
  0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

/**
 * jsPDF writes a string as UTF-16BE code units (no BOM) when it contains a
 * character outside WinAnsi; otherwise one WinAnsi byte per character. Real
 * text never contains NUL, so a zero high byte marks the 2-byte form.
 */
function decodeTextString(bytes: string): string {
  const isUtf16 =
    bytes.length % 2 === 0 &&
    [...bytes].some((ch, index) => index % 2 === 0 && ch.charCodeAt(0) === 0);
  let chars = bytes;
  if (isUtf16) {
    chars = '';
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      chars += String.fromCharCode((bytes.charCodeAt(i) << 8) | bytes.charCodeAt(i + 1));
    }
  }
  // Characters that exist in WinAnsi keep their WinAnsi code even in the 2-byte form.
  return [...chars].map((ch) => WIN_ANSI_HIGH[ch.charCodeAt(0)] ?? ch).join('');
}

/** Text lines per page, in page order, from a raw (binary-string) PDF document. */
export function readPdfPages(raw: string): string[][] {
  return readPdfPageStreams(raw).map((stream) =>
    [...stream.matchAll(TEXT_SHOW_PATTERN)].map((m) => decodeTextString(unescapeLiteral(m[1]))),
  );
}

export interface PdfTextRun {
  text: string;
  /** Font resource name, e.g. "F1" (helvetica) or "F2" (helvetica-bold) for jsPDF standard fonts. */
  font: string;
  size: number;
}

/** Text runs per page with the font resource and size active when each was drawn. */
export function readPdfTextRuns(raw: string): PdfTextRun[][] {
  return readPdfPageStreams(raw).map((stream) => {
    const runs: PdfTextRun[] = [];
    let font = '';
    let size = 0;
    const pattern = new RegExp(`/(F\\d+) ([\\d.]+) Tf|${TEXT_SHOW_PATTERN.source}`, 'g');
    for (const m of stream.matchAll(pattern)) {
      if (m[1]) {
        font = m[1];
        size = Number(m[2]);
      } else {
        runs.push({ text: decodeTextString(unescapeLiteral(m[3])), font, size });
      }
    }
    return runs;
  });
}

const PT_PER_MM = 72 / 25.4;

/** Drawn image boxes (in mm; x from the left edge) per page, in drawing order. */
export function readPdfImagePlacementsMm(raw: string): { x: number; width: number; height: number }[][] {
  return readPdfPageStreams(raw).map((stream) =>
    [...stream.matchAll(/(-?[\d.]+) 0 0 (-?[\d.]+) (-?[\d.]+) -?[\d.]+ cm\r?\n\/I\d+ Do/g)].map((m) => ({
      x: Number(m[3]) / PT_PER_MM,
      width: Number(m[1]) / PT_PER_MM,
      height: Number(m[2]) / PT_PER_MM,
    })),
  );
}

/** Raw content stream per page, in /Kids order. */
function readPdfPageStreams(raw: string): string[] {
  const objects = new Map<number, string>();
  for (const match of raw.matchAll(OBJECT_PATTERN)) {
    objects.set(Number(match[1]), match[2]);
  }

  const pagesDict = [...objects.values()].find((body) => /\/Type \/Pages\b/.test(body));
  if (!pagesDict) throw new Error('PDF has no /Pages tree');
  const kids = [...(/\/Kids \[([^\]]*)\]/.exec(pagesDict)?.[1] ?? '').matchAll(/(\d+) 0 R/g)].map(
    (m) => Number(m[1]),
  );

  return kids.map((pageId) => {
    const pageDict = objects.get(pageId) ?? '';
    const contentsId = Number(/\/Contents (\d+) 0 R/.exec(pageDict)?.[1]);
    return /stream\r?\n([\s\S]*?)\r?\nendstream/.exec(objects.get(contentsId) ?? '')?.[1] ?? '';
  });
}

/** Read a PDF Blob (e.g. from `doc.output('blob')`) into per-page text lines. */
export async function readPdfBlobPages(blob: Blob): Promise<string[][]> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return readPdfPages(buffer.toString('latin1'));
}

/** Number of straight line segments (`m … l S`, as drawn by `doc.line`) in a raw PDF. */
export function countPdfLineSegments(raw: string): number {
  return (raw.match(/ m\r?\n[^\n]* l\r?\nS\r?\n/g) ?? []).length;
}

/** Number of /Image XObjects embedded in a raw PDF document. */
export function countPdfImages(raw: string): number {
  return (raw.match(/\/Subtype \/Image\b/g) ?? []).length;
}

export interface SavedPdf {
  filename: string;
  raw: string;
  pages: string[][];
}

/**
 * Build a `jspdf` module replacement for `vi.mock('jspdf', ...)` whose documents
 * are real jsPDF instances, except `save()` records the finished document instead
 * of starting a browser download.
 *
 * @example
 * const saved = vi.hoisted(() => [] as SavedPdf[]);
 * vi.mock('jspdf', async (importOriginal) =>
 *   createRecordingJsPdfModule(await importOriginal(), saved));
 */
export function createRecordingJsPdfModule<M extends { jsPDF: typeof import('jspdf').jsPDF }>(
  actual: M,
  saved: SavedPdf[],
): M & { default: M['jsPDF'] } {
  class RecordingJsPDF extends actual.jsPDF {
    constructor(...args: ConstructorParameters<typeof import('jspdf').jsPDF>) {
      super(...args);
      // jsPDF binds `save` per instance, so shadow it on the instance itself.
      Object.defineProperty(this, 'save', {
        configurable: true,
        writable: true,
        value: (filename?: string) => {
          const raw = this.output();
          saved.push({ filename: filename ?? 'generated.pdf', raw, pages: readPdfPages(raw) });
          return this;
        },
      });
    }
  }
  return { ...actual, jsPDF: RecordingJsPDF, default: RecordingJsPDF };
}
