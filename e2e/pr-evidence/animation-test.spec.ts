import { expect, test } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot } from './shared/evidence-helpers';

test.use({ storageState: { cookies: [], origins: [] } });

test('animation lab steps and seeks every registered fixture @pr-evidence', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/debug/animation-test');
  await expect(page.getByRole('heading', { name: 'Animation lab', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  const status = page.getByRole('status', { name: 'Playback status', exact: true });
  const elapsed = page.getByRole('status', { name: 'Elapsed time' });
  const selector = page.getByRole('combobox', { name: 'Animation', exact: true });
  const ids = await selector.locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(ids.length).toBeGreaterThan(15);
  for (const id of ids) {
    await test.step(id, async () => {
      await selector.selectOption(id);
      await expect(status).toHaveText('Paused');
      await page.getByRole('button', { name: 'Step one frame', exact: true }).click();
      await expect(elapsed).toHaveText('0.017 s');
      await page.getByLabel('Seek to (s)').fill('2');
      await page.getByRole('button', { name: 'Go', exact: true }).click();
      await expect(elapsed).toHaveText('2.000 s', { timeout: 10000 });
      await expect(status).toHaveText('Paused');
      await expect(page.getByRole('alert')).toHaveCount(0);
      const stage = page.frameLocator('iframe');
      await expect(stage.locator('#root > *')).not.toHaveCount(0);
      // All CSS fixtures must actually run a browser animation, not just render a tile.
      if (id.startsWith('css-') || id.startsWith('animate-') || ['scan-machine', 'loading', 'skeleton-shimmer', 'overlay-enter', 'overlay-exit'].includes(id)) {
        await expect(page.locator('tbody tr')).not.toHaveCount(0);
      }
    });
  }

  await selector.selectOption('scan-machine');
  await expect(status).toHaveText('Paused');
  await page.getByLabel('Seek to (s)').fill('3');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(elapsed).toHaveText('3.000 s');
  const before = await page.frameLocator('iframe').getByTestId('scan-phone').evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(150);
  await expect(elapsed).toHaveText('3.000 s');
  expect(await page.frameLocator('iframe').getByTestId('scan-phone').evaluate((element) => getComputedStyle(element).transform)).toBe(before);
  await evidenceScreenshot({ page, label: '01-scan-story-paused', target: page.locator('iframe') });
  await page.getByRole('button', { name: 'Back one frame', exact: true }).click();
  await expect(elapsed).toHaveText('2.983 s', { timeout: 10000 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(status).toHaveText('Playing');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(status).toHaveText('Paused');

  await page.getByLabel('Seek to (s)').fill('8');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(elapsed).toHaveText('8.000 s', { timeout: 10000 });
  await expect(page.getByText(/Sequence completed/)).toHaveText('7.000s · Sequence completed');

  await selector.selectOption('national-map');
  await expect(status).toHaveText('Paused');
  await page.getByLabel('Seek to (s)').fill('5');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(elapsed).toHaveText('5.000 s', { timeout: 10000 });
  await expect(page.frameLocator('iframe').getByTestId('national-feature-cards')).toBeVisible();
  await evidenceScreenshot({ page, label: '02-national-map-timed-cards', target: page.locator('iframe') });

  await selector.selectOption('fleet-observability');
  await expect(status).toHaveText('Paused');
  await page.getByLabel('Seek to (s)').fill('30');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(elapsed).toHaveText('30.000 s', { timeout: 30000 });
  await expect(page.getByText(/Sequence completed/)).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox', { name: 'Stage width', exact: true }).selectOption('320');
  await expect(status).toHaveText('Paused');
  await evidenceScreenshot({ page, label: '03-mobile-controls', target: page.getByRole('button', { name: 'Step one frame', exact: true }) });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(status).toHaveText('Paused');
  await expect(page.frameLocator('iframe').getByTestId('static-hero-composite')).toBeVisible();
});
