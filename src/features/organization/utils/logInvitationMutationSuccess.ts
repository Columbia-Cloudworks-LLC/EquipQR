import { logInvitationPerformance } from '@/features/organization/utils/invitationPerformanceLog';

export async function logInvitationMutationSuccess(
  functionName: string,
  startTime: number,
): Promise<void> {
  const executionTime = performance.now() - startTime;
  await logInvitationPerformance({
    functionName,
    executionTimeMs: executionTime,
    success: true,
  });
}
