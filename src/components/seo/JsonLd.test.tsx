import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { JsonLd } from './JsonLd';

describe('JsonLd', () => {
  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('script[data-equipqr-jsonld]').forEach((n) => n.remove());
  });

  it('injects JSON-LD script into document.head and updates on prop change', async () => {
    const { rerender } = render(
      <JsonLd
        id="test-schema"
        data={{ '@context': 'https://schema.org', '@type': 'Thing', name: 'A' }}
      />
    );

    await waitFor(() => {
      const el = document.head.querySelector('script[data-equipqr-jsonld="test-schema"]');
      expect(el).not.toBeNull();
      expect(el?.textContent).toContain('"name":"A"');
    });

    rerender(
      <JsonLd id="test-schema" data={{ '@context': 'https://schema.org', '@type': 'Thing', name: 'B' }} />
    );

    await waitFor(() => {
      const el = document.head.querySelector('script[data-equipqr-jsonld="test-schema"]');
      expect(el?.textContent).toContain('"name":"B"');
    });
  });

  it('removes script on unmount', async () => {
    const { unmount } = render(
      <JsonLd id="temp-schema" data={{ '@context': 'https://schema.org', '@type': 'Thing' }} />
    );

    await waitFor(() => {
      expect(document.head.querySelector('script[data-equipqr-jsonld="temp-schema"]')).not.toBeNull();
    });

    unmount();

    expect(document.head.querySelector('script[data-equipqr-jsonld="temp-schema"]')).toBeNull();
  });
});
