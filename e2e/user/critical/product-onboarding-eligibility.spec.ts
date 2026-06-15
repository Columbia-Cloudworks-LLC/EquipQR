import { test, expect } from '../fixtures/equipqr-test';
import {
  expectNoAppErrorBoundary,
  newPersonaPage,
} from '../shared/auth-helpers';
import { apexOrgId, freshStartOrgId } from '../shared/seed-data';
import {
  resetFreshStartOnboardingFixture,
  seedFreshStartOneTeamOnly,
} from '../shared/fresh-start-reset';

test.describe('product onboarding eligibility @critical', () => {
  test('Apex owner lands on dashboard without onboarding redirect', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'owner', {
      pinOrgId: apexOrgId,
    });

    try {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard\/?$/i, { timeout: 60_000 });
      await expectNoAppErrorBoundary(page);
      await expect(page.getByTestId('getting-started-onboarding')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('Apex admin lands on dashboard without onboarding redirect', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'admin', {
      pinOrgId: apexOrgId,
    });

    try {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard\/?$/i, { timeout: 60_000 });
      await expectNoAppErrorBoundary(page);
      await expect(page.getByTestId('getting-started-onboarding')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('Apex technician lands on dashboard without onboarding redirect', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'technician', {
      pinOrgId: apexOrgId,
    });

    try {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard\/?$/i, { timeout: 60_000 });
      await expectNoAppErrorBoundary(page);
      await expect(page.getByTestId('getting-started-onboarding')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('Fresh Start owner is redirected to getting-started wizard', async ({ browser }) => {
    await resetFreshStartOnboardingFixture();

    const { context, page } = await newPersonaPage(browser, 'onboardingOwner', {
      pinOrgId: freshStartOrgId,
    });

    try {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard\/onboarding\/getting-started\/?$/, {
        timeout: 60_000,
      });
      await expectNoAppErrorBoundary(page);
      await expect(page.getByTestId('onboarding-step-create-team')).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await context.close();
    }
  });

  test('Fresh Start owner with team only resumes at equipment step', async ({ browser }) => {
    await seedFreshStartOneTeamOnly();

    const { context, page } = await newPersonaPage(browser, 'onboardingOwner', {
      pinOrgId: freshStartOrgId,
    });

    try {
      await page.goto('/dashboard/onboarding/getting-started');
      await expectNoAppErrorBoundary(page);
      await expect(page.getByTestId('onboarding-step-create-equipment')).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByTestId('onboarding-step-create-team')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
