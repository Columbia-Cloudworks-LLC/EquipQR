import { describe, it, expect, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, cleanup, waitFor } from '@testing-library/react';
import { PageSEO } from './PageSEO';

const MANAGED = '[data-equipqr-page-seo]';
const TEST_SEED_ATTR = 'data-page-seo-test-seed';

function managedCount(): number {
  return document.head.querySelectorAll(MANAGED).length;
}

function removeTestSeededHeadNodes(): void {
  document.head.querySelectorAll(`[${TEST_SEED_ATTR}]`).forEach((n) => n.remove());
}

/** Mirrors index.html shell SEO tags for duplicate-tag regression tests */
function seedStaticShellSeo(): void {
  const mark = (el: Element) => {
    el.setAttribute(TEST_SEED_ATTR, 'true');
  };

  const desc = document.createElement('meta');
  desc.name = 'description';
  desc.content = 'Static shell description';
  mark(desc);
  document.head.appendChild(desc);

  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = 'https://equipqr.app';
  mark(canonical);
  document.head.appendChild(canonical);

  const ogPairs: Array<[string, string]> = [
    ['og:type', 'website'],
    ['og:url', 'https://equipqr.app'],
    ['og:title', 'Static OG title'],
    ['og:description', 'Static OG description'],
    ['og:image', 'https://equipqr.app/og-static.png'],
    ['og:image:width', '1200'],
    ['og:image:height', '630'],
    ['og:image:alt', 'Static alt'],
  ];
  for (const [prop, content] of ogPairs) {
    const m = document.createElement('meta');
    m.setAttribute('property', prop);
    m.content = content;
    mark(m);
    document.head.appendChild(m);
  }

  const twitterPairs: Array<[string, string]> = [
    ['twitter:card', 'summary_large_image'],
    ['twitter:site', '@equipqr'],
    ['twitter:title', 'Static Twitter title'],
    ['twitter:description', 'Static Twitter description'],
    ['twitter:image', 'https://equipqr.app/og-static.png'],
  ];
  for (const [name, content] of twitterPairs) {
    const m = document.createElement('meta');
    m.name = name;
    m.content = content;
    mark(m);
    document.head.appendChild(m);
  }
}

describe('PageSEO', () => {
  afterEach(() => {
    cleanup();
    removeTestSeededHeadNodes();
  });

  it('writes title, description, canonical, Open Graph, and Twitter metadata to document.head', async () => {
    document.title = 'InitialTitle';

    render(
      <PageSEO
        title="Feature"
        description="A great feature"
        path="/features/foo"
        ogImage="https://equipqr.app/custom.png"
      />
    );

    await waitFor(() => {
      expect(document.title).toBe('Feature | EquipQR');
    });

    expect(
      document.querySelector('meta[name="description"][data-equipqr-page-seo]')?.getAttribute(
        'content'
      )
    ).toBe('A great feature');

    expect(document.querySelector('meta[name="keywords"]')).toBeNull();

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe('https://equipqr.app/features/foo');
    expect(canonical?.hasAttribute('data-equipqr-page-seo')).toBe(true);

    expect(
      document
        .querySelector('meta[property="og:title"][data-equipqr-page-seo]')
        ?.getAttribute('content')
    ).toBe('Feature | EquipQR');
    expect(
      document
        .querySelector('meta[property="og:image"][data-equipqr-page-seo]')
        ?.getAttribute('content')
    ).toBe('https://equipqr.app/custom.png');
    expect(
      document
        .querySelector('meta[name="twitter:card"][data-equipqr-page-seo]')
        ?.getAttribute('content')
    ).toBe('summary_large_image');
    expect(
      document
        .querySelector('meta[name="twitter:site"][data-equipqr-page-seo]')
        ?.getAttribute('content')
    ).toBe('@equipqr');

    expect(managedCount()).toBeGreaterThan(0);
  });

  it('uses the marketing title without suffix on /', async () => {
    render(
      <PageSEO
        title="EquipQR | Free Work Order Software for Heavy Equipment Repair Shops"
        description="Home"
        path="/"
      />
    );

    await waitFor(() => {
      expect(document.title).toBe(
        'EquipQR | Free Work Order Software for Heavy Equipment Repair Shops'
      );
    });
  });

  it('restores original title after StrictMode mount/unmount cycle', async () => {
    document.title = 'StrictOriginal';

    const { unmount } = render(
      <StrictMode>
        <PageSEO title="Strict" description="d" path="/strict" />
      </StrictMode>
    );

    await waitFor(() => {
      expect(document.title).toBe('Strict | EquipQR');
    });

    unmount();
    expect(document.title).toBe('StrictOriginal');
  });

  it('updates metadata on rerender without duplicating managed nodes', async () => {
    const { rerender } = render(<PageSEO title="A" description="d1" path="/a" />);

    await waitFor(() => {
      expect(document.title).toBe('A | EquipQR');
    });
    const firstCount = managedCount();

    rerender(<PageSEO title="B" description="d2" path="/b" />);

    await waitFor(() => {
      expect(document.title).toBe('B | EquipQR');
    });
    expect(
      document.querySelector('meta[name="description"][data-equipqr-page-seo]')?.getAttribute(
        'content'
      )
    ).toBe('d2');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href')
    ).toBe('https://equipqr.app/b');
    expect(managedCount()).toBe(firstCount);
  });

  it('removes legacy keywords meta tags while mounted (never writes keywords)', async () => {
    const kw = document.createElement('meta');
    kw.name = 'keywords';
    kw.content = 'legacy,keywords';
    document.head.appendChild(kw);

    render(<PageSEO title="T" description="d" path="/x" />);

    await waitFor(() => {
      expect(document.querySelector('meta[name="keywords"]')).toBeNull();
    });
  });

  it('removes managed head nodes and restores title on unmount', async () => {
    document.title = 'Before';

    const { unmount } = render(<PageSEO title="During" description="d" path="/p" />);

    await waitFor(() => {
      expect(document.title).toBe('During | EquipQR');
    });
    expect(managedCount()).toBeGreaterThan(0);

    unmount();

    expect(document.title).toBe('Before');
    expect(document.head.querySelectorAll(MANAGED).length).toBe(0);
  });

  it('reuses static index.html shell tags without duplicate meta or canonical links', async () => {
    seedStaticShellSeo();

    const { rerender } = render(
      <PageSEO
        title="Feature"
        description="Route description"
        path="/features/bar"
        ogImage="https://equipqr.app/route.png"
      />
    );

    await waitFor(() => {
      expect(document.title).toBe('Feature | EquipQR');
    });

    expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Route description'
    );

    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href')
    ).toBe('https://equipqr.app/features/bar');

    expect(document.head.querySelectorAll('meta[property="og:title"]').length).toBe(1);
    expect(document.head.querySelectorAll('meta[name="twitter:card"]').length).toBe(1);

    rerender(
      <PageSEO title="Feature2" description="Route description 2" path="/features/baz" />
    );

    await waitFor(() => {
      expect(document.title).toBe('Feature2 | EquipQR');
    });

    expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Route description 2'
    );
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href')
    ).toBe('https://equipqr.app/features/baz');
    await waitFor(() => {
      expect(document.querySelector('meta[name="keywords"]')).toBeNull();
    });
  });

  it('restores static shell head tags after unmount when shell nodes were reused', async () => {
    seedStaticShellSeo();
    document.title = 'ShellTitle';

    const { unmount } = render(
      <PageSEO
        title="Route"
        description="Route description"
        path="/features/route"
        ogImage="https://equipqr.app/route-og.png"
      />
    );

    await waitFor(() => {
      expect(document.title).toBe('Route | EquipQR');
    });

    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Route description'
    );
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href')
    ).toBe('https://equipqr.app/features/route');
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Route | EquipQR'
    );
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://equipqr.app/route-og.png'
    );
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(
      'Route | EquipQR'
    );
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(
      'https://equipqr.app/route-og.png'
    );

    unmount();

    expect(document.title).toBe('ShellTitle');
    expect(document.head.querySelectorAll(MANAGED).length).toBe(0);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Static shell description'
    );
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href')
    ).toBe('https://equipqr.app');
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Static OG title'
    );
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://equipqr.app/og-static.png'
    );
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(
      'Static Twitter title'
    );
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(
      'https://equipqr.app/og-static.png'
    );
  });
});
