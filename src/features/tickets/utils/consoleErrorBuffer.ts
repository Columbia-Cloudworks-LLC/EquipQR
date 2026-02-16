/**
 * Console Error Ring Buffer
 *
 * Intercepts console.error calls and stores the last N error messages
 * in a ring buffer. Used by the bug reporting system to include recent
 * errors in ticket metadata for faster diagnosis.
 *
 * Privacy: Only error message strings are stored (truncated).
 * No stack traces, no PII, no sensitive data.
 */

const ERROR_BUFFER_SIZE = 10;
const MAX_ERROR_LENGTH = 200;

const errorBuffer: string[] = [];
let initialized = false;

/**
 * Initialize console.error interception.
 * Call once at app startup (e.g., in main.tsx).
 * Safe to call multiple times -- only initializes once.
 */
export function initConsoleErrorCapture(): void {
  if (initialized) return;
  initialized = true;

  const originalError = console.error;

  console.error = (...args: unknown[]) => {
    try {
      const message = args
        .map((a) => {
          if (a instanceof Error) return a.message;
          if (typeof a === 'string') return a;
          try {
            return String(a);
          } catch {
            return '[unstringifiable]';
          }
        })
        .join(' ')
        .slice(0, MAX_ERROR_LENGTH);

      if (message.length > 0) {
        errorBuffer.push(message);
        if (errorBuffer.length > ERROR_BUFFER_SIZE) {
          errorBuffer.shift();
        }
      }
    } catch {
      // Never let the buffer logic break console.error itself
    }

    // Always call the original
    originalError.apply(console, args);
  };
}

/**
 * Get a copy of the recent error messages.
 * Returns up to ERROR_BUFFER_SIZE most recent errors.
 */
export function getRecentErrors(): string[] {
  return [...errorBuffer];
}
