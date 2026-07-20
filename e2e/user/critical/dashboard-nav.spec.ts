import { test, expect } from '../fixtures/equipqr-test';
import { openSidebarLink } from '../shared/page-helpers';

const dashboardRoutes: Array<{ link: RegExp | string; path: RegExp }> = [
  { link: /dashboard/i, path: /\/dashboard\/?$/ },
  { link: /^equipment$/i, path: /\/dashboard\/equipment/ },
  { link: /work orders/i, path: /\/dashboard\/work-orders/ },
  { link: /fleet map/i, path: /\/dashboard\/fleet-map/ },
  { link: /^inventory$/i, path: /\/dashboard\/inventory/ },
  { link: /part lookup/i, path: /\/dashboard\/part-lookup/ },
  { link: /part alternates/i, path: /\/dashboard\/alternate-groups/ },
  { link: /^teams$/i, path: /\/dashboard\/teams/ },
  { link: /^organization$/i, path: /\/dashboard\/organization/ },
  { link: /^reports$/i, path: /\/dashboard\/reports/ },
  { link: /pm templates/i, path: /\/dashboard\/pm-templates/ },
];

test.describe('dashboard navigation @critical', () => {
  test.beforeEach(async ({ gotoDashboard }) => {
    await gotoDashboard('/');
  });

  for (const { link, path } of dashboardRoutes) {
    test(`sidebar opens ${String(link)}`, async ({ page, assertHealthyShell, consoleErrors }) => {
      void consoleErrors;
      await openSidebarLink(page, link);
      await expect(page).toHaveURL(path, { timeout: 60_000 });
      await assertHealthyShell();
    });
  }
});
