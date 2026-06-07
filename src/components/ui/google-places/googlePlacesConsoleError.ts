/** The true, unwrapped console.error captured at module load time. */
const _trueConsoleError: typeof console.error = console.error;

/** Active per-instance callbacks. Each gets every console.error call. */
const _errorListeners = new Set<(...args: unknown[]) => void>();

/** The single module-level wrapper installed while listeners exist. */
function _sharedErrorWrapper(...args: unknown[]) {
  _trueConsoleError.apply(console, args);
  for (const cb of _errorListeners) {
    try {
      cb(...args);
    } catch {
      /* listener errors must not propagate */
    }
  }
}

/** Register a listener. Installs the wrapper if this is the first. */
export function addGooglePlacesErrorListener(cb: (...args: unknown[]) => void) {
  if (_errorListeners.size === 0) {
    console.error = _sharedErrorWrapper;
  }
  _errorListeners.add(cb);
}

/** Remove a listener. Restores the true console.error if none remain. */
export function removeGooglePlacesErrorListener(cb: (...args: unknown[]) => void) {
  _errorListeners.delete(cb);
  if (_errorListeners.size === 0 && console.error === _sharedErrorWrapper) {
    console.error = _trueConsoleError;
  }
}

/**
 * Check if a console.error call is the Google Maps "AutocompletePlaces blocked"
 * message, indicating the Places API (New) is not enabled for the current key.
 */
export function isPlacesApiBlockedError(args: unknown[]): boolean {
  const msg = args.map((a) => (typeof a === 'string' ? a : String(a ?? ''))).join(' ');
  return msg.includes('AutocompletePlaces') && (msg.includes('blocked') || msg.includes('403'));
}
