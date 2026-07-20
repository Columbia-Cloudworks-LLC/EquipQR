import { expect, test } from '@playwright/test';

/**
 * Smoke proof for #1249 cloud-agent ephemeral branch + Quick Login.
 *
 * Prerequisites:
 *   - Vite on http://localhost:8080
 *   - .env pointed at an ephemeral branch seeded by
 *     scripts/cloud-agent-ephemeral-stack.sh
 *
 * Skip when CLOUD_AGENT_E2E is not set so local Windows CI / default e2e
 * suites do not hit a non-seeded backend.
 */
const enabled = process.env.CLOUD_AGENT_E2E === '1';

test.describe('Cloud agent Quick Login smoke', () => {
  test.skip(!enabled, 'Set CLOUD_AGENT_E2E=1 after ephemeral stack seed');

  test('owner@apex.test reaches equipment via Dev Quick Login', async ({
    page,
  }) => {
    await page.goto('http://localhost:8080/auth', { waitUntil: 'domcontentloaded' });

    const quickLogin = page.getByText('Dev Quick Login', { exact: false });
    await expect(quickLogin).toBeVisible({ timeout: 30_000 });

    const trigger = page.getByRole('combobox', { name: /select a test account/i });
    await trigger.click();
    await page.getByRole('option', { name: /Alex Apex/i }).click();

    const loginButton = page.getByRole('button', { name: /quick login/i });
    await loginButton.click();

    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });

    await page.goto('http://localhost:8080/dashboard/equipment', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByText('CAT 320 Excavator', { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
  });
});
