import fs from 'fs/promises';
import http from 'http';
import path from 'path';
import type { AddressInfo } from 'net';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

interface VercelHeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

export interface DocsCspServer {
  baseUrl: string;
  cspHeader: string;
  close(): Promise<void>;
}

/**
 * Reads the production Content-Security-Policy from docs/vercel.json so the
 * evidence run always exercises the shipped policy, never a stale copy.
 */
async function readProductionCsp(repoRoot: string): Promise<string> {
  const vercelConfigPath = path.join(repoRoot, 'docs', 'vercel.json');
  const config = JSON.parse(await fs.readFile(vercelConfigPath, 'utf8')) as {
    headers?: VercelHeaderRule[];
  };
  const catchAll = config.headers?.find((rule) => rule.source === '/(.*)');
  const csp = catchAll?.headers.find((h) => h.key === 'Content-Security-Policy')?.value;
  if (!csp) {
    throw new Error(`Content-Security-Policy not found in ${vercelConfigPath}`);
  }
  return csp;
}

/**
 * Serves docs/.vitepress/dist with the production CSP header applied to every
 * response, emulating equipqr.info hosting (including cleanUrls resolution).
 * Requires a prior `npm run docs:build`.
 */
export async function startDocsDistCspServer(): Promise<DocsCspServer> {
  const repoRoot = process.cwd();
  const distDir = path.join(repoRoot, 'docs', '.vitepress', 'dist');

  try {
    await fs.access(path.join(distDir, 'index.html'));
  } catch {
    throw new Error(
      `Built docs not found at ${distDir}. Run "npm run docs:build" before capturing help-center evidence.`,
    );
  }

  const cspHeader = await readProductionCsp(repoRoot);

  const server = http.createServer(async (req, res) => {
    const requestPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const candidates = requestPath.endsWith('/')
      ? [`${requestPath}index.html`]
      : path.extname(requestPath)
        ? [requestPath]
        : [`${requestPath}.html`, `${requestPath}/index.html`];

    for (const candidate of candidates) {
      const filePath = path.normalize(path.join(distDir, candidate));
      if (!filePath.startsWith(distDir + path.sep) && filePath !== distDir) {
        continue;
      }
      try {
        const body = await fs.readFile(filePath);
        res.writeHead(200, {
          'Content-Type': CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
          'Content-Security-Policy': cspHeader,
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(body);
        return;
      } catch {
        // Try the next cleanUrls candidate.
      }
    }

    res.writeHead(404, { 'Content-Security-Policy': cspHeader });
    res.end('Not found');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    cspHeader,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
