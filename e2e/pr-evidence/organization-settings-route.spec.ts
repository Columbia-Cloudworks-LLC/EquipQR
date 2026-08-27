import { test, expect, quickLogin } from '../user/fixtures/equipqr-test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

async function gotoOrganizationSettingsDirectRoute(
  gotoDashboard: (route: string) => Promise<void>,
  page: import('@playwright/test').Page,
) {
  await gotoDashboard('/organization/settings');
  if (/\/auth(?:[?#]|$)/i.test(page.url())) {
    await quickLogin(page, 'owner');
    await gotoDashboard('/organization/settings');
  }
}

async function dismissMapConfigurationToast(page: import('@playwright/test').Page) {
  const toast = page.getByText(/Map Configuration Error/i).first();
  const toastVisible = await toast.isVisible().catch(() => false);
  if (!toastVisible) {
    return;
  }

  await page.getByRole('button', { name: /^close$/i }).last().click();
  await expect(toast).toBeHidden({ timeout: 10_000 });
}

test.describe('Organization settings direct route @pr-evidence', () => {
  test('captures the direct settings route with organization tabs and form', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoOrganizationSettingsDirectRoute(gotoDashboard, page);
    await assertHealthyShell();

    const organizationSubnav = page.getByRole('navigation', { name: 'Organization sections' });
    const organizationNameField = page.getByRole('textbox', { name: /organization name/i });

    await expect(page).toHaveURL(/\/dashboard\/organization\/settings$/i, {
      timeout: 60_000,
    });
    await expect(page.getByRole('heading', { name: /organization settings/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(organizationSubnav.getByRole('link', { name: /^members$/i })).toBeVisible();
    await expect(organizationSubnav.getByRole('link', { name: /^settings$/i })).toBeVisible();
    await expect(organizationSubnav.getByRole('link', { name: /^integrations$/i })).toBeVisible();
    await expect(organizationNameField).toBeVisible();
    await dismissMapConfigurationToast(page);

    await evidencePause(page, 800);
    await evidenceScreenshot({
      page,
      label: '01-organization-settings-direct-route',
      target: organizationNameField,
    });
  });
});
