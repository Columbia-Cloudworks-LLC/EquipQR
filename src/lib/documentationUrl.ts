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

export const DOCUMENTATION_URL = resolveDocumentationUrl();
