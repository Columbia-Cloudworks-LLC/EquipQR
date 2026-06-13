import { describe, expect, it } from 'vitest';
import { getGoogleWorkspaceOAuthErrorMessage } from '@/utils/google-workspace-oauth-errors';

describe('getGoogleWorkspaceOAuthErrorMessage', () => {
  it('maps known error codes to safe user-facing messages', () => {
    expect(getGoogleWorkspaceOAuthErrorMessage('not_workspace_admin')).toBe(
      'Only Google Workspace administrators can connect EquipQR for your organization.',
    );
  });

  it('ignores unsafe legacy descriptions by mapping only the error code', () => {
    expect(getGoogleWorkspaceOAuthErrorMessage('oauth_failed')).toBe(
      'Failed to connect Google Workspace. Please try again.',
    );
  });

  it('maps domain_already_linked to a specific user-facing message', () => {
    expect(getGoogleWorkspaceOAuthErrorMessage('domain_already_linked')).toBe(
      'This Google Workspace domain is already linked to another EquipQR organization.',
    );
  });

  it('appends a support reference when provided', () => {
    expect(getGoogleWorkspaceOAuthErrorMessage('oauth_failed', 'corr-123')).toBe(
      'Failed to connect Google Workspace. Please try again. Reference: corr-123',
    );
  });
});
