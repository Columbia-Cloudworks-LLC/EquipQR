/**
 * Application version exposed to the runtime
 * 
 * Priority:
 * 1. VITE_APP_VERSION environment variable (if set)
 * 2. __APP_VERSION__ compile-time constant (from package.json)
 * 3. 'dev' fallback for local development
 */
export const APP_VERSION =
  (import.meta.env.VITE_APP_VERSION as string) ||
  (__APP_VERSION__ as string) ||
  "dev";

