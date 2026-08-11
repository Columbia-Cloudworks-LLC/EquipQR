import { describe, expect, it } from 'vitest';
import { evaluateDemoQualityGate } from './demoQualityGate.mjs';

describe('evaluateDemoQualityGate', () => {
  it('passes for healthy duration/activity/checkpoints', () => {
    const result = evaluateDemoQualityGate({
      scenarioMinDurationMs: 3000,
      totalDurationMs: 8000,
      activityCount: 5,
      spotlightCount: 4,
      videoSize: { width: 1920, height: 1080 },
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

  it('fails when desktop demo video is not detailed 16:9', () => {
    const result = evaluateDemoQualityGate({
      scenarioMinDurationMs: 3000,
      totalDurationMs: 8000,
      activityCount: 4,
      spotlightCount: 4,
      videoSize: { width: 1366, height: 900 },
      requiredCheckpointCount: 1,
      passedCheckpointCount: 1
    });

    expect(result.passed).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('VIDEO_SIZE_NOT_DETAILED_16_9');
  });

  it('fails when too few visible action spotlights are recorded', () => {
    const result = evaluateDemoQualityGate({
      scenarioMinDurationMs: 3000,
      totalDurationMs: 8000,
      activityCount: 6,
      spotlightCount: 1,
      videoSize: { width: 1920, height: 1080 },
      requiredCheckpointCount: 1,
      passedCheckpointCount: 1
    });

    expect(result.passed).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('LOW_SPOTLIGHT_COVERAGE');
  });
});
