import { describe, expect, it } from 'vitest';
import { getPMChecklistStats } from './pmChecklistStats';

describe('getPMChecklistStats', () => {
  it('returns zero counts for missing or invalid checklist data', () => {
    expect(getPMChecklistStats(undefined)).toEqual({ progress: 0, total: 0 });
    expect(getPMChecklistStats({})).toEqual({ progress: 0, total: 0 });
    expect(getPMChecklistStats('not-json')).toEqual({ progress: 0, total: 0 });
  });

  it('parses JSON string checklists', () => {
    const checklist = JSON.stringify([
      { id: '1', condition: 'good' },
      { id: '2', condition: null },
    ]);

    expect(getPMChecklistStats(checklist)).toEqual({ progress: 1, total: 2 });
  });

  it('counts only items with a recorded condition', () => {
    expect(
      getPMChecklistStats([
        { id: '1', condition: 'good' },
        { id: '2', condition: undefined },
        { id: '3', condition: 'bad' },
      ]),
    ).toEqual({ progress: 2, total: 3 });
  });
});
