/**
 * @param {{
 *  scenarioMinDurationMs: number,
 *  totalDurationMs: number,
 *  activityCount: number,
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
