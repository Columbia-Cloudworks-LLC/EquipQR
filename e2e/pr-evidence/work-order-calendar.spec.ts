import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import {
  apexOrgId,
  authStatePath,
  seedEquipment,
  seedWorkOrders,
} from '../user/shared/seed-data';
import {
  fillWorkOrderBasics,
  selectWorkOrderEquipment,
} from '../user/shared/ui-form-helpers';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('owner') });

const januaryCalendar =
  '/dashboard/work-orders?view=calendar&range=month&date=2026-01-10';
const januaryCreateDay =
  '/dashboard/work-orders?view=calendar&range=month&date=2026-01-28';
const cancelledCalendar =
  `/dashboard/work-orders?view=calendar&range=month&date=2025-12-15&wo=${seedWorkOrders.cancelled.id}`;

test.describe('Work order calendar @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('desktop planners switch to calendar, open a panel, drag, and create from a slot', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/dashboard/work-orders');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /^Work Orders$/i })).toBeVisible({
      timeout: 60_000,
    });

    const viewToggle = page.getByRole('radiogroup', { name: 'Work orders view' });
    await expect(viewToggle).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-work-orders-list-toggle', { target: viewToggle });

    await page.getByRole('radio', { name: 'Calendar view' }).click();
    const calendar = page.getByTestId('work-order-calendar');
    await expect(calendar).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/view=calendar/);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-calendar-month-current', { target: calendar });

    await gotoDashboard(januaryCalendar);
    await assertHealthyShell();
    await expect(calendar).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(seedWorkOrders.oilChange.title).first()).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-calendar-january-seeded', { target: calendar });

    await page.getByText(seedWorkOrders.oilChange.title).first().click();
    const panel = page.getByTestId('work-order-calendar-panel');
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByRole('heading', { name: seedWorkOrders.oilChange.title })).toBeVisible();
    await expect(panel.getByRole('textbox', { name: 'Due date' })).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-calendar-side-panel', {
      target: panel.getByRole('textbox', { name: 'Due date' }),
    });

    await page.getByRole('radio', { name: 'Day' }).click();
    await expect(page).toHaveURL(/range=day/);
    await expect(calendar.locator('.fc-timeGridDay-view')).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '05-calendar-day-range', { target: calendar });

    await page.getByRole('radio', { name: 'Month' }).click();
    await expect(calendar.locator('.fc-dayGridMonth-view')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden({ timeout: 10_000 });

    const oilEvent = page.locator('.fc-event').filter({ hasText: seedWorkOrders.oilChange.title }).first();
    const dropDay = page.locator('.fc-daygrid-day[data-date="2026-01-14"] .fc-daygrid-day-frame');
    await expect(oilEvent).toBeVisible();
    await expect(dropDay).toBeVisible();
    await oilEvent.dragTo(dropDay);
    await expect(page.locator('.fc-daygrid-day[data-date="2026-01-14"]')).toContainText(
      seedWorkOrders.oilChange.title,
      { timeout: 15_000 },
    );
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '06-calendar-drag-due', { target: calendar });

    await gotoDashboard(cancelledCalendar);
    await assertHealthyShell();
    await expect(page.getByTestId('work-order-calendar-panel')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByTestId('work-order-calendar-panel').getByRole('heading', {
        name: seedWorkOrders.cancelled.title,
      }),
    ).toBeVisible();
    await expect(
      page.getByTestId('work-order-calendar-panel').getByRole('textbox', { name: 'Due date' }),
    ).toHaveCount(0);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '07-calendar-locked-cancelled', {
      target: page.getByTestId('work-order-calendar-panel').getByRole('heading', {
        name: seedWorkOrders.cancelled.title,
      }),
    });

    await gotoDashboard(januaryCreateDay);
    await assertHealthyShell();
    await expect(calendar).toBeVisible({ timeout: 30_000 });
    await page.locator('.fc-daygrid-day[data-date="2026-01-28"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /create work order/i })).toBeVisible({
      timeout: 15_000,
    });
    const createTitle = `Calendar slot ${Date.now()}`;
    await fillWorkOrderBasics(dialog, {
      title: createTitle,
      description: 'Created from an empty January cell.',
    });
    await selectWorkOrderEquipment(
      page,
      dialog,
      seedEquipment.cat320.name,
      /CAT 320 Excavator/i,
    );
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '08-calendar-create-from-slot', { target: dialog });

    await dialog.getByTestId('submit-button').or(
      dialog.getByRole('button', { name: /create work order/i }),
    ).click();
    const confirmHours = page.getByRole('button', { name: /yes, create without hours/i });
    if (await confirmHours.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmHours.click();
    }
    await expect(dialog).toBeHidden({ timeout: 60_000 });
    await expect(page).toHaveURL(/view=calendar/);
    await expect(page.getByTestId('work-order-calendar-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: createTitle })).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '09-calendar-created-stays-on-grid', {
      target: page.getByTestId('work-order-calendar-panel').getByRole('heading', {
        name: createTitle,
      }),
    });
  });

  test('phones stay on the work-order list without a calendar toggle', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoDashboard('/dashboard/work-orders?view=calendar');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /^Work Orders$/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('radiogroup', { name: 'Work orders view' })).toHaveCount(0);
    await expect(page.getByTestId('work-order-calendar')).toHaveCount(0);
    await expect(page.getByTestId('create-work-order-button')).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '10-mobile-list-no-calendar-toggle');
  });
});
