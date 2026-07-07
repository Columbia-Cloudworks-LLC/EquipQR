/**
 * Deterministic seeded RNG for reproducible seed-data generation.
 *
 * Same LCG used by the original large-inventory generator so regenerated
 * output stays stable across machines and Node versions for a given seed.
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x80000000;
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  /** Price rounded to cents in [min, max]. */
  price(min: number, max: number): number {
    const price = min + this.next() * (max - min);
    return Math.round(price * 100) / 100;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
