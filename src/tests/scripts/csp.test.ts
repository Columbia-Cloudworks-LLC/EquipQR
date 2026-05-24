import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { buildCsp, extractCspFromVercelConfig } from '../../../scripts/csp';

describe('csp', () => {
  it('vercel.json Content-Security-Policy matches buildCsp() production output', () => {
    const vercelPath = join(process.cwd(), 'vercel.json');
    const config = JSON.parse(readFileSync(vercelPath, 'utf-8')) as {
      headers?: { source: string; headers: { key: string; value: string }[] }[];
    };

    const vercelCsp = extractCspFromVercelConfig(config);
    expect(vercelCsp).toBeDefined();
    expect(vercelCsp).toBe(buildCsp());
  });

  it('buildCsp({ dev: true }) adds localhost allowances for the Vite dev server', () => {
    const devCsp = buildCsp({ dev: true });

    expect(devCsp).toContain('http://localhost:*');
    expect(devCsp).toContain('http://127.0.0.1:*');
    expect(devCsp).toContain('ws://localhost:*');
    expect(devCsp).toContain('wss://localhost:*');
    expect(devCsp).not.toBe(buildCsp());
  });

  it('production CSP omits unsafe-eval while dev CSP includes it for Vite HMR', () => {
    const productionCsp = buildCsp();
    const devCsp = buildCsp({ dev: true });

    expect(productionCsp).not.toContain("'unsafe-eval'");
    expect(devCsp).toContain("'unsafe-eval'");
  });
});
