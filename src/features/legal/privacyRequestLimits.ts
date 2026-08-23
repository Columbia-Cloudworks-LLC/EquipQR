export const PRIVACY_REQUEST_NAME_MAX_LENGTH = 200;
export const PRIVACY_REQUEST_DETAILS_MAX_LENGTH = 4000;

export function privacyRequestFieldTooLong(
  value: string | undefined,
  maxLength: number,
): boolean {
  return typeof value === 'string' && value.length > maxLength;
}
