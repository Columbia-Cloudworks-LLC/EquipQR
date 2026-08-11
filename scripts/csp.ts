/**
 * Content-Security-Policy directives shared by Vite dev headers and vercel.json.
 *
 * Production CSP is `buildCsp()`. The Vite dev server uses `buildCsp({ dev: true })`
 * to append localhost allowances for HMR and local Supabase.
 *
 * `vercel.json` cannot import TypeScript at deploy time — keep its CSP header value
 * in sync via `scripts/csp.test.ts`.
 */

/** Production CSP directives — canonical list for vercel.json. */
export const CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  // `'wasm-unsafe-eval'` permits WebAssembly compilation only (not JS eval).
  // Google Maps' WebGL vector basemap compiles WASM in its shared label
  // worker (shared-label-worker.js); without this the Fleet Map floods the
  // console with CompileError CSP violations and label rendering degrades.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://hcaptcha.com https://*.hcaptcha.com https://js.sentry-cdn.com https://maps.googleapis.com https://apis.google.com https://accounts.google.com https://*.googleapis.com https://*.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com https://*.googleapis.com https://*.gstatic.com",
  "frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com https://accounts.google.com https://docs.google.com https://drive.google.com",
  // `data:` is required because Google Maps' vector basemap worker
  // (shared-label-worker.js) loads inline label sprite assets via
  // fetch('data:image/png;base64,...'). Without it the map renders
  // but labels degrade and the console floods with CSP violations.
  "connect-src 'self' data: https://hcaptcha.com https://*.hcaptcha.com https://api.pwnedpasswords.com https://*.sentry.io https://*.supabase.co https://*.equipqr.app https://*.vercel.app https://maps.googleapis.com https://accounts.google.com https://*.googleapis.com https://*.gstatic.com wss://*.supabase.co wss://*.equipqr.app wss://*.vercel.app",
  "img-src 'self' data: blob: https: https://*.googleapis.com https://*.gstatic.com",
  "media-src 'self' blob: https://*.supabase.co https://*.equipqr.app",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
  "worker-src 'self' blob:",
] as const;

/** Extra sources appended to matching directives in Vite dev mode only. */
const DEV_SOURCE_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  // Vite dev server / HMR may rely on eval; keep it out of production CSP.
  'script-src': ["'unsafe-eval'"],
  'connect-src': [
    'wss://localhost:*',
    'ws://localhost:*',
    'ws://127.0.0.1:*',
    'http://localhost:*',
    'http://127.0.0.1:*',
  ],
  'img-src': ['http://localhost:*', 'http://127.0.0.1:*'],
  'media-src': ['http://localhost:*', 'http://127.0.0.1:*'],
};

export type BuildCspOptions = {
  /** Include localhost/ws allowances for the Vite dev server. */
  dev?: boolean;
};

function directiveName(directive: string): string {
  return directive.split(/\s+/, 1)[0];
}

function appendSources(directive: string, extraSources: readonly string[]): string {
  return `${directive} ${extraSources.join(' ')}`;
}

export function buildCsp(options: BuildCspOptions = {}): string {
  const { dev = false } = options;

  const directives = dev
    ? CSP_DIRECTIVES.map((directive) => {
        const extras = DEV_SOURCE_EXTENSIONS[directiveName(directive)];
        return extras ? appendSources(directive, extras) : directive;
      })
    : [...CSP_DIRECTIVES];

  return directives.join('; ');
}

type VercelHeader = { key: string; value: string };
type VercelHeadersBlock = { source: string; headers: VercelHeader[] };

/** Read the global CSP header value from a parsed vercel.json object. */
export function extractCspFromVercelConfig(config: {
  headers?: VercelHeadersBlock[];
}): string | undefined {
  const globalBlock = config.headers?.find((block) => block.source === '/(.*)');
  return globalBlock?.headers?.find((header) => header.key === 'Content-Security-Policy')?.value;
}
