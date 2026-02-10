import { describe, it, expect } from 'vitest';
import { jitterPoints, getClusterMembers, type JitteredPoint } from '../jitterPoints';
import type { FleetEfficiencyPoint } from '@/features/teams/services/teamFleetEfficiencyService';

function makePoint(overrides: Partial<FleetEfficiencyPoint> & { teamId: string }): FleetEfficiencyPoint {
  return {
    teamName: `Team ${overrides.teamId}`,
    equipmentCount: 10,
    activeWorkOrdersCount: 5,
    ...overrides,
  };
}

describe('jitterPoints', () => {
  it('returns an empty array for empty input', () => {
    expect(jitterPoints([])).toEqual([]);
  });

  it('returns a single point with no jitter', () => {
    const input = [makePoint({ teamId: 'a', equipmentCount: 5, activeWorkOrdersCount: 3 })];
    const result = jitterPoints(input);

    expect(result).toHaveLength(1);
    expect(result[0].jitteredX).toBe(5);
    expect(result[0].jitteredY).toBe(3);
    expect(result[0].clusterSize).toBe(1);
    expect(result[0].clusterIndex).toBe(0);
  });

  it('jitters two overlapping points away from each other', () => {
    const input = [
      makePoint({ teamId: 'a', equipmentCount: 10, activeWorkOrdersCount: 5 }),
      makePoint({ teamId: 'b', equipmentCount: 10, activeWorkOrdersCount: 5 }),
    ];
    const result = jitterPoints(input);

    expect(result).toHaveLength(2);
    // Both should have cluster size 2
    expect(result[0].clusterSize).toBe(2);
    expect(result[1].clusterSize).toBe(2);
    // They should not be at the same jittered position
    const samePosition =
      result[0].jitteredX === result[1].jitteredX &&
      result[0].jitteredY === result[1].jitteredY;
    expect(samePosition).toBe(false);
  });

  it('produces deterministic output for the same input', () => {
    const input = [
      makePoint({ teamId: 'c', equipmentCount: 10, activeWorkOrdersCount: 5 }),
      makePoint({ teamId: 'a', equipmentCount: 10, activeWorkOrdersCount: 5 }),
      makePoint({ teamId: 'b', equipmentCount: 10, activeWorkOrdersCount: 5 }),
    ];

    const result1 = jitterPoints(input);
    const result2 = jitterPoints(input);

    expect(result1).toEqual(result2);
  });

  it('preserves deterministic order regardless of input order', () => {
    const pointA = makePoint({ teamId: 'a', equipmentCount: 10, activeWorkOrdersCount: 5 });
    const pointB = makePoint({ teamId: 'b', equipmentCount: 10, activeWorkOrdersCount: 5 });

    // Different input orders
    const result1 = jitterPoints([pointA, pointB]);
    const result2 = jitterPoints([pointB, pointA]);

    // Results should be identical because sorting by teamId is deterministic
    expect(result1.map(p => p.teamId)).toEqual(result2.map(p => p.teamId));
    expect(result1[0].jitteredX).toBeCloseTo(result2[0].jitteredX);
    expect(result1[0].jitteredY).toBeCloseTo(result2[0].jitteredY);
  });

  it('assigns correct cluster metadata for groups of 3+', () => {
    const input = [
      makePoint({ teamId: 'a', equipmentCount: 10, activeWorkOrdersCount: 5 }),
      makePoint({ teamId: 'b', equipmentCount: 10, activeWorkOrdersCount: 5 }),
      makePoint({ teamId: 'c', equipmentCount: 10, activeWorkOrdersCount: 5 }),
    ];
    const result = jitterPoints(input);

    expect(result).toHaveLength(3);
    for (const p of result) {
      expect(p.clusterSize).toBe(3);
      expect(p.clusterKey).toBe('10,5');
    }
    // Cluster indices should be 0, 1, 2 (sorted by teamId)
    const indices = result.map((p) => p.clusterIndex).sort();
    expect(indices).toEqual([0, 1, 2]);
  });

  it('handles mixed: some overlapping, some unique', () => {
    const input = [
      makePoint({ teamId: 'a', equipmentCount: 10, activeWorkOrdersCount: 5 }),
      makePoint({ teamId: 'b', equipmentCount: 10, activeWorkOrdersCount: 5 }),
      makePoint({ teamId: 'c', equipmentCount: 20, activeWorkOrdersCount: 3 }),
    ];
    const result = jitterPoints(input);

    expect(result).toHaveLength(3);

    const cluster10_5 = result.filter((p) => p.clusterKey === '10,5');
    const single20_3 = result.filter((p) => p.clusterKey === '20,3');

    expect(cluster10_5).toHaveLength(2);
    expect(cluster10_5[0].clusterSize).toBe(2);
    expect(single20_3).toHaveLength(1);
    expect(single20_3[0].clusterSize).toBe(1);
    expect(single20_3[0].jitteredX).toBe(20);
    expect(single20_3[0].jitteredY).toBe(3);
  });

  it('spiral placement spreads N=5 points evenly around center', () => {
    const input = Array.from({ length: 5 }, (_, i) =>
      makePoint({ teamId: `team-${String(i).padStart(2, '0')}`, equipmentCount: 10, activeWorkOrdersCount: 10 })
    );
    const result = jitterPoints(input);

    expect(result).toHaveLength(5);

    // All should have the same cluster key
    const keys = new Set(result.map((p) => p.clusterKey));
    expect(keys.size).toBe(1);

    // All jittered positions should be different
    const positions = new Set(result.map((p) => `${p.jitteredX},${p.jitteredY}`));
    expect(positions.size).toBe(5);
  });

  it('handles 10 overlapping points', () => {
    const input = Array.from({ length: 10 }, (_, i) =>
      makePoint({ teamId: `t-${String(i).padStart(2, '0')}`, equipmentCount: 5, activeWorkOrdersCount: 5 })
    );
    const result = jitterPoints(input);

    expect(result).toHaveLength(10);
    for (const p of result) {
      expect(p.clusterSize).toBe(10);
    }

    // All positions should be unique
    const positions = new Set(result.map((p) => `${p.jitteredX.toFixed(6)},${p.jitteredY.toFixed(6)}`));
    expect(positions.size).toBe(10);
  });

  it('radius scales with axis range', () => {
    // Wide axis range — larger jitter
    const wideInput = [
      makePoint({ teamId: 'a', equipmentCount: 0, activeWorkOrdersCount: 0 }),
      makePoint({ teamId: 'b', equipmentCount: 0, activeWorkOrdersCount: 0 }),
      makePoint({ teamId: 'c', equipmentCount: 100, activeWorkOrdersCount: 100 }),
    ];
    const wideResult = jitterPoints(wideInput);
    const wideSpread = Math.abs(wideResult[0].jitteredX - wideResult[1].jitteredX);

    // Narrow axis range — smaller jitter
    const narrowInput = [
      makePoint({ teamId: 'a', equipmentCount: 10, activeWorkOrdersCount: 10 }),
      makePoint({ teamId: 'b', equipmentCount: 10, activeWorkOrdersCount: 10 }),
      makePoint({ teamId: 'c', equipmentCount: 12, activeWorkOrdersCount: 12 }),
    ];
    const narrowResult = jitterPoints(narrowInput);
    const narrowSpread = Math.abs(narrowResult[0].jitteredX - narrowResult[1].jitteredX);

    expect(wideSpread).toBeGreaterThan(narrowSpread);
  });

  it('preserves original data fields on each jittered point', () => {
    const input = [makePoint({ teamId: 'abc', equipmentCount: 7, activeWorkOrdersCount: 3, teamName: 'Alpha' })];
    const result = jitterPoints(input);

    expect(result[0].teamId).toBe('abc');
    expect(result[0].teamName).toBe('Alpha');
    expect(result[0].equipmentCount).toBe(7);
    expect(result[0].activeWorkOrdersCount).toBe(3);
  });
});

describe('getClusterMembers', () => {
  it('returns all points matching the cluster key', () => {
    const input = [
      makePoint({ teamId: 'a', equipmentCount: 10, activeWorkOrdersCount: 5 }),
      makePoint({ teamId: 'b', equipmentCount: 10, activeWorkOrdersCount: 5 }),
      makePoint({ teamId: 'c', equipmentCount: 20, activeWorkOrdersCount: 3 }),
    ];
    const jittered = jitterPoints(input);
    const members = getClusterMembers(jittered, '10,5');

    expect(members).toHaveLength(2);
    expect(members.map((m) => m.teamId).sort()).toEqual(['a', 'b']);
  });

  it('returns empty array for non-existent cluster key', () => {
    const input = [makePoint({ teamId: 'a', equipmentCount: 1, activeWorkOrdersCount: 1 })];
    const jittered = jitterPoints(input);
    const members = getClusterMembers(jittered, '99,99');

    expect(members).toEqual([]);
  });
});
