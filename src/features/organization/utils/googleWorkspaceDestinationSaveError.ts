export type GoogleWorkspaceDestinationSaveToast = {
  title: string;
  description: string;
  variant: 'error';
};

export function getGoogleWorkspaceDestinationSaveErrorToast(
  error: Error & { code?: string },
  defaultDescription: string,
): GoogleWorkspaceDestinationSaveToast {
  switch (error.code) {
    case 'insufficient_scopes':
      return {
        title: 'Reconnect Google Workspace',
        description:
          'Google Workspace needs updated Drive permissions. Reconnect Google Workspace on the Integrations page, then try again.',
        variant: 'error',
      };
    case 'token_revoked':
    case 'token_refresh_failed':
      return {
        title: 'Google Workspace Connection Expired',
        description:
          'Your Google Workspace connection expired or was revoked. Reconnect Google Workspace on the Integrations page, then try again.',
        variant: 'error',
      };
    case 'not_connected':
      return {
        title: 'Google Workspace Not Connected',
        description:
          'Google Workspace is no longer connected for this organization. Reconnect Google Workspace on the Integrations page, then try again.',
        variant: 'error',
      };
    default:
      return {
        title: 'Failed To Save Folder',
        description: error.message || defaultDescription,
        variant: 'error',
      };
  }
}
