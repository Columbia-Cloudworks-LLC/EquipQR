import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { logoutFromApp } from '../user/shared/auth-helpers';
import { seedEquipment } from '../user/shared/seed-data';

const pendingPath = `/qr/equipment/${seedEquipment.cat320.id}?qr=true`;

/**
 * PR evidence for #1322 — Google OAuth / post-login preserves QR pendingRedirect.
 * Full Google IdP round-trip is covered by unit tests on redirectTo building;
 * this proves the post-callback landing paths honor the destination.
 */
test.describe('PR evidence OAuth pending redirect @pr-evidence', () => {
  test('authenticated root honors pendingRedirect instead of dashboard', async ({
    page,
    assertHealthyShell,
  }) => {
    await page.goto('/dashboard');
    await assertHealthyShell();

    await page.evaluate((path) => {
      sessionStorage.setItem('pendingRedirect', path);
    }, pendingPath);

    await page.goto('/');
    await page.waitForURL(
      new RegExp(`/qr/equipment/${seedEquipment.cat320.id}`),
      { timeout: 60_000 },
    );

    await expect(
      page.getByRole('heading', { name: seedEquipment.cat320.name }),
    ).toBeVisible({ timeout: 60_000 });

    const heading = page.getByRole('heading', { name: seedEquipment.cat320.name });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-root-honors-pending-qr-redirect', {
      target: heading,
    });
  });

  test('auth page shows QR destination prompt from next query param', async ({
    page,
    assertHealthyShell,
  }) => {
    await page.goto('/dashboard');
    await assertHealthyShell();
    await logoutFromApp(page);

    const nextUrl = `/auth?next=${encodeURIComponent(pendingPath)}`;
    await page.goto(nextUrl);
    await expect(page).toHaveURL(/\/auth/i, { timeout: 60_000 });

    const heading = page.getByRole('heading', { name: /sign in to continue/i });
    await expect(heading).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/complete sign in to view scanned equipment/i),
    ).toBeVisible();

    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-auth-next-param-qr-prompt', {
      target: googleButton,
    });
  });
});
