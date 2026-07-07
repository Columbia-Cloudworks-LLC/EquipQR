import { test, expect } from '../user/fixtures/equipqr-test';
import { seedTeams } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { attachConsoleErrorCollector } from '../user/shared/page-helpers';

test.describe('Team customer, QuickBooks, and integrations UX (#1173, #1177, #1174) @pr-evidence', () => {
  test('customer account, team contacts, integrations, and console hygiene', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const consoleErrors = attachConsoleErrorCollector(page);

    await gotoDashboard(`/teams/${seedTeams.apexHeavyEquipment.id}`);
    await assertHealthyShell();

    await page.getByRole('radio', { name: /customer view/i }).click();
    await expect(page.getByText(/no customer account linked|QuickBooks invoice export/i).first()).toBeVisible({
      timeout: 60_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-team-customer-view-empty');

    await page.getByRole('button', { name: /link existing account/i }).click();
    await expect(page.getByRole('dialog', { name: /link existing account/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /ABC Construction Co/i }).click();

    await expect(page.getByRole('heading', { name: /customer account/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: /unlink/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /link different account/i })).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-customer-account-linked');

    await expect(page.getByText(/team contacts/i)).toBeVisible();
    await expect(page.getByText(/Team Manager/i)).toBeVisible();
    await expect(page.getByText(/Requestor/i)).toBeVisible();
    await expect(page.getByText(/EquipQR user/i).first()).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-team-and-external-contacts');

    await gotoDashboard('/organization/integrations');
    await assertHealthyShell();
    await expect(page.getByText(/QuickBooks Online/i)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: /refresh now/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /quickbooks integration/i })).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '04-integrations-without-manual-refresh');

    await gotoDashboard(`/teams/${seedTeams.apexHeavyEquipment.id}`);
    await assertHealthyShell();
    await expect(page.getByText('Team Location')).toBeVisible({ timeout: 60_000 });

    await evidencePause(page, 1200);
    await evidenceScreenshot(page, '05-team-location-map');

    const markerDeprecation = consoleErrors.filter((line) =>
      line.includes('google.maps.Marker is deprecated'),
    );
    expect(markerDeprecation).toHaveLength(0);
  });
});
