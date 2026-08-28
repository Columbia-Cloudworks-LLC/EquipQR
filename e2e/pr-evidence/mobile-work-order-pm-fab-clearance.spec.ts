import { test, expect, quickLogin, type Locator, type Page } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
const VERCEL_SHARE_URL = process.env.VERCEL_SHARE_URL?.trim();
const PM_BUTTON_WORK_ORDER_TITLES = [
  /^QA 1481 Accepted Tom$/i,
  /^QA 1481 Accepted Tom Unassign$/i,
  /^Mobile FAB Reject Fix \d+$/i,
  /^Mobile FAB Clearance \d+$/i,
] as const;

test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: MOBILE_USER_AGENT,
});

test.describe('Mobile work order PM action FAB clearance @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('keeps Add PM clear of the FAB lane while Timeline and timestamps stay tappable', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    if (VERCEL_SHARE_URL) {
      await page.goto(VERCEL_SHARE_URL);
      await page.waitForLoadState('domcontentloaded');
    }

    await quickLogin(page, 'technician');
    await openTechnicianWorkOrderWithAddPm(page, gotoDashboard);

    const addPmButton = page.getByRole('button', { name: /add pm checklist/i });
    const quickActionsFab = page.getByRole('button', { name: /open work order quick actions/i });

    await assertHealthyShell();
    await expect(addPmButton).toBeVisible({ timeout: 30_000 });
    await expect(quickActionsFab).toBeVisible({ timeout: 30_000 });

    await expectPointToHitLocatorLabel({
      page,
      locator: addPmButton,
      labelText: 'Add PM Checklist',
      description: 'Add PM Checklist label',
      forbiddenLocator: quickActionsFab,
      forbiddenDescription: 'quick actions FAB',
    });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-mobile-add-pm-clear-of-fab', { target: addPmButton });

    const eventsTimes = page.getByRole('button', { name: /events & times/i });
    await eventsTimes.scrollIntoViewIfNeeded();
    await expect(eventsTimes).toBeVisible({ timeout: 30_000 });
    await eventsTimes.click();

    const timelineHeading = page.getByText('Timeline', { exact: true }).first();
    const firstTimestamp = page.locator('time').first();

    await expect(timelineHeading).toBeVisible({ timeout: 15_000 });
    await expect(firstTimestamp).toBeVisible({ timeout: 15_000 });

    await expectPointToHitLocatorCenter({
      page,
      locator: timelineHeading,
      description: 'Timeline heading',
      forbiddenLocator: quickActionsFab,
      forbiddenDescription: 'quick actions FAB',
    });
    await expectPointToHitLocatorCenter({
      page,
      locator: firstTimestamp,
      description: 'first events timestamp',
      forbiddenLocator: quickActionsFab,
      forbiddenDescription: 'quick actions FAB',
    });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-mobile-timeline-and-timestamp-clear', { target: firstTimestamp });
  });
});

interface HitPointExpectation {
  page: Page;
  locator: Locator;
  description: string;
  forbiddenLocator: Locator;
  forbiddenDescription: string;
}

interface LabelHitPointExpectation extends HitPointExpectation {
  labelText: string;
}

async function expectPointToHitLocatorLabel({
  page,
  locator,
  labelText,
  description,
  forbiddenLocator,
  forbiddenDescription,
}: LabelHitPointExpectation): Promise<void> {
  const hitPoint = await locator.evaluate((element, text) => {
    const textWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

    while (textWalker.nextNode()) {
      const textNode = textWalker.currentNode;
      const content = textNode.textContent ?? '';
      const startIndex = content.indexOf(text);
      if (startIndex < 0) {
        continue;
      }

      const range = document.createRange();
      range.setStart(textNode, startIndex);
      range.setEnd(textNode, startIndex + text.length);
      const rect = range.getBoundingClientRect();

      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    throw new Error(`Could not find label text "${text}" inside locator`);
  }, labelText);

  await expectPointToHitLocator({
    page,
    locator,
    description,
    point: hitPoint,
    forbiddenLocator,
    forbiddenDescription,
  });
}

async function expectPointToHitLocatorCenter({
  page,
  locator,
  description,
  forbiddenLocator,
  forbiddenDescription,
}: HitPointExpectation): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, `${description} should have a measurable bounding box`).not.toBeNull();

  await expectPointToHitLocator({
    page,
    locator,
    description,
    point: {
      x: box!.x + box!.width / 2,
      y: box!.y + box!.height / 2,
    },
    forbiddenLocator,
    forbiddenDescription,
  });
}

async function expectPointToHitLocator({
  page,
  locator,
  description,
  point,
  forbiddenLocator,
  forbiddenDescription,
}: HitPointExpectation & { point: { x: number; y: number } }): Promise<void> {
  const targetHandle = await locator.elementHandle();
  const forbiddenHandle = await forbiddenLocator.elementHandle();

  expect(targetHandle, `${description} should resolve to an element handle`).not.toBeNull();
  expect(forbiddenHandle, `${forbiddenDescription} should resolve to an element handle`).not.toBeNull();

  const hit = await page.evaluate(
    ({ x, y, target, forbidden }) => {
      const hitElement = document.elementFromPoint(x, y);
      const hitTarget = Boolean(
        hitElement &&
          target &&
          (hitElement === target || target.contains(hitElement)),
      );
      const hitForbidden = Boolean(
        hitElement &&
          forbidden &&
          (hitElement === forbidden || forbidden.contains(hitElement)),
      );

      return {
        hitTarget,
        hitForbidden,
        hitTagName: hitElement?.tagName ?? null,
        hitRole: hitElement?.getAttribute('role') ?? null,
        hitText: hitElement?.textContent?.trim()?.slice(0, 80) ?? null,
        hitAriaLabel: hitElement?.getAttribute('aria-label') ?? null,
      };
    },
    {
      x: point.x,
      y: point.y,
      target: targetHandle,
      forbidden: forbiddenHandle,
    },
  );

  expect(hit.hitTarget, `${description} should win elementFromPoint at ${point.x}, ${point.y}`).toBe(true);
  expect(hit.hitForbidden, `${description} should not be covered by ${forbiddenDescription}`).toBe(false);
}

async function openTechnicianWorkOrderWithAddPm(
  page: Page,
  gotoDashboard: (route: string) => Promise<void>,
): Promise<void> {
  await gotoDashboard('/dashboard/work-orders');
  await expect(page.getByRole('heading', { name: /^work orders$/i })).toBeVisible({ timeout: 60_000 });

  for (const titlePattern of PM_BUTTON_WORK_ORDER_TITLES) {
    const workOrderCard = page.getByRole('button', { name: titlePattern }).first();
    if (!(await workOrderCard.isVisible({ timeout: 2_000 }).catch(() => false))) {
      continue;
    }

    await workOrderCard.click();

    const addPmButton = page.getByRole('button', { name: /add pm checklist/i });
    if (await addPmButton.isVisible({ timeout: 8_000 }).catch(() => false)) {
      return;
    }

    await gotoDashboard('/dashboard/work-orders');
  }

  throw new Error('Could not find a preview work order that shows Add PM Checklist for Tom Technician.');
}
