import { test, expect } from '../fixtures/equipqr-test';
import { seedPmTemplates } from '../shared/seed-data';

test.describe('PM template editor @full', () => {
  test('opens new template editor', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/pm-templates/new');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /new pm template|create pm template/i }).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('opens global forklift template view', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard(`/pm-templates/${seedPmTemplates.forklift.id}`);
    await assertHealthyShell();
    await expect(page.getByText(seedPmTemplates.forklift.name).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('opens template edit route for owner', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard(`/pm-templates/${seedPmTemplates.forklift.id}/edit`);
    await assertHealthyShell();
    await expect(page.getByText(/section|checklist|template/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
