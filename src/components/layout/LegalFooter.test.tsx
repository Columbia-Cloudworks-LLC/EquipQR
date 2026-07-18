import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import LegalFooter from './LegalFooter';

vi.mock('@/lib/documentationUrl', () => ({
  SUPPORT_DOCS_URL: 'http://localhost:5174/support',
}));

describe('LegalFooter', () => {
  it('uses the Help Center URL for the documentation link', () => {
    render(<LegalFooter />);

    expect(screen.getByRole('link', { name: 'Help Center' })).toHaveAttribute(
      'href',
      'http://localhost:5174/support',
    );
  });
});
