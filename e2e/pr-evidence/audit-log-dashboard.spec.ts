import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * Evidence for the audit log dashboard refactor (#1166):
 * - Customizable drag/drop grid with collapsible sections + reset layout
 * - Events table full-width until selection
 * - Single selection → detail inspector with Copy Markdown / Copy JSON
 * - Multi selection → bulk actions pane exporting Markdown / Excel / PDF
 */

test.describe('Audit log dashboard @pr-evidence', () => {
  test('dashboard widgets, selection model, copy, and bulk exports (#1166)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await gotoDashboard('/audit-log');
    await assertHealthyShell();

    // Dashboard grid renders all three widgets.
    await expect(page.getByTestId('audit-dashboard-grid')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('audit-widget-metrics')).toBeVisible();
    await expect(page.getByTestId('audit-widget-timeline')).toBeVisible();
    await expect(page.getByTestId('audit-widget-events')).toBeVisible();

    const rows = page.getByTestId('audit-log-list-row');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });

    // Full-width table until events are selected.
    await expect(page.getByTestId('audit-detail-panel')).toHaveCount(0);
    await expect(page.getByTestId('audit-bulk-actions-panel')).toHaveCount(0);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-dashboard-full-width-table');

    // Single selection opens the detail inspector.
    await rows.first().click();
    await expect(page.getByTestId('audit-detail-panel')).toBeVisible({ timeout: 15_000 });

    // Copy the entry as markdown to the clipboard.
    await page.getByTestId('audit-detail-copy-markdown').click();
    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
      .toMatch(/^### /);

    await page.getByTestId('audit-detail-copy-json').click();
    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
      .toMatch(/^\{/);

    await evidencePause(page, 500);
    await evidenceScreenshot(page, '02-single-selection-detail-copy');

    // Ctrl-click a second row → bulk actions pane replaces the inspector.
    await page.getByTestId('audit-log-list-row').nth(2).click({
      modifiers: ['ControlOrMeta'],
    });
    await expect(page.getByTestId('audit-bulk-actions-panel')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/2 entries selected/i)).toBeVisible();
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '03-multi-selection-bulk-actions');

    // Export the selection in all three formats.
    const mdDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: /markdown \(\.md\)/i }).click();
    expect((await mdDownload).suggestedFilename()).toMatch(/audit-log-selection.*\.md$/);

    const xlsxDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: /excel \(\.xlsx\)/i }).click();
    expect((await xlsxDownload).suggestedFilename()).toMatch(/audit-log-selection.*\.xlsx$/);

    const pdfDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: /pdf \(\.pdf\)/i }).click();
    expect((await pdfDownload).suggestedFilename()).toMatch(/audit-log-selection.*\.pdf$/);

    await evidencePause(page, 500);
    await evidenceScreenshot(page, '04-bulk-exports-downloaded');

    // Shift-click extends the selection as a range.
    await page.getByTestId('audit-log-list-row').nth(5).click({ modifiers: ['Shift'] });
    await expect(page.getByText(/\d+ entries selected/i)).toBeVisible();

    // Clear returns the table to full width.
    await page.getByRole('button', { name: /^clear$/i }).click();
    await expect(page.getByTestId('audit-bulk-actions-panel')).toHaveCount(0);

    // Collapse the Key Metrics section.
    await page.getByTestId('audit-widget-collapse-metrics').click();
    await expect(page.getByTestId('audit-stats-cards')).toHaveCount(0);
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '05-metrics-collapsed');

    // Drag the Timeline widget below the Events widget via its header grip.
    const dragHandle = page.getByTestId('audit-widget-drag-timeline');
    const eventsWidget = page.getByTestId('audit-widget-events');
    const handleBox = await dragHandle.boundingBox();
    const eventsBox = await eventsWidget.boundingBox();
    expect(handleBox).not.toBeNull();
    expect(eventsBox).not.toBeNull();
    if (handleBox && eventsBox) {
      const startX = handleBox.x + handleBox.width / 2;
      const startY = handleBox.y + handleBox.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      const targetY = eventsBox.y + eventsBox.height - 40;
      for (let step = 1; step <= 10; step += 1) {
        await page.mouse.move(startX, startY + ((targetY - startY) * step) / 10);
        await evidencePause(page, 50);
      }
      await page.mouse.up();
    }
    await evidencePause(page, 700);
    await evidenceScreenshot(page, '06-timeline-dragged-below-events');

    // Reset restores the default arrangement and expands collapsed sections.
    await page.getByTestId('audit-dashboard-reset-layout').click();
    await expect(page.getByTestId('audit-stats-cards')).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '07-layout-reset');
  });
});
