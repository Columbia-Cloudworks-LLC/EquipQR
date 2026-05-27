import { test as base } from '@playwright/test';
import {
  gotoDashboardRoute,
  expectNoAppErrorBoundary,
  quickLogin,
} from '../shared/auth-helpers';
import {
  attachConsoleErrorCollector,
  assertNoCriticalConsoleErrors,
  installActionOverlay,
  pauseForWatchMode,
  setActionOverlay,
} from '../shared/page-helpers';
import type { PersonaKey } from '../shared/seed-data';

type EquipQrFixtures = {
  actionOverlay: void;
  consoleErrors: string[];
  gotoDashboard: (route: string) => Promise<void>;
  assertHealthyShell: () => Promise<void>;
};

export const test = base.extend<EquipQrFixtures>({
  actionOverlay: [
    async ({ page }, use, testInfo) => {
      void testInfo;
      await installActionOverlay(page, 'Starting test');
      await use();
      await pauseForWatchMode(page);
    },
    { auto: true },
  ],

  consoleErrors: async ({ page }, use) => {
    const errors = attachConsoleErrorCollector(page);
    await use(errors);
    assertNoCriticalConsoleErrors(errors);
  },

  gotoDashboard: async ({ page }, use) => {
    await use(async (route: string) => {
      await setActionOverlay(page, `Opening dashboard route ${route}`);
      await gotoDashboardRoute(page, route);
      await setActionOverlay(page, `Loaded dashboard route ${route}`);
    });
  },

  assertHealthyShell: async ({ page }, use) => {
    await use(async () => {
      await setActionOverlay(page, 'Checking app shell');
      await expectNoAppErrorBoundary(page);
    });
  },
});

export { expect } from '@playwright/test';
export { quickLogin };
export type { PersonaKey };
