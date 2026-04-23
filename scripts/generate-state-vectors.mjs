#!/usr/bin/env node
/**
 * Generates src/components/landing/stateVectors.ts from us-atlas TopoJSON.
 *
 * Uses states-albers-10m.json (pre-projected, 975×610 canvas).
 * The "10m" suffix means the topology is already simplified to 1:10,000,000
 * scale — no further simplification pass is applied. An extra topojson-simplify
 * pass (e.g. threshold 0.02) over-reduces states with near-straight borders
 * (Wyoming, Colorado, Utah) and small states (RI, DE) to 3–5 vertices,
 * producing triangles / pentagons instead of recognisable state outlines.
 *
 * Each state path is normalised into a 100×100 viewBox for consistent
 * MorphSVG morphing between the vertical-line origin and each state shape.
 *
 * Run manually with:   npm run generate:state-vectors
 * Re-run when us-atlas publishes a new boundary edition.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { geoPath, geoIdentity } = await import('d3-geo');
const { feature } = await import('topojson-client');

const VIEWBOX = 100;

// Pre-projected Albers USA topology (975×610 canvas)
const topologyPath = path.join(
  __dirname, '..', 'node_modules', 'us-atlas', 'states-albers-10m.json',
);
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));

// Use the topology as-is — it is already at 1:10M simplification.
const statesGeo = feature(topology, topology.objects.states);

// FIPS → abbreviation (50 states only; DC=11 and territories skipped intentionally)
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

/**
 * 2-D shoelace area of a single polygon ring (array of [x,y] pairs).
 * Uses pixel-space coordinates — correct for Albers-projected data.
 * (geoArea would be wrong here because it expects spherical lat/lon.)
 */
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

/**
 * For MultiPolygon features (Hawaii, Michigan, etc.), keep only the
 * largest-area polygon to produce a single clean outline for morphing.
 */
function largestPolygon(feat) {
  if (feat.geometry.type === 'Polygon') return feat;
  const polys = feat.geometry.coordinates;
  let maxArea = -Infinity;
  let best = polys[0];
  for (const poly of polys) {
    // poly[0] is the outer ring; remaining entries are holes
    const area = ring2DArea(poly[0]);
    if (area > maxArea) { maxArea = area; best = poly; }
  }
  return { ...feat, geometry: { type: 'Polygon', coordinates: best } };
}

/**
 * Re-scale an SVG path d-string so its bounding box maps onto [0,VIEWBOX]×[0,VIEWBOX].
 *
 * d3-geo with geoIdentity produces only M/L/Z commands for polygon data — each
 * number strictly alternates between an X and a Y coordinate — so the
 * even-index-X / odd-index-Y approach is safe here.
 */
function normalizePath(dStr) {
  const numRe = /-?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/gi;
  const nums = (dStr.match(numRe) || []).map(Number);
  if (nums.length < 2) return dStr;

  const xs = [];
  const ys = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    xs.push(nums[i]);
    ys.push(nums[i + 1]);
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = VIEWBOX / (Math.max(maxX - minX, maxY - minY) || 1);

  let idx = 0;
  return dStr.replace(numRe, () => {
    const n = nums[idx];
    const isX = idx % 2 === 0;
    idx++;
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
  if (!rawD) {
    process.stderr.write(`WARNING: ${abbr}: geoPath returned null — skipped\n`);
    continue;
  }

  const normalized = normalizePath(rawD);

  // Sanity-check: count path commands. A recognisable state should have ≥ 12
  // coordinate pairs. Fewer usually means over-simplification crept in.
  const commandCount = (normalized.match(/[ML]/gi) || []).length;
  if (commandCount < 12) {
    tooFewPoints.push({ abbr, commandCount });
  }

  results[abbr] = normalized;
}

if (Object.keys(results).length !== 50) {
  process.stderr.write(
    `WARNING: expected 50 states, got ${Object.keys(results).length}\n`,
  );
}

if (tooFewPoints.length > 0) {
  process.stderr.write(
    `WARNING: the following states have fewer than 12 path commands (may render as simple shapes):\n` +
    tooFewPoints.map(s => `  ${s.abbr}: ${s.commandCount} commands`).join('\n') + '\n',
  );
}

const abbrsSorted = Object.keys(results).sort();
const avgLen = Math.round(
  Object.values(results).reduce((s, d) => s + d.length, 0) / Object.keys(results).length,
);
const stateCodeUnion = abbrsSorted.map(a => `'${a}'`).join(' | ');

const usAtlasPkg = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'node_modules', 'us-atlas', 'package.json'),
    'utf8',
  ),
);

const lines = [
  `// AUTO-GENERATED by scripts/generate-state-vectors.mjs — do not edit by hand.`,
  `// Re-run with: npm run generate:state-vectors`,
  `// Source: us-atlas@${usAtlasPkg.version} (states-albers-10m.json, no secondary simplification)`,
  ``,
  `export type StateCode = ${stateCodeUnion};`,
  ``,
  `export const STATE_VECTORS: Record<StateCode, string> = {`,
  ...abbrsSorted.map(abbr => `  ${abbr}: ${JSON.stringify(results[abbr])},`),
  `};`,
  ``,
  `export const ALL_STATE_CODES: StateCode[] = [`,
  `  ${abbrsSorted.map(a => `'${a}'`).join(', ')},`,
  `];`,
];

const outPath = path.join(
  __dirname, '..', 'src', 'components', 'landing', 'stateVectors.ts',
);
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

process.stdout.write(
  `Generated ${outPath}\n` +
  `  ${Object.keys(results).length} states, avg d-length: ${avgLen} chars\n`,
);

const LONG_PATH = 5000;
for (const [abbr, d] of Object.entries(results)) {
  if (d.length > LONG_PATH) {
    process.stdout.write(`  NOTE: ${abbr} d-length = ${d.length} (complex border — MorphSVG will be slower)\n`);
  }
}
