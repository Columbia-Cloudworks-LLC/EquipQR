const POLICY_BLOCKED_MSG =
  "Camera access is blocked by this page's security policy. Use Upload QR image or contact support.";
const DENIED_MSG =
  'Camera permission was denied. Allow camera access in your browser settings, then retry, or upload a QR image.';
const NOT_FOUND_MSG =
  'No camera was detected. Use upload below or open this page on a device with a camera.';
const NOT_READABLE_MSG =
  'The camera is already in use or unavailable. Close other camera apps, then retry, or upload a QR image.';
const CAMERA_FALLBACK_MSG = 'Camera failed to start. Use Upload QR image or retry.';

/** Maps getUserMedia / scanner startup failures to user-safe copy. */
export function getCameraAccessErrorMessage(error: unknown): string {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const lower = msg.toLowerCase();
  if (
    lower.includes('permissions policy') ||
    lower.includes('not allowed in this document') ||
    lower.includes('permission denied by policy')
  ) {
    return POLICY_BLOCKED_MSG;
  }
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return DENIED_MSG;
    if (error.name === 'NotFoundError') return NOT_FOUND_MSG;
    if (error.name === 'NotReadableError') return NOT_READABLE_MSG;
  }
  if (lower.includes('permission denied') || lower.includes('notallowederror')) return DENIED_MSG;
  if (lower.includes('notfounderror') || lower.includes('no camera')) return NOT_FOUND_MSG;
  if (
    lower.includes('notreadableerror') ||
    lower.includes('could not start video source') ||
    lower.includes('track start error')
  ) {
    return NOT_READABLE_MSG;
  }
  return CAMERA_FALLBACK_MSG;
}
