import fs from 'node:fs';
import { expect, test, type Page, type Route } from '@playwright/test';
import { ensureCookieConsentAccepted, pinContextToApex } from '../user/shared/auth-helpers';
import { authStatePath } from '../user/shared/seed-data';

const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
  // 200% browser zoom on a 1280px desktop is a 640 CSS-pixel viewport.
  { name: 'zoom-200', width: 640, height: 800 },
] as const;

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('equipqr:cookie-consent', 'accepted');
  });
});

async function openTeams(page: Page): Promise<void> {
  await page.goto('/dashboard/teams');
  await expect(page.getByRole('heading', { name: 'Teams', exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await ensureCookieConsentAccepted(page);
}

async function expectNoHorizontalPageScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectToolbarFits(page: Page, width: number): Promise<void> {
  const toolbar = page.getByTestId('teams-toolbar');
  await expect(toolbar).toBeVisible();
  const box = await toolbar.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
  await expect(page.getByLabel('Search teams by name or description')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Sort teams', exact: true })).toBeVisible();
}

test('owner can search, sort, and create a team without horizontal scrolling', async ({ page }) => {
  await openTeams(page);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expectToolbarFits(page, viewport.width);
    await expect(page.getByRole('button', { name: 'Create Team', exact: true })).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    const search = page.getByLabel('Search teams by name or description');
    await search.focus();
    await expect(search).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: 'Sort teams', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Create Team', exact: true })).toBeFocused();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Search teams by name or description').fill('zzzz-no-such-team');
  await expect(page.getByRole('heading', { name: 'No teams found' })).toBeVisible();
  await page.getByLabel('Search teams by name or description').fill('');
});

test('a technician keeps search and sort and does not get Create Team', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: authStatePath('technician'),
    baseURL: process.env.PR_EVIDENCE_BASE_URL || 'http://127.0.0.1:8080',
    viewport: { width: 320, height: 720 },
  });
  await pinContextToApex(context);
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('equipqr:cookie-consent', 'accepted');
  });
  await openTeams(page);
  await expectToolbarFits(page, 320);
  await expect(page.getByRole('button', { name: 'Create Team', exact: true })).toHaveCount(0);
  await expectNoHorizontalPageScroll(page);

  for (const width of [375, 390, 1280, 640]) {
    await page.setViewportSize({ width, height: 800 });
    await expectToolbarFits(page, width);
    await expect(page.getByRole('button', { name: 'Create Team', exact: true })).toHaveCount(0);
    await expectNoHorizontalPageScroll(page);
  }
  await context.close();
});

interface LedgerRow {
  id: string;
  organization_id: string;
  quick_form_id: string;
  submitted_at: string;
  form_snapshot: { name: string; fields: [] };
  field_values: { field_id: string; label: string; input_type: 'text'; value: string }[];
  client_context: null;
  request_fingerprint: null;
  created_at: string;
}

function ledgerRows(count: number): LedgerRow[] {
  const submittedAt = '2026-09-22T12:00:00.000Z';
  return Array.from({ length: count }, (_, index) => {
    const id = `00000000-0000-4000-8000-${String(count - index).padStart(12, '0')}`;
    return {
      id,
      organization_id: 'org',
      quick_form_id: 'form',
      submitted_at: submittedAt,
      form_snapshot: { name: 'Site check', fields: [] },
      field_values: [{ field_id: 'note', label: 'Note', input_type: 'text', value: `row-${index}` }],
      client_context: null,
      request_fingerprint: null,
      created_at: submittedAt,
    };
  });
}

function ledgerHeaders(contentRange: string): Record<string, string> {
  return {
    'content-range': contentRange,
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'content-range',
  };
}

async function fulfillLedger(route: Route, rows: LedgerRow[]): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const total = rows.length;
  if (request.method() === 'HEAD') {
    await route.fulfill({
      status: 200,
      headers: ledgerHeaders(`*/${total}`),
      body: '',
    });
    return;
  }

  const sorted = [...rows].sort((left, right) => right.id.localeCompare(left.id));
  const cursor = url.searchParams.get('or') ?? '';
  const idMatch = cursor.match(/id\.lt\.([0-9a-f-]{36})/i);
  const visible = idMatch
    ? sorted.filter((row) => row.id < idMatch[1])
    : sorted;
  const limit = Number(url.searchParams.get('limit') ?? visible.length);
  const pageRows = visible.slice(0, limit);
  const start = total - visible.length;
  await route.fulfill({
    status: 200,
    headers: ledgerHeaders(`${start}-${Math.max(start, start + pageRows.length - 1)}/${total}`),
    body: JSON.stringify(pageRows),
  });
}

test('failed quick form requests stay errors, and a 501-row ledger exports every row', async ({ page }) => {
  await page.route(/\/rest\/v1\/quick_forms(?:\?|$)/, (route) => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: '{"message":"forced failure"}',
  }));
  await page.goto('/dashboard/quick-forms');
  await expect(page.getByRole('alert')).toContainText("Couldn't load quick forms");
  await expect(page.getByText('No quick forms yet')).toHaveCount(0);

  await page.unroute(/\/rest\/v1\/quick_forms(?:\?|$)/);
  await page.route(/\/rest\/v1\/quick_forms(?:\?|$)/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('No quick forms yet')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  const rows = ledgerRows(501);
  await page.unroute(/\/rest\/v1\/quick_forms(?:\?|$)/);
  await page.route(/\/rest\/v1\/quick_form_submissions(?:\?|$)/, (route) => fulfillLedger(route, rows));
  await page.route(/\/rest\/v1\/quick_forms(?:\?|$)/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{
      id: '11111111-1111-4111-8111-111111111111',
      organization_id: 'org',
      name: 'Site check',
      description: null,
      form_data: { fields: [] },
      is_active: true,
      public_token_hash: 'hash',
      token_rotated_at: '2026-09-22T12:00:00.000Z',
      token_rotated_by: null,
      created_by: 'owner',
      updated_by: null,
      created_at: '2026-09-22T12:00:00.000Z',
      updated_at: '2026-09-22T12:00:00.000Z',
    }]),
  }));
  await page.getByRole('tab', { name: 'Ledger' }).click();
  await expect(page.getByTestId('quick-form-ledger-count')).toHaveText('Showing 100 of 501 submissions');
  await expect(page.getByTestId('quick-form-submission-row')).toHaveCount(100);
  await expect(page.getByText('No submissions yet')).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('menuitem', { name: /CSV/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/quick-form-submissions.*\.csv$/);
  const csvPath = await download.path();
  expect(csvPath).toBeTruthy();
  const text = fs.readFileSync(csvPath!, 'utf8');
  const ids = text.match(/00000000-0000-4000-8000-[0-9a-f]{12}/g) ?? [];
  expect(new Set(ids).size).toBe(501);
  await expect(page.getByTestId('quick-form-ledger-count')).toHaveText('Showing 100 of 501 submissions');
});
