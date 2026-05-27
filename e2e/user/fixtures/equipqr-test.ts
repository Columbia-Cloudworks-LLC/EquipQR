import { test as base } from '@playwright/test';
import {
  gotoDashboardRoute,
  expectNoAppErrorBoundary,
  quickLogin,
} from '../shared/auth-helpers';
import {
  attachConsoleErrorCollector,
  assertNoCriticalConsoleErrors,
} from '../shared/page-helpers';
import type { PersonaKey } from '../shared/seed-data';

type EquipQrFixtures = {
  consoleErrors: string[];
  gotoDashboard: (route: string) => Promise<void>;
  assertHealthyShell: () => Promise<void>;
};

export const test = base.extend<EquipQrFixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors = attachConsoleErrorCollector(page);
    await use(errors);
    assertNoCriticalConsoleErrors(errors);
  },

  gotoDashboard: async ({ page }, use) => {
    await use(async (route: string) => {
      await gotoDashboardRoute(page, route);
    });
  },

  assertHealthyShell: async ({ page }, use) => {
    await use(async () => {
      await expectNoAppErrorBoundary(page);
    });
  },
});

export { expect } from '@playwright/test';
export { quickLogin };
export type { PersonaKey };
