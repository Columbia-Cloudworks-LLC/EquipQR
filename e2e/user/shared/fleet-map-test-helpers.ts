import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import {
  ensureCookieConsentAccepted,
  gotoDashboardRoute,
  pinContextToApex,
  quickLogin,
} from './auth-helpers';

const GOOGLE_MAPS_KEY_ROUTE = '**/functions/v1/public-google-maps-key';
const ADVANCED_MARKER_TEST_MAP_ID = 'DEMO_MAP_ID';
const FLEET_MAP_ROOT_DATASET_KEY = 'e2eFleetMapRoot';
const FLEET_MAP_ROOT_DATASET_VALUE = 'stable-root';

function readLocalGoogleMapsApiKey(): string {
  const envPath = path.resolve('.env');
  const envContents = fs.readFileSync(envPath, 'utf8');
  const match = envContents.match(/^GOOGLE_MAPS_API_KEY=(.+)$/m);
  const apiKey = match?.[1]?.trim();

  if (!apiKey) {
    throw new Error(`Fleet map E2E requires GOOGLE_MAPS_API_KEY in ${envPath}`);
  }

  return apiKey;
}

/**
 * Cloud-agent local stacks currently rely on a hosted branch function for the
 * browser Maps key. Until that path returns a localhost-compatible response,
 * Fleet Map E2E stubs the authenticated key fetch in-browser so the rest of
 * the map interaction remains real.
 */
export async function openFleetMapWithInterceptedMapsKey(page: Page): Promise<void> {
  const googleMapsApiKey = readLocalGoogleMapsApiKey();

  await pinContextToApex(page.context());
  await quickLogin(page, 'owner');
  await ensureCookieConsentAccepted(page);

  await page.route(GOOGLE_MAPS_KEY_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        key: googleMapsApiKey,
        mapId: ADVANCED_MARKER_TEST_MAP_ID,
      }),
    });
  });

  await gotoDashboardRoute(page, '/fleet-map');
  await expect(page.getByRole('button', { name: /fit all markers in view/i })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTitle('Heavy Equipment Team')).toBeVisible({ timeout: 60_000 });
}

export async function markFleetMapRootAsStable(page: Page): Promise<void> {
  await page.locator('.gm-style').first().evaluate((element, { datasetKey, datasetValue }) => {
    (element as HTMLElement).dataset[datasetKey] = datasetValue;
  }, {
    datasetKey: FLEET_MAP_ROOT_DATASET_KEY,
    datasetValue: FLEET_MAP_ROOT_DATASET_VALUE,
  });
}

export async function closeFleetMapPanelIfOpen(page: Page): Promise<void> {
  const hidePanelButton = page.getByRole('button', { name: /hide panel/i });
  if (await hidePanelButton.isVisible().catch(() => false)) {
    await hidePanelButton.click();
    await expect(page.getByRole('button', { name: /^equipment$/i })).toBeVisible({
      timeout: 30_000,
    });
  }
}

export async function expectFleetMapRootToStayMounted(page: Page): Promise<void> {
  await expect(page.locator(`.gm-style[data-${toKebabCase(FLEET_MAP_ROOT_DATASET_KEY)}="${FLEET_MAP_ROOT_DATASET_VALUE}"]`).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Loading map...')).toHaveCount(0);
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (segment) => `-${segment.toLowerCase()}`);
}
