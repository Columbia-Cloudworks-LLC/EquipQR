export const PRIVACY_REQUEST_NAME_MAX_LENGTH = 200;
export const PRIVACY_REQUEST_DETAILS_MAX_LENGTH = 4000;

export function privacyRequestSizeError(
  name: unknown,
  details: unknown,
): string | null {
  if (typeof name === "string" && name.length > PRIVACY_REQUEST_NAME_MAX_LENGTH) {
    return `Name must be ${PRIVACY_REQUEST_NAME_MAX_LENGTH} characters or fewer`;
  }
  if (typeof details === "string" && details.length > PRIVACY_REQUEST_DETAILS_MAX_LENGTH) {
    return `Details must be ${PRIVACY_REQUEST_DETAILS_MAX_LENGTH} characters or fewer`;
  }
  return null;
}
