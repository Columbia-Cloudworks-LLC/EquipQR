import { MissingSecretError } from "../_shared/require-secret.ts";

export const GW_OAUTH_ERROR_CODES = {
  ACCESS_DENIED: "access_denied",
  NOT_WORKSPACE_ADMIN: "not_workspace_admin",
  SESSION_EXPIRED: "session_expired",
  OAUTH_FAILED: "oauth_failed",
  MISCONFIGURED: "misconfigured",
  CONSUMER_ACCOUNT: "consumer_account",
  INVALID_GRANT: "invalid_grant",
  CSRF_ERROR: "csrf_error",
  DOMAIN_ALREADY_LINKED: "domain_already_linked",
} as const;

export type GoogleWorkspaceOAuthErrorCode =
  typeof GW_OAUTH_ERROR_CODES[keyof typeof GW_OAUTH_ERROR_CODES];

export class GoogleWorkspaceOAuthUserError extends Error {
  readonly code: GoogleWorkspaceOAuthErrorCode;

  constructor(code: GoogleWorkspaceOAuthErrorCode, logMessage?: string) {
    super(logMessage ?? code);
    this.name = "GoogleWorkspaceOAuthUserError";
    this.code = code;
  }
}

function mapMessageToErrorCode(message: string): GoogleWorkspaceOAuthErrorCode {
  if (message.includes("Invalid or expired OAuth session")) {
    return GW_OAUTH_ERROR_CODES.SESSION_EXPIRED;
  }
  if (message.includes("OAuth nonce mismatch")) {
    return GW_OAUTH_ERROR_CODES.CSRF_ERROR;
  }
  if (message.includes("Consumer Google accounts")) {
    return GW_OAUTH_ERROR_CODES.CONSUMER_ACCOUNT;
  }
  if (
    message.includes("Only Google Workspace administrators") ||
    message.includes("Only Google Workspace administrators can connect")
  ) {
    return GW_OAUTH_ERROR_CODES.NOT_WORKSPACE_ADMIN;
  }
  if (message.includes("Authorization code expired or already used")) {
    return GW_OAUTH_ERROR_CODES.INVALID_GRANT;
  }
  if (
    message.includes("OAuth configuration error") ||
    message.includes("Invalid OAuth redirect") ||
    message.includes("not configured")
  ) {
    return GW_OAUTH_ERROR_CODES.MISCONFIGURED;
  }
  if (message.includes("already linked to another EquipQR organization")) {
    return GW_OAUTH_ERROR_CODES.DOMAIN_ALREADY_LINKED;
  }
  return GW_OAUTH_ERROR_CODES.OAUTH_FAILED;
}

export function resolveGoogleWorkspaceOAuthErrorCode(
  error: unknown,
): GoogleWorkspaceOAuthErrorCode {
  if (error instanceof GoogleWorkspaceOAuthUserError) {
    return error.code;
  }

  if (error instanceof MissingSecretError) {
    return GW_OAUTH_ERROR_CODES.MISCONFIGURED;
  }

  if (error instanceof Error) {
    return mapMessageToErrorCode(error.message);
  }

  return GW_OAUTH_ERROR_CODES.OAUTH_FAILED;
}

export function resolveGoogleOAuthCallbackErrorCode(
  googleError: string | null,
): GoogleWorkspaceOAuthErrorCode {
  switch (googleError) {
    case "access_denied":
      return GW_OAUTH_ERROR_CODES.ACCESS_DENIED;
    case "invalid_scope":
    case "unauthorized_client":
      return GW_OAUTH_ERROR_CODES.MISCONFIGURED;
    case "temporarily_unavailable":
    case "server_error":
      return GW_OAUTH_ERROR_CODES.OAUTH_FAILED;
    default:
      return GW_OAUTH_ERROR_CODES.OAUTH_FAILED;
  }
}

export const __gwOauthUserErrorTestables = {
  mapMessageToErrorCode,
  resolveGoogleWorkspaceOAuthErrorCode,
  resolveGoogleOAuthCallbackErrorCode,
};
