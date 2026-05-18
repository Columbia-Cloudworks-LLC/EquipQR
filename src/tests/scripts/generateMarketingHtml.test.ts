import { describe, it, expect } from 'vitest';
import { MARKETING_ROUTES } from '../../lib/marketingRoutes';
import { prerenderMarketingHtmlTemplate } from '../../../scripts/generate-marketing-html';

const MINIMAL_DIST_TEMPLATE = `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <title>EquipQR | Placeholder</title>
    <meta name="description" content="Placeholder description." />
    <link rel="canonical" href="https://equipqr.app" />
    <meta property="og:title" content="OG Old" />
    <meta property="og:description" content="OG Desc Old" />
    <meta property="og:url" content="https://equipqr.app" />
    <meta property="og:image:alt" content="Old alt" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@equipqr" />
    <meta name="twitter:title" content="Tw Old" />
    <meta name="twitter:description" content="Tw Desc Old" />
    <meta name="twitter:image" content="https://equipqr.app/og-image.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/index-TESTHASH.js"></script>
  </body>
</html>`;

describe('prerenderMarketingHtmlTemplate', () => {
  it('injects work order route copy, nav, metadata, and preserves Vite script', () => {
    const route = MARKETING_ROUTES.find((r) => r.path === '/features/work-order-management');
    expect(route).toBeDefined();

    const html = prerenderMarketingHtmlTemplate(MINIMAL_DIST_TEMPLATE, route!);

    expect(html).toContain('<title>Work Order Management | EquipQR</title>');
    expect(html).toContain(
      '<link rel="canonical" href="https://equipqr.app/features/work-order-management" />'
    );
    expect(html).toContain('Create, assign, and track work orders with intelligent workflows');
    expect(html).toContain('data-prerendered-marketing-route="/features/work-order-management"');
    expect(html).toContain('aria-label="Public marketing pages"');
    expect(html).toContain('Public marketing pages');
    expect(html).toContain('<script type="module" crossorigin src="/assets/index-TESTHASH.js"></script>');
    expect(html).toContain('<meta name="keywords"');
    expect(html).toMatch(/work order management, maintenance work orders/);
  });

  it('uses canonical home metadata for the /landing compatibility route', () => {
    const route = MARKETING_ROUTES.find((r) => r.path === '/landing');
    expect(route).toBeDefined();

    const html = prerenderMarketingHtmlTemplate(MINIMAL_DIST_TEMPLATE, route!);

    expect(html).toContain(
      '<title>EquipQR | Free Work Order Software for Heavy Equipment Repair Shops</title>'
    );
    expect(html).toContain('<link rel="canonical" href="https://equipqr.app/" />');
    expect(html).toContain(
      '<meta property="og:title" content="EquipQR | Free Work Order Software for Heavy Equipment Repair Shops" />'
    );
    expect(html).toContain(
      '<meta name="twitter:title" content="EquipQR | Free Work Order Software for Heavy Equipment Repair Shops" />'
    );
    expect(html).not.toContain('| EquipQR | EquipQR');
  });
});
