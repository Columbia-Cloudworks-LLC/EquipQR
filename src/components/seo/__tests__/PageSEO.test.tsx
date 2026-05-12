import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { PageSEO } from '../PageSEO';

const MANAGED = '[data-equipqr-page-seo]';

function managedCount(): number {
  return document.head.querySelectorAll(MANAGED).length;
}

describe('PageSEO', () => {
  afterEach(() => {
    cleanup();
  });

  it('writes title, description, canonical, Open Graph, and Twitter metadata to document.head', async () => {
    document.title = 'InitialTitle';

    render(
      <PageSEO
        title="Feature"
        description="A great feature"
        path="/features/foo"
        ogImage="https://equipqr.app/custom.png"
        keywords="a,b"
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
    expect(
      document.querySelector('meta[name="keywords"][data-equipqr-page-seo]')?.getAttribute(
        'content'
      )
    ).toBe('a,b');

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
      <PageSEO title="EquipQR" description="Home" path="/" />
    );

    await waitFor(() => {
      expect(document.title).toBe('EquipQR');
    });
  });

  it('updates metadata on rerender without duplicating managed nodes', async () => {
    const { rerender } = render(
      <PageSEO title="A" description="d1" path="/a" />
    );

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

  it('removes keywords meta when keywords prop is cleared', async () => {
    const { rerender } = render(
      <PageSEO title="T" description="d" path="/x" keywords="one,two" />
    );

    await waitFor(() => {
      expect(document.querySelector('meta[name="keywords"]')).not.toBeNull();
    });

    rerender(<PageSEO title="T" description="d" path="/x" />);

    await waitFor(() => {
      expect(document.querySelector('meta[name="keywords"][data-equipqr-page-seo]')).toBeNull();
    });
  });

  it('removes managed head nodes and restores title on unmount', async () => {
    document.title = 'Before';

    const { unmount } = render(
      <PageSEO title="During" description="d" path="/p" />
    );

    await waitFor(() => {
      expect(document.title).toBe('During | EquipQR');
    });
    expect(managedCount()).toBeGreaterThan(0);

    unmount();

    expect(document.title).toBe('Before');
    expect(document.head.querySelectorAll(MANAGED).length).toBe(0);
  });
});
