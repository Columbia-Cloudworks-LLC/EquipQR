import { describe, expect, it } from 'vitest';
import { evaluateDemoQualityGate } from '../../../scripts/lib/demoQualityGate.mjs';

describe('evaluateDemoQualityGate', () => {
  it('passes for healthy duration/activity/checkpoints', () => {
    const result = evaluateDemoQualityGate({
      scenarioMinDurationMs: 3000,
      totalDurationMs: 8000,
      activityCount: 5,
      requiredCheckpointCount: 2,
      passedCheckpointCount: 2
    });
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails for short and inactive runs', () => {
    const result = evaluateDemoQualityGate({
      scenarioMinDurationMs: 3000,
      totalDurationMs: 1000,
      activityCount: 1,
      requiredCheckpointCount: 2,
      passedCheckpointCount: 0
    });
    expect(result.passed).toBe(false);
    expect(result.failures.map((f) => f.code)).toEqual(
      expect.arrayContaining(['MIN_DURATION_NOT_MET', 'LOW_ACTIVITY', 'CHECKPOINTS_MISSING'])
    );
  });
});
