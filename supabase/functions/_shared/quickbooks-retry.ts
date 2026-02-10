/**
 * Shared retry / resilience utilities for QuickBooks API calls.
 *
 * Implements the best-practice patterns from the intuit-qbo-dev skill:
 *   • Automatic 401 refresh-and-retry (1 attempt)
 *   • Exponential back-off with jitter for 429 and 5xx (up to 3 attempts)
 *   • Fault-in-200 detection (QBO can return HTTP 200 with a Fault body)
 *   • SyncToken mismatch (error 3200) detection
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single error entry inside a QBO Fault response. */
export interface QboFaultError {
  Message?: string;
  Detail?: string;
  code?: string;
  element?: string;
}

/** The Fault object that QBO may embed in an otherwise-200 JSON response. */
export interface QboFault {
  Error?: QboFaultError[];
  type?: string;
}

/** Typed result returned by {@link qboFetch}. */
export interface QboFetchResult<T = unknown> {
  /** The parsed JSON body (excluding Fault responses). */
  data: T;
  /** The raw Response for header inspection (e.g. intuit_tid). */
  response: Response;
}

/** Thrown when the QBO response contains a Fault object. */
export class QboFaultError_ extends Error {
  public readonly fault: QboFault;
  public readonly codes: string[];
  public readonly intuitTid: string | null;

  constructor(fault: QboFault, intuitTid: string | null) {
    const codes = (fault.Error || []).map((e) => e.code || "unknown");
    const messages = (fault.Error || []).map((e) => e.Message || e.Detail || "unknown");
    super(`QBO Fault [${fault.type || "Unknown"}]: ${messages.join("; ")} (codes: ${codes.join(",")})`);
    this.name = "QboFaultError";
    this.fault = fault;
    this.codes = codes;
    this.intuitTid = intuitTid;
  }

  /** True when the Fault contains a stale-object / SyncToken mismatch. */
  get isSyncTokenError(): boolean {
    return this.codes.includes("3200");
  }
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

export interface QboFetchOptions {
  /**
   * Optional callback that is invoked when a 401 is encountered and a fresh
   * access token is needed.  Return the new token string.  If not provided
   * (or if it throws), the 401 will propagate.
   */
  onRefreshToken?: () => Promise<string>;
  /** Maximum total attempts (default 3). */
  maxAttempts?: number;
  /** Label for log lines (e.g. "invoice-create"). */
  label?: string;
}

/**
 * Wrapper around `fetch` that adds QBO-specific resilience:
 *
 * 1. Checks for `Fault` objects in 200 OK response bodies.
 * 2. Retries on 401 after calling `onRefreshToken`.
 * 3. Retries on 429 and 5xx with exponential back-off + jitter.
 *
 * Returns the parsed JSON body and the raw Response (for header access).
 *
 * @throws {QboFaultError_} when the response contains a Fault.
 * @throws {Error} when all retry attempts are exhausted.
 */
export async function qboFetch<T = unknown>(
  url: string,
  init: RequestInit,
  opts: QboFetchOptions = {},
): Promise<QboFetchResult<T>> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const label = opts.label ?? "qbo-fetch";

  let lastError: Error | undefined;
  let tokenRefreshed = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init);
      const intuitTid =
        response.headers.get("intuit_tid") || null;
      const status = response.status;

      // ----- 401: refresh token and retry once -----
      if (status === 401 && !tokenRefreshed && opts.onRefreshToken) {
        console.log(
          JSON.stringify({ level: "info", label, event: "token_refresh", attempt: attempt + 1 }),
        );
        const newToken = await opts.onRefreshToken();
        tokenRefreshed = true;
        // Patch the Authorization header for the next attempt
        const headers = new Headers(init.headers);
        headers.set("Authorization", `Bearer ${newToken}`);
        init = { ...init, headers };
        continue; // retry immediately
      }

      // ----- 429 / 5xx: exponential back-off with jitter -----
      if ((status === 429 || status >= 500) && attempt < maxAttempts - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
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

      // ----- Non-OK and no more retries -----
      if (!response.ok) {
        // Consume the body to prevent resource leaks, but do NOT include
        // upstream response content in errors or logs — it may contain
        // sensitive/internal details from the QBO API.
        await response.text().catch(() => {});
        throw new Error(
          `QBO API error: status ${status} (intuit_tid: ${intuitTid ?? "unknown"})`,
        );
      }

      // ----- Parse JSON and check for Fault-in-200 -----
      const json = await response.json();

      if (json && typeof json === "object" && "Fault" in json) {
        throw new QboFaultError_(json.Fault as QboFault, intuitTid);
      }

      return { data: json as T, response };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // If it's a Fault error, don't retry (business logic error)
      if (err instanceof QboFaultError_) {
        throw err;
      }

      // Network errors: retry with back-off
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
