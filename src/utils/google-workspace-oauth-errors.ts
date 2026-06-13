const GOOGLE_WORKSPACE_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google Workspace connection was cancelled.',
  not_workspace_admin:
    'Only Google Workspace administrators can connect EquipQR for your organization.',
  session_expired: 'Your Google Workspace connection session expired. Please try again.',
  misconfigured:
    'Google Workspace is not configured correctly. Please contact your administrator.',
  consumer_account: 'Consumer Google accounts cannot use Google Workspace integration.',
  invalid_grant: 'The authorization link expired or was already used. Please try again.',
  csrf_error: 'We could not verify this connection request. Please try again.',
  domain_already_linked:
    'This Google Workspace domain is already linked to another EquipQR organization.',
  oauth_failed: 'Failed to connect Google Workspace. Please try again.',
};

export function getGoogleWorkspaceOAuthErrorMessage(
  errorCode: string | null,
  supportRef?: string | null,
): string {
  const base =
    (errorCode && GOOGLE_WORKSPACE_OAUTH_ERROR_MESSAGES[errorCode]) ||
    GOOGLE_WORKSPACE_OAUTH_ERROR_MESSAGES.oauth_failed;

  return supportRef ? `${base} Reference: ${supportRef}` : base;
}
