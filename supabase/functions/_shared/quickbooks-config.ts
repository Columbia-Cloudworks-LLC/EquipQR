/**
 * Shared QuickBooks configuration constants for Edge Functions.
 *
 * Centralizes API URLs, minor version, and environment detection so they
 * are defined once instead of duplicated across every QBO Edge Function.
 */

/** Sandbox base URL for the QuickBooks Data API (v3). */
export const QBO_API_BASE_SANDBOX =
  "https://sandbox-quickbooks.api.intuit.com";

/** Production base URL for the QuickBooks Data API (v3). */
export const QBO_API_BASE_PRODUCTION =
  "https://quickbooks.api.intuit.com";

/** Intuit OAuth 2.0 token endpoint (same for sandbox and production). */
export const QBO_TOKEN_URL =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

/**
 * Minor version to append to every QBO data-API request.
 *
 * Many fields (e.g. TxnTaxDetail, TaxExemptionRef) are only returned when a
 * sufficient minor version is specified.  Bump this periodically to stay
 * current with the Intuit API – the value is backward-compatible.
 *
 * @see https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/minor-versions
 */
export const QBO_MINOR_VERSION = 70;

/** Whether the current deployment targets the QBO sandbox environment. */
export const IS_SANDBOX =
  Deno.env.get("QUICKBOOKS_SANDBOX") !== "false";

/** Resolved base URL for the QuickBooks Data API (sandbox or production). */
export const QBO_API_BASE = IS_SANDBOX
  ? QBO_API_BASE_SANDBOX
  : QBO_API_BASE_PRODUCTION;

/** Human-readable environment label stored in export logs. */
export const QBO_ENVIRONMENT: "sandbox" | "production" = IS_SANDBOX
  ? "sandbox"
  : "production";

const envOrDefault = (value: string | undefined, fallback: string): string =>
  value && value.trim().length > 0 ? value.trim() : fallback;

const envNumberOrDefault = (
  value: string | undefined,
  fallback: number,
): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * QBO Definition IDs for invoice-level custom fields.
 * These are company-specific and can be overridden per environment.
 */
export const QBO_INVOICE_CUSTOM_FIELD_DEFINITION_IDS = {
  makeModel: envOrDefault(
    Deno.env.get("QBO_INVOICE_CUSTOM_FIELD_MAKE_MODEL_DEFINITION_ID"),
    "1",
  ),
  serial: envOrDefault(
    Deno.env.get("QBO_INVOICE_CUSTOM_FIELD_SERIAL_DEFINITION_ID"),
    "2",
  ),
  machineHours: envOrDefault(
    Deno.env.get("QBO_INVOICE_CUSTOM_FIELD_MACHINE_HOURS_DEFINITION_ID"),
    "3",
  ),
} as const;

/**
 * QBO item names used when creating/finding invoice line item references.
 */
export const QBO_INVOICE_ITEM_NAMES = {
  labor: envOrDefault(Deno.env.get("QBO_INVOICE_LABOR_ITEM_NAME"), "Labor"),
  truckSupplies: envOrDefault(
    Deno.env.get("QBO_INVOICE_TRUCK_SUPPLIES_ITEM_NAME"),
    "Truck Supplies",
  ),
  partsPrefix: envOrDefault(Deno.env.get("QBO_INVOICE_PARTS_ITEM_PREFIX"), "Part"),
} as const;

/** Default labor rate (in cents) used when WO time logs exist but no labor-cost amount is provided. */
export const QBO_DEFAULT_LABOR_RATE_CENTS = envNumberOrDefault(
  Deno.env.get("QBO_DEFAULT_LABOR_RATE_CENTS"),
  0,
);

/** Default truck supplies fee (in cents) appended when no explicit truck fee cost is present. */
export const QBO_DEFAULT_TRUCK_SUPPLIES_FEE_CENTS = envNumberOrDefault(
  Deno.env.get("QBO_DEFAULT_TRUCK_SUPPLIES_FEE_CENTS"),
  0,
);

/**
 * Extracts the `intuit_tid` header from a QuickBooks API response.
 *
 * This identifier is valuable when opening Intuit support cases – include it
 * in log entries and, when possible, persist it in the database.
 */
export function getIntuitTid(response: Response): string | null {
  return response.headers.get("intuit_tid") || null;
}

/**
 * Appends `?minorversion=<QBO_MINOR_VERSION>` (or `&minorversion=…`) to a URL
 * that targets the QuickBooks Data API.  Safe to call on URLs that already
 * contain a query string.
 */
export function withMinorVersion(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}minorversion=${QBO_MINOR_VERSION}`;
}
