/**
 * @param {{
 *  scenarioMinDurationMs: number,
 *  totalDurationMs: number,
 *  activityCount: number,
 *  spotlightCount?: number,
 *  videoSize?: { width: number, height: number },
 *  requiredCheckpointCount: number,
 *  passedCheckpointCount: number
 * }} input
 */
export function evaluateDemoQualityGate(input) {
  /** @type {Array<{ code: string, message: string }>} */
  const failures = [];

  if (input.totalDurationMs < input.scenarioMinDurationMs) {
    failures.push({
      code: 'MIN_DURATION_NOT_MET',
      message: `Run duration ${input.totalDurationMs}ms is below minimum ${input.scenarioMinDurationMs}ms.`
    });
  }

  if (input.activityCount < 2) {
    failures.push({
      code: 'LOW_ACTIVITY',
      message: `Run has low activity (${input.activityCount} meaningful actions).`
    });
  }

  if (input.videoSize) {
    const width = Number(input.videoSize.width);
    const height = Number(input.videoSize.height);
    const ratio = width / height;
    const isSixteenNine = Number.isFinite(ratio) && Math.abs(ratio - 16 / 9) < 0.01;
    if (!isSixteenNine || width < 1920 || height < 1080) {
      failures.push({
        code: 'VIDEO_SIZE_NOT_DETAILED_16_9',
        message: `Desktop demo video must be at least 1920x1080 16:9 (got ${width}x${height}).`
      });
    }
  }

  if (input.activityCount >= 2 && typeof input.spotlightCount === 'number') {
    const requiredSpotlights = Math.max(1, Math.ceil(input.activityCount * 0.3));
    if (input.spotlightCount < requiredSpotlights) {
      failures.push({
        code: 'LOW_SPOTLIGHT_COVERAGE',
        message: `Only ${input.spotlightCount}/${input.activityCount} actions had visible target spotlights.`
      });
    }
  }

  if (input.requiredCheckpointCount > input.passedCheckpointCount) {
    failures.push({
      code: 'CHECKPOINTS_MISSING',
      message: `Only ${input.passedCheckpointCount}/${input.requiredCheckpointCount} required checkpoints passed.`
    });
  }

  return {
    passed: failures.length === 0,
    failures
  };
}
