const PRODUCTION_DOCUMENTATION_URL = 'https://equipqr.info';
const LOCAL_DOCUMENTATION_URL = 'http://localhost:5174';

interface DocumentationUrlEnv {
  readonly DEV?: boolean;
  readonly VITE_DOCUMENTATION_URL?: string;
}

export function resolveDocumentationUrl(env: DocumentationUrlEnv = import.meta.env): string {
  const configuredUrl = env.VITE_DOCUMENTATION_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  return env.DEV ? LOCAL_DOCUMENTATION_URL : PRODUCTION_DOCUMENTATION_URL;
}

/** Canonical EquipQR Help Center root (VitePress `/support/`). */
export function resolveSupportDocsUrl(env: DocumentationUrlEnv = import.meta.env): string {
  const base = resolveDocumentationUrl(env).replace(/\/$/, '');
  return `${base}/support`;
}

/** VitePress path for the Daily Operator Check-Ins guide. */
export const OPERATOR_DAILY_CHECK_INS_DOCS_PATH = '/support/administration/operator-daily-check-ins';

export function resolveOperatorDailyCheckInsDocsUrl(
  env: DocumentationUrlEnv = import.meta.env,
): string {
  const base = resolveDocumentationUrl(env).replace(/\/$/, '');
  return `${base}${OPERATOR_DAILY_CHECK_INS_DOCS_PATH}`;
}

const DOCUMENTATION_URL = resolveDocumentationUrl();
export const SUPPORT_DOCS_URL = resolveSupportDocsUrl();
export const OPERATOR_DAILY_CHECK_INS_DOCS_URL = resolveOperatorDailyCheckInsDocsUrl();
