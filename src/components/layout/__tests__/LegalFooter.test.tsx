import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import LegalFooter from '../LegalFooter';

vi.mock('@/lib/documentationUrl', () => ({
  DOCUMENTATION_URL: 'http://localhost:5174',
}));

describe('LegalFooter', () => {
  it('uses the configured documentation URL for the Documentation link', () => {
    render(<LegalFooter />);

    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute(
      'href',
      'http://localhost:5174',
    );
  });
});
