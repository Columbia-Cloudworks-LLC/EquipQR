import { expect, type BrowserContext, type Page } from '@playwright/test';

export type GoogleDocExportResult = {
  documentUrl: string;
};

export async function exportWorkOrderToGoogleDoc(
  page: Page,
  workOrderId: string,
): Promise<GoogleDocExportResult> {
  await page.goto(`/dashboard/work-orders/${workOrderId}`);
  await expect(page).toHaveURL(new RegExp(`/dashboard/work-orders/${workOrderId}`, 'i'), {
    timeout: 60_000,
  });

  await page.getByRole('button', { name: 'Actions' }).click();

  const googleDocMenuItem = page.getByRole('menuitem', {
    name: /internal work order packet \(google doc\)/i,
  });
  await expect(
    googleDocMenuItem,
    'Google Doc export is unavailable. Connect Google Workspace on Integrations (with Docs/Drive scopes) ' +
      'then re-run npm run e2e:google-auth:capture if EquipQR session expired.',
  ).toBeVisible({ timeout: 30_000 });

  const exportResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/functions/v1/export-work-orders-to-google-docs') &&
      response.request().method() === 'POST',
    { timeout: 120_000 },
  );

  await googleDocMenuItem.click();

  const exportResponse = await exportResponsePromise;
  expect(exportResponse.ok()).toBeTruthy();

  const body = (await exportResponse.json()) as {
    id?: string;
    webViewLink?: string;
    error?: string;
  };
  expect(body.webViewLink).toBeTruthy();

  return { documentUrl: body.webViewLink! };
}

export async function assertGoogleDocOpens(
  context: BrowserContext,
  documentUrl: string,
): Promise<void> {
  const docPage = await context.newPage();
  try {
    await docPage.goto(documentUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });

    const { hostname, pathname } = new URL(docPage.url());
    expect(hostname).toBe('docs.google.com');
    expect(pathname).toMatch(/^\/document\//);

    const signInHeading = docPage.getByRole('heading', { name: /sign in|log in/i });
    if ((await signInHeading.count()) > 0) {
      throw new Error(
        'Google Docs session is not authenticated. Re-capture storage state with npm run e2e:google-auth:capture ' +
          'after signing in as nicholas.king@columbiacloudworks.com.',
      );
    }

    await expect(docPage.locator('body')).toBeVisible({ timeout: 60_000 });
  } finally {
    await docPage.close();
  }
}
