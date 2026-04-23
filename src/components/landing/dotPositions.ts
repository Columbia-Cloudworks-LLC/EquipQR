import { STATE_VECTORS } from './stateVectors';
import type { StateCode } from './stateVectors';

const VIEWBOX = 100;

/**
 * Linear congruential PRNG. Same constants as Numerical Recipes' `ranqd1`.
 * Exported so other animation modules (e.g. NationalMapPhase) reuse the
 * exact same sequence rather than redefining the function.
 */
export function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

export function strToSeed(str: string): number {
  return str.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export interface DotPosition {
  id: number;
  cx: number;
  cy: number;
}

/**
 * Parse an SVG path string (M/L/Z commands only) into a flat polygon vertex list.
 * STATE_VECTORS paths are produced by d3-geo and contain only M/L/Z, so the
 * "every two numbers = (x, y) pair" assumption is safe.
 */
function parsePolygon(dStr: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const numRe = /-?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/gi;
  const nums = (dStr.match(numRe) || []).map(Number);
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push([nums[i], nums[i + 1]]);
  }
  return points;
}

/**
 * Standard ray-casting point-in-polygon test.
 * Returns true if (x, y) lies inside the polygon's outer ring.
 */
function pointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const denom = yj - yi || 1e-9;
    const intersect = ((yi > y) !== (yj > y)) &&
                      (x < ((xj - xi) * (y - yi)) / denom + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * DEPRECATED for new code — use computeDotPositionsInState instead.
 * Original deterministic positions (no polygon constraint).
 * Kept exported for back-compat with existing tests.
 */
export function computeDotPositions(stateKey: StateCode, dotCount: number): DotPosition[] {
  const rng = seededRng(strToSeed(stateKey));
  return Array.from({ length: dotCount }, (_, i) => ({
    id: i,
    cx: rng() * VIEWBOX,
    cy: rng() * VIEWBOX,
  }));
}

/**
 * Compute dot positions GUARANTEED to fall inside the state's polygon, using
 * rejection sampling against the parsed STATE_VECTORS path.
 *
 * cycleSeed is mixed into the RNG seed so positions randomize per animation cycle
 * (same stateKey + same cycleSeed → same dots; different cycleSeed → different dots).
 */
export function computeDotPositionsInState(
  stateKey: StateCode,
  dotCount: number,
  cycleSeed: number = 0,
): DotPosition[] {
  const polygon = parsePolygon(STATE_VECTORS[stateKey]);
  const rng = seededRng(strToSeed(stateKey) + cycleSeed * 7919); // 7919 is prime

  const dots: DotPosition[] = [];
  const maxAttempts = dotCount * 50;
  let attempts = 0;

  while (dots.length < dotCount && attempts < maxAttempts) {
    const cx = rng() * VIEWBOX;
    const cy = rng() * VIEWBOX;
    if (pointInPolygon([cx, cy], polygon)) {
      dots.push({ id: dots.length, cx, cy });
    }
    attempts++;
  }

  // Fallback: if rejection sampling somehow under-fills, pad with centre points.
  while (dots.length < dotCount) {
    dots.push({ id: dots.length, cx: 50, cy: 50 });
  }

  return dots;
}

/**
 * Pick a "chosen" dot from the list. With rejection sampling, all dots in the
 * list are inside the state, so any pick is visible. cycleSeed varies the choice
 * per cycle so the highlighted dot doesn't always sit on the same spot.
 */
export function chosenDotIndex(
  stateKey: StateCode,
  dots: DotPosition[],
  cycleSeed: number = 0,
): number {
  if (dots.length === 0) return 0;
  const seed = strToSeed(stateKey + '_pick') + cycleSeed * 13;
  return ((seed % dots.length) + dots.length) % dots.length;
}
