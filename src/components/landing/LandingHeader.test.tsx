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
  it('exposes Sign in and Create account CTAs to /auth', () => {
    renderHeader();

    const header = screen.getByRole('banner');
    
    expect(within(header).getByRole('link', { name: /^Sign in$/i })).toHaveAttribute('href', '/auth');
    expect(within(header).getByRole('link', { name: /^Create account$/i })).toHaveAttribute('href', '/auth');

    expect(within(header).queryByRole('link', { name: /^Get Started$/i })).not.toBeInTheDocument();
  });
});
