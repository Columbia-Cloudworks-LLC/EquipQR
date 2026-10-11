import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = process.env.EQUIPQR_ROOT || path.resolve(__dirname, '..');
const BASE_URL = process.env.EQUIPQR_BASE_URL || 'http://localhost:8080';
// Gitignored marketing source drop; images under public/ must live in public/images/.
const MARKETING_DIR = path.join(ROOT_DIR, 'public', 'images', 'marketing');

console.log('Resolved ROOT_DIR:', ROOT_DIR);
console.log('Resolved MARKETING_DIR:', MARKETING_DIR);

fs.mkdirSync(MARKETING_DIR, { recursive: true });

async function injectCleanMobileStatusBar(page: Page) {
  await page.evaluate(() => {
    // Remove previous status bar if exists
    document.getElementById('marketing-status-bar')?.remove();

    const bar = document.createElement('div');
    bar.id = 'marketing-status-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.style.position = 'fixed';
    bar.style.top = '0';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.height = '48px';
    bar.style.zIndex = '99999';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.justifyContent = 'space-between';
    bar.style.padding = '0 24px';
    bar.style.backgroundColor = 'rgba(9, 10, 15, 0.95)';
    bar.style.backdropFilter = 'blur(12px)';
    bar.style.color = '#ffffff';
    bar.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';
    bar.style.fontSize = '14.5px';
    bar.style.fontWeight = '600';
    bar.style.userSelect = 'none';
    bar.style.pointerEvents = 'none';

    bar.innerHTML = `
      <div style="display:flex;align-items:center;letter-spacing:-0.2px;">9:41</div>
      <div style="width:115px;height:30px;background:#000000;border-radius:18px;margin-top:-2px;box-shadow:0 0 1px 1px rgba(255,255,255,0.08);"></div>
      <div style="display:flex;align-items:center;gap:7px;">
        <!-- Cell Signal -->
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" style="display:block;">
          <rect x="0" y="7.5" width="2.5" height="3.5" rx="0.8" fill="#ffffff"/>
          <rect x="4.5" y="5" width="2.5" height="6" rx="0.8" fill="#ffffff"/>
          <rect x="9" y="2.5" width="2.5" height="8.5" rx="0.8" fill="#ffffff"/>
          <rect x="13.5" y="0" width="2.5" height="11" rx="0.8" fill="#ffffff"/>
        </svg>
        <!-- Wi-Fi -->
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none" style="display:block;">
          <path d="M7.5 10.5C8.05228 10.5 8.5 10.0523 8.5 9.5C8.5 8.94772 8.05228 8.5 7.5 8.5C6.94772 8.5 6.5 8.94772 6.5 9.5C6.5 10.0523 6.94772 10.5 7.5 10.5Z" fill="#ffffff"/>
          <path d="M4.67 6.67C6.23 5.11 8.77 5.11 10.33 6.67" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M2.36 4.36C5.2 1.52 9.8 1.52 12.64 4.36" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <!-- Battery -->
        <div style="display:flex;align-items:center;gap:1.5px;">
          <div style="width:23px;height:11.5px;border:1.2px solid #ffffff;border-radius:3.5px;padding:1.5px;display:flex;align-items:center;">
            <div style="width:100%;height:100%;background:#ffffff;border-radius:1.5px;"></div>
          </div>
          <div style="width:1.5px;height:4px;background:#ffffff;border-radius:0 1px 1px 0;"></div>
        </div>
      </div>
    `;

    document.body.prepend(bar);

    // Add safe area top offset to main layout
    const main = document.querySelector('main');
    if (main) {
      (main as HTMLElement).style.paddingTop = '40px';
    }
    const stickyBars = document.querySelectorAll('.sticky');
    stickyBars.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style.top === '0px' || getComputedStyle(htmlEl).top === '0px') {
        htmlEl.style.top = '48px';
      }
    });
  });
}

async function preparePageHygiene(page: Page) {
  await page.evaluate(() => {
    // Ensure forced dark mode styling
    document.documentElement.classList.add('dark');
    // Hide toast containers and dev overlays
    const selectors = [
      '[data-sonner-toaster]',
      '.sonner-toaster',
      '#webpack-dev-server-client-overlay',
      'div[role="status"][aria-live="polite"]',
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => ((el as HTMLElement).style.display = 'none'));
    }
  });
}

async function saveImageDeliverables(page: Page, filename: string) {
  const p1 = path.join(MARKETING_DIR, filename);
  await page.screenshot({ path: p1, fullPage: false });
  console.log(`Saved screenshot: ${filename} to ${p1} (${fs.statSync(p1).size} bytes)`);
}

async function loginAsAlexApex(page: Page) {
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForTimeout(1500);

  const trigger = page
    .getByRole('combobox')
    .or(page.getByRole('button', { name: /select a test account|persona/i }));
  await trigger.first().click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: /Alex Apex/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /quick login/i }).click();
  await page.waitForURL(/\/dashboard/i, { timeout: 45000 });

  // Pin org to Apex Construction and clear cached session payload
  const apexOrgId = '660e8400-e29b-41d4-a716-446655440000';
  await page.evaluate((orgId) => {
    localStorage.setItem('equipqr_current_organization', orgId);
    localStorage.setItem('equipqr_current_org', JSON.stringify({
      selectedOrgId: orgId,
      selectionTimestamp: new Date().toISOString(),
    }));
    localStorage.removeItem('equipqr_session_data');
  }, apexOrgId);
}

async function main() {
  console.log('Launching browser for marketing capture at', BASE_URL);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Mobile Context (iPhone 15 Pro: 393 x 852 px, DPR = 2)
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    colorScheme: 'dark',
  });
  await mobileContext.addInitScript(() => {
    localStorage.setItem('equipqr:cookie-consent', 'accepted');
  });

  const mobilePage = await mobileContext.newPage();
  console.log('Performing login on mobile context...');
  await loginAsAlexApex(mobilePage);

  // -------------------------------------------------------------
  // SHOT 1: Asset Profile & History (Mobile View)
  // Route: /assets/[id] (e.g. CAT 320 GC) -> /dashboard/equipment/aa0e8400-e29b-41d4-a716-44665544a104?tab=work-orders
  // -------------------------------------------------------------
  console.log('Capturing Shot 1: Asset Profile & History (Mobile)...');
  await mobilePage.goto(`${BASE_URL}/assets/aa0e8400-e29b-41d4-a716-44665544a104?tab=work-orders`, {
    waitUntil: 'networkidle',
  });
  await mobilePage.waitForTimeout(1500);
  await preparePageHygiene(mobilePage);

  // Switch to Orders tab explicitly
  const ordersTab = mobilePage.getByRole('tab', { name: /orders/i });
  if (await ordersTab.isVisible()) {
    await ordersTab.click();
    await mobilePage.waitForTimeout(800);
  }

  // Ensure top header elements and recent service timeline are framed cleanly
  await mobilePage.evaluate(() => {
    // Hide map card
    const cards = Array.from(document.querySelectorAll('.shadow-elevation-2, [class*="Card"]'));
    for (const c of cards) {
      const text = c.textContent || '';
      if (text.includes('Effective location') || text.includes('Map unavailable')) {
        (c as HTMLElement).style.display = 'none';
      }
      if (text.includes('Preventative Maintenance') && (text.includes('No PM records found') || text.includes('Excavator PM'))) {
        (c as HTMLElement).style.display = 'none';
      }
    }
    // Make header quick info cards slightly more compact so everything fits above the fold
    const infoCards = document.querySelectorAll('.grid.grid-cols-1.gap-3 > div, .grid.grid-cols-1.gap-3 > button');
    infoCards.forEach(el => {
      (el as HTMLElement).style.padding = '8px 12px';
    });

    const main = document.getElementById('main-content');
    if (main) main.scrollTop = 0;
  });
  await injectCleanMobileStatusBar(mobilePage);
  await mobilePage.waitForTimeout(500);
  await saveImageDeliverables(mobilePage, '01-asset-profile-history-mobile.png');

  // -------------------------------------------------------------
  // SHOT 2: Active Work Order / PM Inspection Checklist (Mobile View)
  // Route: /work-orders/[id] -> /dashboard/work-orders/dd0e8400-e29b-41d4-a716-44665544a102
  // -------------------------------------------------------------
  console.log('Capturing Shot 2: Active Work Order / PM Inspection Checklist (Mobile)...');
  await mobilePage.goto(`${BASE_URL}/work-orders/dd0e8400-e29b-41d4-a716-44665544a102`, {
    waitUntil: 'networkidle',
  });
  await mobilePage.waitForTimeout(1500);
  await preparePageHygiene(mobilePage);

  // Expand the Walk-Around Inspection section
  await mobilePage.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const sectionBtn = buttons.find(
      b => b.textContent?.includes('Walk-Around Inspection')
    );
    if (sectionBtn) {
      (sectionBtn as HTMLElement).click();
    }
  });
  await mobilePage.waitForTimeout(800);

  // Scroll #main-content so that the PM checklist section with completed checks & defect is framed
  await mobilePage.evaluate(() => {
    const main = document.getElementById('main-content');
    const walkAroundEl = Array.from(document.querySelectorAll('*')).find(
      el => el.textContent?.includes('Walk-Around Inspection') && el.children.length === 0
    );

    if (main && walkAroundEl) {
      const targetCard = walkAroundEl.closest('[class*="Card"], .border.rounded-lg') || walkAroundEl;
      const top = (targetCard as HTMLElement).offsetTop;
      main.scrollTop = Math.max(0, top - 20);
    } else if (main) {
      main.scrollTop = 520;
    }
  });

  await injectCleanMobileStatusBar(mobilePage);
  await mobilePage.waitForTimeout(500);
  await saveImageDeliverables(mobilePage, '02-pm-inspection-checklist-mobile.png');

  await mobileContext.close();

  // Desktop Context (1440 x 900 px, DPR = 2)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  await desktopContext.addInitScript(() => {
    localStorage.setItem('equipqr:cookie-consent', 'accepted');
    localStorage.setItem('equipqr:equipment-view-mode', 'table');
  });

  const desktopPage = await desktopContext.newPage();
  console.log('Performing login on desktop context...');
  await loginAsAlexApex(desktopPage);

  // -------------------------------------------------------------
  // SHOT 3: QuickBooks Export / Billing Sync (Desktop View)
  // Route: /dashboard/work-orders/dd0e8400-e29b-41d4-a716-44665544a101
  // -------------------------------------------------------------
  console.log('Capturing Shot 3: QuickBooks Export / Billing Sync (Desktop)...');
  await desktopPage.goto(`${BASE_URL}/dashboard/work-orders/dd0e8400-e29b-41d4-a716-44665544a101`, {
    waitUntil: 'networkidle',
  });
  await desktopPage.waitForTimeout(1500);
  await preparePageHygiene(desktopPage);
  // Hide map placeholder on desktop so Itemized Costs (Labor & Parts), Subtotal, and QuickBooks sync badge are cleanly in view
  await desktopPage.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.shadow-elevation-2, [class*="Card"]'));
    for (const c of cards) {
      if (c.textContent?.includes('Effective location') || c.textContent?.includes('Map unavailable')) {
        (c as HTMLElement).style.display = 'none';
      }
    }
  });
  await desktopPage.waitForTimeout(500);
  await saveImageDeliverables(desktopPage, '03-quickbooks-billing-sync-desktop.png');

  // -------------------------------------------------------------
  // SHOT 4: Fleet / Shop Overview (Desktop View)
  // Route: /dashboard/equipment
  // -------------------------------------------------------------
  console.log('Capturing Shot 4: Fleet / Shop Overview (Desktop)...');
  // Pin team to Heavy Equipment Fleet (e10e8400-e29b-41d4-a716-446655440001) so the authentic assets are framed
  await desktopPage.evaluate((teamId) => {
    localStorage.setItem('equipqr:selectedTeamId:660e8400-e29b-41d4-a716-446655440000', teamId);
    localStorage.setItem('equipqr:equipment-view-mode', 'table');
  }, 'e10e8400-e29b-41d4-a716-446655440001');

  await desktopPage.goto(`${BASE_URL}/dashboard/equipment`, {
    waitUntil: 'networkidle',
  });
  await desktopPage.waitForTimeout(1500);

  // Ensure table view is selected
  await desktopPage.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const tableBtn = buttons.find(b => b.getAttribute('aria-label')?.includes('table') || b.getAttribute('title')?.includes('table'));
    if (tableBtn) tableBtn.click();
  });
  await desktopPage.waitForTimeout(800);
  await preparePageHygiene(desktopPage);
  await desktopPage.waitForTimeout(500);
  await saveImageDeliverables(desktopPage, '04-fleet-shop-overview-desktop.png');

  await desktopContext.close();
  await browser.close();
  console.log('All 4 marketing screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Error capturing marketing screenshots:', err);
  process.exit(1);
});
