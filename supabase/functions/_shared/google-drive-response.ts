/**
 * Shared response check for Google Drive v3 REST calls.
 */

/**
 * Throws `${failureMessage}: ${status} ${body}` when the Drive response is not OK.
 * The body read is best-effort so a broken stream never masks the HTTP status.
 */
export async function assertDriveResponseOk(
  response: Response,
  failureMessage: string,
): Promise<void> {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(`${failureMessage}: ${response.status} ${body}`);
}
