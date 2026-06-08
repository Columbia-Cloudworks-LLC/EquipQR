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

const DOCUMENTATION_URL = resolveDocumentationUrl();
export const SUPPORT_DOCS_URL = resolveSupportDocsUrl();
