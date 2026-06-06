const SENSITIVE_LOG_KEYS = ["access_token", "refresh_token"] as const;

/**
 * Factory for edge-function log helpers that redact token fields before console output.
 */
export function createRedactedLogStep(tag: string) {
  return (step: string, details?: Record<string, unknown>) => {
    const safeDetails = details ? { ...details } : undefined;
    if (safeDetails) {
      for (const key of SENSITIVE_LOG_KEYS) {
        delete safeDetails[key];
      }
    }
    const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
    console.log(`[${tag}] ${step}${detailsStr}`);
  };
}
