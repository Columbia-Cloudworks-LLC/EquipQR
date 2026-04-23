import type { StateCode } from './stateVectors';

const VIEWBOX = 100;

/** Simple linear-congruential PRNG seeded by a number. */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Convert a string to a numeric seed (sum of char codes). */
export function strToSeed(str: string): number {
  return str.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export interface DotPosition {
  id: number;
  cx: number;
  cy: number;
}

/**
 * Compute deterministic dot positions for a given state key.
 * Same stateKey + dotCount always returns the same positions — stable across
 * renders and shareable between AssetDotsPhase and HeroAnimation for choosing
 * which dot to highlight in Phase 5.
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
 * Deterministically pick one dot from the list based on the stateKey.
 * Same stateKey always picks the same dot — the one that will be highlighted
 * in Phase 5 for the work-order sequence.
 *
 * The pick avoids dots that are very near the edges of the canvas (< 10 or > 90)
 * so the horizontal Phase-5 line always has room to extend.
 */
export function chosenDotIndex(stateKey: StateCode, dots: DotPosition[]): number {
  const midrange = dots.filter(d => d.cx > 10 && d.cx < 90 && d.cy > 10 && d.cy < 90);
  const pool = midrange.length > 0 ? midrange : dots;
  const seed = strToSeed(stateKey + '_pick');
  return pool[Math.floor((seed % pool.length + pool.length) % pool.length)].id;
}
