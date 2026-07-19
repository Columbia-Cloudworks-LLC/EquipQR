import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { apexOrgId } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

const SUPABASE_URL =
  process.env.PR_EVIDENCE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const PROBE_BUCKET = 'organization-logos';
/** First path segment must be org id for organization-logos insert RLS. */
const PROBE_PREFIX = `${apexOrgId}/pr-evidence-1310`;
const PROBE_OBJECT = `${PROBE_PREFIX}/probe-${Date.now().toString(36)}.png`;

/** Minimal valid 1×1 PNG — rendered large in the evidence HTML page. */
const PROBE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function resolveAnonKeyFromEnv(): string {
  const fromEnv = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (fromEnv) return fromEnv;
  const envPath = path.join(process.cwd(), '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const line = raw.split(/\r?\n/).find((l) => l.startsWith('VITE_SUPABASE_ANON_KEY='));
  const value = line?.slice('VITE_SUPABASE_ANON_KEY='.length).trim();
  if (!value) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY in env / .env');
  }
  return value;
}

function resolveOwnerAccessToken(): string {
  const statePath = path.join(process.cwd(), 'tmp', 'playwright', 'auth', 'owner.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as {
    origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }>;
  };
  for (const origin of state.origins ?? []) {
    for (const entry of origin.localStorage ?? []) {
      if (!entry.name.includes('-auth-token')) continue;
      const session = JSON.parse(entry.value) as { access_token?: string };
      if (session.access_token) return session.access_token;
    }
  }
  throw new Error(`Missing owner access_token in ${statePath}`);
}

/**
 * Issue #1310 — Supabase Security Advisor hardening.
 *
 * Proves public object URL delivery still works after dropping listing SELECT
 * policies on public buckets, anon listing cannot enumerate a unique probe
 * prefix, and unauthenticated marketing + docs surfaces continue to render.
 *
 * Probe upload uses the Playwright owner session JWT (organization-logos insert
 * RLS) — not the service_role key.
 */
test.describe('Security Advisor hardening (#1310) @pr-evidence', () => {
  // Owner storage state is required so auth.setup writes owner.json before this runs.
  test.use({ storageState: path.join('tmp', 'playwright', 'auth', 'owner.json') });

  test('public object URL works; listing does not enumerate; app/docs render', async ({
    page,
    request,
  }) => {
    const base = SUPABASE_URL.replace(/\/$/, '');
    const anonKey = resolveAnonKeyFromEnv();
    const ownerToken = resolveOwnerAccessToken();
    const publicUrl = `${base}/storage/v1/object/public/${PROBE_BUCKET}/${PROBE_OBJECT}`;

    const upload = await request.post(`${base}/storage/v1/object/${PROBE_BUCKET}/${PROBE_OBJECT}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'image/png',
      },
      data: PROBE_PNG,
    });
    expect(upload.ok(), `authenticated upload: ${upload.status()} ${await upload.text()}`).toBeTruthy();

    const probe = await request.get(publicUrl);
    expect(probe.ok(), `public object GET ${publicUrl}`).toBeTruthy();
    expect(probe.headers()['content-type'] ?? '').toMatch(/image\//);

    // Prefix-scoped list: if SELECT listing still worked, this would return the probe.
    const list = await request.post(`${base}/storage/v1/object/list/${PROBE_BUCKET}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      data: { prefix: PROBE_PREFIX, limit: 100 },
    });
    expect(list.ok(), `anon list status ${list.status()}`).toBeTruthy();
    const listed = (await list.json()) as Array<{ name?: string }>;
    expect(listed).toEqual([]);

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

    await page.context().clearCookies();
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
