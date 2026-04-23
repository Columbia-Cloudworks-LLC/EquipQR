#!/usr/bin/env node
/**
 * Generates src/components/landing/stateVectors.ts from two sources:
 *
 * STATE_VECTORS  — per-state SVG paths, each normalised to its own 100×100
 *                  viewBox. Sourced from us-atlas states-albers-10m.json via
 *                  d3-geo. Used for MorphSVG morphing from a vertical line to
 *                  a state outline on individual-state cycles.
 *
 * STATES_RELATIVE — all 50 state paths in one shared 100×100 viewBox so they
 *                   render at correct relative sizes and positions. Sourced
 *                   directly from public/us.svg (Simplemaps, free licence) which
 *                   is a professionally made map on a 1000×589 canvas. Used for
 *                   the every-3rd-cycle national map view.
 *
 * Note: NATION_VECTOR was dropped. The national cycle uses a CSS scaleX
 * animation on the full STATES_RELATIVE SVG — visually equivalent to "the line
 * expands to reveal the US map" without MorphSVG performance limits.
 *
 * Run manually with:   npm run generate:state-vectors
 * Re-run when us-atlas or public/us.svg publishes a new edition.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { geoPath, geoIdentity } = await import('d3-geo');
const { feature } = await import('topojson-client');

const VIEWBOX = 100;

// ── Section 1: STATE_VECTORS from Albers topology ────────────────────────────

const topologyPath = path.join(
  __dirname, '..', 'node_modules', 'us-atlas', 'states-albers-10m.json',
);
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const statesGeo = feature(topology, topology.objects.states);

const FIPS_TO_ABBR = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '12': 'FL', '13': 'GA',
  '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
  '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD',
  '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO',
  '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ',
  '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC',
  '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT',
  '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY',
};

function ring2DArea(ring) {
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function largestPolygon(feat) {
  if (feat.geometry.type === 'Polygon') return feat;
  const polys = feat.geometry.coordinates;
  let maxArea = -Infinity;
  let best = polys[0];
  for (const poly of polys) {
    const area = ring2DArea(poly[0]);
    if (area > maxArea) { maxArea = area; best = poly; }
  }
  return { ...feat, geometry: { type: 'Polygon', coordinates: best } };
}

function extractNums(dStr) {
  const numRe = /-?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/gi;
  return (dStr.match(numRe) || []).map(Number);
}

function normalizePath(dStr) {
  const nums = extractNums(dStr);
  if (nums.length < 2) return dStr;
  const xs = [], ys = [];
  for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]); }
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = VIEWBOX / (Math.max(maxX - minX, maxY - minY) || 1);
  const numRe = /-?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/gi;
  let idx = 0;
  return dStr.replace(numRe, () => {
    const n = nums[idx]; const isX = idx % 2 === 0; idx++;
    const v = isX ? (n - minX) * scale : (n - minY) * scale;
    return Math.round(v * 100) / 100;
  });
}

function normalizePathShared(dStr, minX, minY, scale) {
  const nums = extractNums(dStr);
  if (nums.length < 2) return dStr;
  const numRe = /-?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/gi;
  let idx = 0;
  return dStr.replace(numRe, () => {
    const n = nums[idx]; const isX = idx % 2 === 0; idx++;
    const v = isX ? (n - minX) * scale : (n - minY) * scale;
    return Math.round(v * 100) / 100;
  });
}

const pathGen = geoPath(geoIdentity().reflectY(false));
const results = {};
const tooFewPoints = [];

for (const stateFeature of statesGeo.features) {
  const fips = String(stateFeature.id).padStart(2, '0');
  const abbr = FIPS_TO_ABBR[fips];
  if (!abbr) continue;
  const single = largestPolygon(stateFeature);
  const rawD = pathGen(single);
  if (!rawD) { process.stderr.write(`WARNING: ${abbr}: geoPath null\n`); continue; }
  const normalized = normalizePath(rawD);
  const cmdCount = (normalized.match(/[ML]/gi) || []).length;
  if (cmdCount < 12) tooFewPoints.push({ abbr, cmdCount });
  results[abbr] = normalized;
}

if (Object.keys(results).length !== 50) {
  process.stderr.write(`WARNING: expected 50 STATE_VECTORS, got ${Object.keys(results).length}\n`);
}
if (tooFewPoints.length > 0) {
  process.stderr.write(
    `WARNING: degenerate STATE_VECTORS (< 12 commands):\n` +
    tooFewPoints.map(s => `  ${s.abbr}: ${s.cmdCount}`).join('\n') + '\n',
  );
}

// ── Section 2: STATES_RELATIVE from public/us.svg ────────────────────────────
// The us.svg (Simplemaps, free for commercial use) is a professional US map on
// a 1000×589 canvas with each state as a separate <path id="XX"> element.
// We parse the d="" attribute for each 2-letter state id, collect ALL coordinates
// to find a shared bounding box, then normalise all paths together so they
// render at correct relative sizes and positions in a 100×100 viewBox.

const usSvgPath = path.join(__dirname, '..', 'public', 'us.svg');
const usSvgContent = fs.readFileSync(usSvgPath, 'utf8');

// Extract all <path id="XX" ... d="..." /> elements (id must be exactly 2 uppercase letters = state code)
const pathElRe = /<path[^>]+id="([A-Z]{2})"[^>]+d="([^"]+)"[^>]*\/?>/g;
const usPaths = {};
let match;

while ((match = pathElRe.exec(usSvgContent)) !== null) {
  const stateCode = match[1];
  const d = match[2];
  // Exclude DC (we only want the 50 states)
  if (stateCode === 'DC') continue;
  // Some SVGs list id before d — handle the other ordering too
  if (!usPaths[stateCode]) usPaths[stateCode] = d;
}

// Also handle attribute order: d="..." comes before id="..."
const pathElRe2 = /<path[^>]+d="([^"]+)"[^>]+id="([A-Z]{2})"[^>]*\/?>/g;
while ((match = pathElRe2.exec(usSvgContent)) !== null) {
  const d = match[1];
  const stateCode = match[2];
  if (stateCode === 'DC') continue;
  if (!usPaths[stateCode]) usPaths[stateCode] = d;
}

if (Object.keys(usPaths).length === 0) {
  // Fallback: broader parse for <path ... id="XX" ... data-id="XX" ... d="...">
  const broadRe = /<path\b([^>]*)>/g;
  while ((match = broadRe.exec(usSvgContent)) !== null) {
    const attrs = match[1];
    const idM = /\bid="([A-Z]{2})"/.exec(attrs);
    const dM = /\bd="([^"]+)"/.exec(attrs);
    if (idM && dM && idM[1] !== 'DC') {
      const stateCode = idM[1];
      if (!usPaths[stateCode]) usPaths[stateCode] = dM[1];
    }
  }
}

const FIFTY_STATE_CODES = Object.keys(FIPS_TO_ABBR).map(k => FIPS_TO_ABBR[k]);
const missingFromSvg = FIFTY_STATE_CODES.filter(s => !usPaths[s]);
if (missingFromSvg.length > 0) {
  process.stderr.write(`WARNING: states missing from us.svg: ${missingFromSvg.join(', ')}\n`);
}
process.stdout.write(`  us.svg: parsed ${Object.keys(usPaths).length} state paths\n`);

// Compute shared bounding box across all us.svg state paths
const allUsXs = [], allUsYs = [];
for (const d of Object.values(usPaths)) {
  const nums = extractNums(d);
  for (let i = 0; i + 1 < nums.length; i += 2) {
    allUsXs.push(nums[i]); allUsYs.push(nums[i + 1]);
  }
}
const usMinX = Math.min(...allUsXs), usMaxX = Math.max(...allUsXs);
const usMinY = Math.min(...allUsYs), usMaxY = Math.max(...allUsYs);
const usScale = VIEWBOX / (Math.max(usMaxX - usMinX, usMaxY - usMinY) || 1);

process.stdout.write(
  `  us.svg bbox: x ${usMinX.toFixed(1)}–${usMaxX.toFixed(1)}, y ${usMinY.toFixed(1)}–${usMaxY.toFixed(1)}, scale=${usScale.toFixed(4)}\n`,
);

const statesRelative = {};
for (const abbr of FIFTY_STATE_CODES) {
  if (usPaths[abbr]) {
    statesRelative[abbr] = normalizePathShared(usPaths[abbr], usMinX, usMinY, usScale);
  }
}

// ── Output file ───────────────────────────────────────────────────────────────
const abbrsSorted = FIFTY_STATE_CODES.sort();
const avgLen = Math.round(
  Object.values(results).reduce((s, d) => s + d.length, 0) / Object.keys(results).length,
);
const stateCodeUnion = abbrsSorted.map(a => `'${a}'`).join(' | ');

const usAtlasPkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'us-atlas', 'package.json'), 'utf8'),
);

const lines = [
  `// AUTO-GENERATED by scripts/generate-state-vectors.mjs — do not edit by hand.`,
  `// Re-run with: npm run generate:state-vectors`,
  `// Sources:`,
  `//   STATE_VECTORS:    us-atlas@${usAtlasPkg.version} (states-albers-10m.json)`,
  `//   STATES_RELATIVE:  public/us.svg (Simplemaps — free for commercial use)`,
  ``,
  `export type StateCode = ${stateCodeUnion};`,
  ``,
  `/**`,
  ` * Per-state SVG paths, each normalised to its own 100×100 viewBox.`,
  ` * Use for MorphSVG: morph a vertical line into the chosen state outline.`,
  ` */`,
  `export const STATE_VECTORS: Record<StateCode, string> = {`,
  ...abbrsSorted.map(abbr => `  ${abbr}: ${JSON.stringify(results[abbr] ?? '')},`),
  `};`,
  ``,
  `export const ALL_STATE_CODES: StateCode[] = [`,
  `  ${abbrsSorted.map(a => `'${a}'`).join(', ')},`,
  `];`,
  ``,
  `/**`,
  ` * All 50 state paths in one shared 100×100 viewBox, sourced from public/us.svg.`,
  ` * States render at their correct relative sizes and positions.`,
  ` * Use for the every-3rd-cycle national map view.`,
  ` */`,
  `export const STATES_RELATIVE: Record<StateCode, string> = {`,
  ...abbrsSorted.map(abbr => `  ${abbr}: ${JSON.stringify(statesRelative[abbr] ?? '')},`),
  `};`,
];

const outPath = path.join(__dirname, '..', 'src', 'components', 'landing', 'stateVectors.ts');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

const totalRelativeChars = Object.values(statesRelative).reduce((s, d) => s + d.length, 0);
process.stdout.write(
  `Generated ${outPath}\n` +
  `  STATE_VECTORS: ${Object.keys(results).length} states, avg ${avgLen} chars\n` +
  `  STATES_RELATIVE: ${Object.keys(statesRelative).length} states, ${totalRelativeChars} chars total\n`,
);

const LONG_PATH = 5000;
for (const [abbr, d] of Object.entries(results)) {
  if (d.length > LONG_PATH) {
    process.stdout.write(`  NOTE: STATE_VECTORS ${abbr} = ${d.length} chars\n`);
  }
}
