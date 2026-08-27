import { test, expect, quickLogin } from '../user/fixtures/equipqr-test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

const starterTemplateMatchers = [
  { cardName: /open details for template .*forklift/i, titleName: /forklift/i },
  { cardName: /open details for template .*excavator/i, titleName: /excavator/i },
  { cardName: /open details for template .*compressor/i, titleName: /compressor/i },
];

test.describe('PM template starter title readability @pr-evidence', () => {
  test('protected EquipQR starter badges do not crowd starter titles (#1462)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await quickLogin(page, 'owner');
    await gotoDashboard('/pm-templates');
    await assertHealthyShell();

    const equipQrHeading = page.getByRole('heading', { name: /equipqr templates/i });
    await expect(equipQrHeading).toBeVisible({ timeout: 30_000 });

    const equipQrSection = equipQrHeading.locator('..');
    const equipQrGrid = equipQrSection.locator('.grid').first();
    await expect(equipQrGrid).toBeVisible({ timeout: 30_000 });

    for (const matcher of starterTemplateMatchers) {
      const cardHeader = equipQrGrid.getByRole('button', { name: matcher.cardName }).first();
      const title = cardHeader.getByRole('heading', { name: matcher.titleName }).first();
      const badgeRow = cardHeader.locator('.flex.flex-wrap.items-center.gap-1').first();

      await expect(cardHeader).toBeVisible();
      await expect(title).toBeVisible();
      await expect(title).toContainText(matcher.titleName);
      await expect(badgeRow).toContainText('EquipQR');
      await expect(badgeRow).toContainText('Protected');

      const titleBox = await title.boundingBox();
      const badgeBox = await badgeRow.boundingBox();

      if (!titleBox || !badgeBox) {
        throw new Error(`Expected visible title and badge row for ${matcher.titleName}`);
      }

      expect(badgeBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);
    }

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-pm-template-starter-title-grid', { target: equipQrGrid });

    const forkliftCard = equipQrGrid
      .getByRole('button', { name: /open details for template .*forklift/i })
      .first();
    await evidencePause(page, 400);
    await evidenceScreenshot(page, '02-pm-template-starter-title-forklift-card', {
      target: forkliftCard,
    });
  });
});
