export const synonymPairs: Array<[string, string]> = [
  ['caterpillar', 'cat'],
  ['john deere', 'deere'],
  ['kubota', 'kubota'],
  ['toyota', 'toyota'],
  ['doosan', 'doosan'],
  ['volvo', 'volvo'],
  ['hitachi', 'hitachi'],
  ['case', 'case'],
  ['komatsu', 'komatsu']
];

export function buildSynonymMap(): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const [a, b] of synonymPairs) {
    const k1 = a.toLowerCase();
    const k2 = b.toLowerCase();
    if (!map[k1]) map[k1] = new Set();
    if (!map[k2]) map[k2] = new Set();
    map[k1].add(k2);
    map[k2].add(k1);
  }
  const out: Record<string, string[]> = {};
  for (const k of Object.keys(map)) {
    out[k] = Array.from(map[k]);
  }
  return out;
}
