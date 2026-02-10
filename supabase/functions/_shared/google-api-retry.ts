/**
 * Shared retry / resilience utility for Google Workspace API calls.
 *
 * Implements exponential back-off with jitter for transient failures:
 *   - 429 Too Many Requests (rate limited)
 *   - 503 Service Unavailable
 *   - Network errors (fetch failures)
 *
 * Keeps maxRetries small (default 3) to stay within Edge Function timeout limits.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleApiFetchOptions {
  /** Maximum total attempts including the first (default 3). */
  maxAttempts?: number;
  /** Label for structured log lines (e.g. "sheets-write", "drive-upload"). */
  label?: string;
}

/**
 * Wrapper around `fetch` that adds retry logic for transient Google API errors.
 *
 * Retries on:
 * - HTTP 429 (rate limited) — uses Retry-After header if present
 * - HTTP 503 (service unavailable)
 * - Network/fetch errors (e.g. DNS, connection reset)
 *
 * Does NOT retry on:
 * - 4xx errors other than 429 (these are client errors / permission issues)
 * - 5xx errors other than 503 (500 = server bug, 502 = bad gateway)
 *
 * @param url - The URL to fetch
 * @param init - Standard RequestInit (method, headers, body, etc.)
 * @param opts - Retry configuration
 * @returns The raw Response object from a successful (non-retriable) attempt
 * @throws Error when all retry attempts are exhausted
 */
export async function googleApiFetch(
  url: string,
  init: RequestInit,
  opts: GoogleApiFetchOptions = {},
): Promise<Response> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const label = opts.label ?? "google-api";

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init);
      const status = response.status;

      // ----- 429 / 503: exponential back-off with jitter -----
      if ((status === 429 || status === 503) && attempt < maxAttempts - 1) {
        // Drain the response body to release the connection before retrying
        await response.body?.cancel().catch(() => {});

        // Prefer Retry-After header from Google (seconds), fall back to exponential backoff
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
        const delay = !isNaN(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : Math.pow(2, attempt) * 1000 + Math.random() * 1000;

        console.log(
          JSON.stringify({
            level: "warn",
            label,
            event: "retry",
            status,
            delay_ms: Math.round(delay),
            attempt: attempt + 1,
            max_attempts: maxAttempts,
          }),
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // ----- All other responses: return as-is (caller handles errors) -----
      return response;
    } catch (err) {
      // Network / transient errors: retry with back-off
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(
          JSON.stringify({
            level: "warn",
            label,
            event: "network_retry",
            error_name: lastError.name,
            delay_ms: Math.round(delay),
            attempt: attempt + 1,
            max_attempts: maxAttempts,
          }),
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError ?? new Error(`[${label}] All ${maxAttempts} attempts exhausted`);
}
