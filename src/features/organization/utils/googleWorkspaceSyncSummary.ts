import type { GoogleWorkspaceSyncResult } from '@/services/google-workspace';

/** " Revoked access for N member(s)." when a sync deactivated members or revoked claims, else "". */
export function describeGoogleWorkspaceSyncRevocations(
  result: Pick<GoogleWorkspaceSyncResult, 'membersDeactivated' | 'claimsRevoked'>,
): string {
  return result.membersDeactivated > 0 || result.claimsRevoked > 0
    ? ` Revoked access for ${result.membersDeactivated} member(s).`
    : '';
}
