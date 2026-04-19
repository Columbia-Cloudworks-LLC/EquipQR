/**
 * Required-secret helper for Edge Functions.
 *
 * Provides a single, auditable boundary for loading runtime secrets from
 * `Deno.env`. Replaces the per-function ad-hoc pattern of:
 *
 *   const key = Deno.env.get("X") ?? Deno.env.get("LEGACY_X");
 *   if (!key) throw new Error("X is not configured");
 *
 * Goals:
 *   - Operators get a stable, greppable structured log line
 *     ({"code":"MISSING_REQUIRED_SECRET",...}) when a secret is absent.
 *   - Secret *values* are never logged, even partially. Only names and
 *     a presence boolean are emitted.
 *   - Calling code throws a typed `MissingSecretError` that
 *     `createErrorResponse` knows how to convert into a generic 500
 *     without leaking the secret name to the client.
 *
 * This is the canonical way to read a secret in any Edge Function.
 * For non-sensitive optional config use `optionalSecret`.
 *
 * Security boundary: the structured log lands in the Supabase Edge
 * Function log stream (operator-only). The client receives only the
 * generic message produced by `createErrorResponse`.
 */

export interface RequireSecretOptions {
  /** The function emitting this log — used as a tag in the JSON line. */
  functionName: string;
  /**
   * Older secret names still accepted as a fallback (in priority order).
   * Useful during a rename so existing deployments keep working.
   * Names only — never values.
   */
  legacyAliases?: string[];
}

export interface OptionalSecretOptions {
  /** Older secret names still accepted as a fallback (in priority order). */
  legacyAliases?: string[];
}

/**
 * Thrown when a required secret is absent. Carries the name of the
 * secret that was missing and any legacy aliases that were also tried,
 * so callers (and `createErrorResponse`) can attribute the failure
 * without consulting the log stream.
 *
 * The constructor emits a single structured log line; callers should
 * **not** catch this error and re-log it.
 */
export class MissingSecretError extends Error {
  public readonly secretName: string;
  public readonly legacyAliasesChecked: string[];
  public readonly functionName: string;

  constructor(opts: {
    secretName: string;
    functionName: string;
    legacyAliasesChecked: string[];
  }) {
    super(`Missing required secret: ${opts.secretName}`);
    this.name = "MissingSecretError";
    this.secretName = opts.secretName;
    this.functionName = opts.functionName;
    this.legacyAliasesChecked = opts.legacyAliasesChecked;

    // Emit exactly one structured log line. Operators can grep for
    // `"code":"MISSING_REQUIRED_SECRET"` across all Edge Function logs
    // to find every instance regardless of which function fired it.
    const logLine = {
      level: "error",
      code: "MISSING_REQUIRED_SECRET",
      function: opts.functionName,
      secret: opts.secretName,
      legacyAliasesChecked: opts.legacyAliasesChecked,
      timestamp: new Date().toISOString(),
    };
    console.error(JSON.stringify(logLine));
  }
}

/**
 * Look up a required secret from `Deno.env`. Falls back to each
 * `legacyAliases` entry in order. Throws `MissingSecretError` if none
 * resolve to a non-empty string.
 *
 * @example
 * const key = requireSecret("GOOGLE_MAPS_BROWSER_KEY", {
 *   functionName: "public-google-maps-key",
 *   legacyAliases: ["VITE_GOOGLE_MAPS_BROWSER_KEY"],
 * });
 */
export function requireSecret(
  name: string,
  opts: RequireSecretOptions,
): string {
  const aliases = opts.legacyAliases ?? [];
  const direct = Deno.env.get(name);
  if (direct && direct.length > 0) return direct;

  for (const alias of aliases) {
    const v = Deno.env.get(alias);
    if (v && v.length > 0) return v;
  }

  throw new MissingSecretError({
    secretName: name,
    functionName: opts.functionName,
    legacyAliasesChecked: aliases,
  });
}

/**
 * Look up an optional secret. Returns `null` if neither the canonical
 * name nor any legacy alias resolves. Never throws and never logs —
 * by design, missing optional config is not an error and should not
 * be alerted on.
 */
export function optionalSecret(
  name: string,
  opts: OptionalSecretOptions = {},
): string | null {
  const direct = Deno.env.get(name);
  if (direct && direct.length > 0) return direct;

  for (const alias of opts.legacyAliases ?? []) {
    const v = Deno.env.get(alias);
    if (v && v.length > 0) return v;
  }

  return null;
}
