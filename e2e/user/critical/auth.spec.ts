import { test } from '../fixtures/equipqr-test';
import { openDashboardAsPersona } from '../shared/auth-helpers';

test.describe('authentication @critical', () => {
  test('reuses saved owner storage state', async ({ browser }) => {
    const { context } = await openDashboardAsPersona(browser, 'owner');
    await context.close();
  });

  test('admin storage state reaches dashboard', async ({ browser }) => {
    const { context } = await openDashboardAsPersona(browser, 'admin', {
      assertMainContent: false,
    });
    await context.close();
  });

  test('technician storage state reaches dashboard', async ({ browser }) => {
    const { context } = await openDashboardAsPersona(browser, 'technician', {
      assertMainContent: false,
    });
    await context.close();
  });
});
