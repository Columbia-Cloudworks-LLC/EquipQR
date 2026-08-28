export function isDevQuickLoginEnabled(env: {
  DEV: boolean;
  VITE_PREVIEW_QUICK_LOGIN?: string;
}): boolean {
  return env.DEV || env.VITE_PREVIEW_QUICK_LOGIN === 'true';
}

export const DEV_QUICK_LOGIN_ENABLED = isDevQuickLoginEnabled(import.meta.env);
