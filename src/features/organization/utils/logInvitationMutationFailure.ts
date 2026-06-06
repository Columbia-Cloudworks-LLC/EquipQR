import { logger } from '@/utils/logger';
import { logInvitationPerformance } from '@/features/organization/utils/invitationPerformanceLog';

export async function logInvitationMutationFailure(
  functionName: string,
  startTime: number,
  error: unknown,
  logLabel: string,
): Promise<void> {
  const executionTime = performance.now() - startTime;
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error(logLabel, error);

  await logInvitationPerformance({
    functionName,
    executionTimeMs: executionTime,
    success: false,
    errorMessage,
  });
}
