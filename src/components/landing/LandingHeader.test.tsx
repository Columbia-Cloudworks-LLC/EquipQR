import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingHeader from '@/components/landing/LandingHeader';

vi.mock('@/hooks/useActiveSection', () => ({
  useActiveSection: () => null,
}));

function renderHeader() {
  return render(
    <MemoryRouter>
      <LandingHeader />
    </MemoryRouter>,
  );
}

describe('LandingHeader', () => {
  it('exposes a single Get Started account CTA to /auth', () => {
    renderHeader();

    const header = screen.getByRole('banner');
    const accountLinks = within(header).getAllByRole('link', { name: /^Get Started$/i });
    expect(accountLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of accountLinks) {
      expect(link).toHaveAttribute('href', '/auth');
    }

    expect(within(header).queryByRole('link', { name: /^Sign In$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Get Started Free/i })).not.toBeInTheDocument();
  });
});
