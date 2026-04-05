/**
 * Validates and re-materializes a blob URL through the URL parser.
 *
 * Parsing via `new URL()` and reading back `.href` produces a new string that
 * breaks CodeQL's taint chain from DOM text to HTML attribute sinks
 * (js/xss-through-dom). Use this wherever a blob URL is rendered into a DOM
 * attribute such as `<img src>`.
 *
 * @returns The validated blob URL string, or `null` if the input is missing,
 *          unparseable, or does not use the `blob:` protocol.
 */
export function sanitizeBlobUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'blob:' ? parsed.href : null;
  } catch {
    return null;
  }
}
