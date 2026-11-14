import { MissingSecretError } from "./require-secret.ts";
import { createErrorResponse } from "./supabase-clients.ts";

type LogStep = (step: string, details?: Record<string, unknown>) => void;

/**
 * Logs an unexpected handler error server-side (never exposed to the client).
 * MissingSecretError is skipped because requireSecret already emitted its own
 * structured log line. Returns the extracted error message.
 */
export function logUnexpectedHandlerError(
  error: unknown,
  logStep: LogStep,
  correlationId: string,
): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!(error instanceof MissingSecretError)) {
    logStep("ERROR", { message, correlation_id: correlationId });
  }
  return message;
}

/**
 * Shared catch-block response for QuickBooks service functions: missing
 * secrets surface their own error, everything else is logged and masked as a
 * generic 500.
 */
export function createInternalErrorResponse(
  error: unknown,
  req: Request,
  logStep: LogStep,
  correlationId: string,
): Response {
  if (error instanceof MissingSecretError) {
    return createErrorResponse(error, 500, { req });
  }
  logUnexpectedHandlerError(error, logStep, correlationId);
  return createErrorResponse("An internal error occurred", 500, { req });
}
