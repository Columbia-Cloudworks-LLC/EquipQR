/**
 * Screen catalog run settings, read from environment variables so the
 * Playwright config, the spec and dev/linux/screen-catalog.sh agree.
 */
import path from 'path';
import { devices } from '@playwright/test';

export const DEFAULT_DEVICE = 'Pixel 7';
/** Just after the latest absolute date in supabase/seeds, so seeded history reads naturally. */
export const DEFAULT_CLOCK = '2026-05-15T15:00:00.000Z';
export const DEFAULT_TIMEZONE = 'America/Chicago';

export function deviceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface ScreenCatalogSettings {
  baseURL: string;
  deviceName: string;
  deviceSlug: string;
  device: (typeof devices)[string];
  deviceScaleFactor: number;
  /** ISO timestamp the browser clock starts at, or null to use the real clock. */
  clock: string | null;
  timezoneId: string;
  outDir: string;
  /** When this run began (before the DB reset); bounds the run-time timestamp mask. */
  runStartedAt: Date;
  /** Show live Google Maps tiles instead of masking them. */
  liveMaps: boolean;
}

export function loadScreenCatalogSettings(env: NodeJS.ProcessEnv = process.env): ScreenCatalogSettings {
  const deviceName = env.SCREEN_CATALOG_DEVICE?.trim() || DEFAULT_DEVICE;
  const device = devices[deviceName];
  if (!device) {
    const mobile = Object.keys(devices).filter(
      (name) => devices[name].isMobile && !name.endsWith(' landscape'),
    );
    throw new Error(
      `Unknown SCREEN_CATALOG_DEVICE "${deviceName}". Use a Playwright device name, e.g.:\n  ${mobile.join('\n  ')}`,
    );
  }
  const scale = Number(env.SCREEN_CATALOG_SCALE || 2);
  if (!Number.isFinite(scale) || scale < 1 || scale > 4) {
    throw new Error('SCREEN_CATALOG_SCALE must be a number between 1 and 4.');
  }
  const clockEnv = env.SCREEN_CATALOG_CLOCK?.trim();
  const clock = clockEnv === 'real' ? null : clockEnv || DEFAULT_CLOCK;
  if (clock && Number.isNaN(Date.parse(clock))) {
    throw new Error('SCREEN_CATALOG_CLOCK must be an ISO timestamp or "real".');
  }
  const slug = deviceSlug(deviceName);
  const runStarted = env.SCREEN_CATALOG_RUN_STARTED ? new Date(env.SCREEN_CATALOG_RUN_STARTED) : new Date();
  if (Number.isNaN(runStarted.getTime())) throw new Error('SCREEN_CATALOG_RUN_STARTED must be an ISO timestamp.');
  return {
    baseURL: env.SCREEN_CATALOG_BASE_URL?.trim() || 'http://localhost:8080',
    deviceName,
    deviceSlug: slug,
    device,
    deviceScaleFactor: scale,
    clock,
    timezoneId: env.SCREEN_CATALOG_TIMEZONE?.trim() || DEFAULT_TIMEZONE,
    runStartedAt: runStarted,
    liveMaps: env.SCREEN_CATALOG_LIVE_MAPS === '1',
    outDir: path.resolve(env.SCREEN_CATALOG_OUT?.trim() || path.join('tmp', 'screen-catalog', slug)),
  };
}
