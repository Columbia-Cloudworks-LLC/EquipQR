import { execSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

const SUPABASE_URL =
  process.env.PR_EVIDENCE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const PROBE_OBJECT = 'security-advisor-1310-probe.png';
const PROBE_BUCKET = 'landing-page-images';

/** Minimal valid 1×1 PNG — rendered large in the evidence HTML page. */
const PROBE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function resolveLocalStatusKeys(): { serviceKey: string; anonKey: string } {
  const statusJson = execSync('npx supabase status -o json', {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const status = JSON.parse(statusJson) as {
    SERVICE_ROLE_KEY?: string;
    service_role_key?: string;
    ANON_KEY?: string;
    anon_key?: string;
  };
  const serviceKey = status.SERVICE_ROLE_KEY ?? status.service_role_key;
  const anonKey = status.ANON_KEY ?? status.anon_key;
  if (!serviceKey || !anonKey) {
    throw new Error('Missing SERVICE_ROLE_KEY / ANON_KEY from `npx supabase status -o json`');
  }
  return { serviceKey, anonKey };
}

/**
 * Issue #1310 — Supabase Security Advisor hardening.
 *
 * Proves public object URL delivery still works after dropping listing SELECT
 * policies on public buckets, anon listing cannot enumerate the object, and
 * unauthenticated marketing + docs surfaces continue to render.
 */
test.describe('Security Advisor hardening (#1310) @pr-evidence', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('public object URL works; listing does not enumerate; app/docs render', async ({
    page,
    request,
  }) => {
    const base = SUPABASE_URL.replace(/\/$/, '');
    const { serviceKey, anonKey } = resolveLocalStatusKeys();
    const publicUrl = `${base}/storage/v1/object/public/${PROBE_BUCKET}/${PROBE_OBJECT}`;

    const upload = await request.post(`${base}/storage/v1/object/${PROBE_BUCKET}/${PROBE_OBJECT}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      data: PROBE_PNG,
    });
    expect(upload.ok(), `upload probe: ${upload.status()} ${await upload.text()}`).toBeTruthy();

    const probe = await request.get(publicUrl);
    expect(probe.ok(), `public object GET ${publicUrl}`).toBeTruthy();
    expect(probe.headers()['content-type'] ?? '').toMatch(/image\//);

    const list = await request.post(`${base}/storage/v1/object/list/${PROBE_BUCKET}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      data: { prefix: '', limit: 100 },
    });
    expect(list.ok(), `anon list status ${list.status()}`).toBeTruthy();
    const listed = (await list.json()) as Array<{ name?: string }>;
    const names = listed.map((row) => row.name).filter(Boolean);
    expect(names).not.toContain(PROBE_OBJECT);

    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:#0b1220;display:grid;place-items:center;min-height:100vh;font-family:system-ui,sans-serif;color:#e2e8f0">
        <main style="text-align:center;padding:2rem">
          <h1 style="font-size:1.25rem;margin:0 0 1rem">Public bucket object URL (#1310)</h1>
          <p style="margin:0 0 1rem;opacity:.8">Direct GET without listing policy</p>
          <img id="probe" alt="Security advisor public probe" src="${publicUrl}" width="192" height="192" style="image-rendering:pixelated;border:2px solid #38bdf8;border-radius:8px;background:#fff" />
        </main>
      </body></html>`,
      { waitUntil: 'load' },
    );
    await expect(page.locator('#probe')).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot(page, '01-public-bucket-object-url', {
      target: page.locator('#probe'),
    });

    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await evidencePause(page, 1000);
    await evidenceScreenshot(page, '02-marketing-landing-after-bucket-hardening');

    await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-docs-home-after-bucket-hardening');
  });
});
