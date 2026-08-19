import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PricingSection from '@/components/landing/PricingSection';

const SUPABASE_URL = 'https://custom-supabase.example.test';

function renderSection() {
  return render(
    <MemoryRouter>
      <PricingSection />
    </MemoryRouter>,
  );
}

describe('PricingSection', () => {
  beforeEach(() => {
    cleanup();
    vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps id=pricing, the heading, both CTAs, and a hidden collage as the first child', () => {
    const { container } = renderSection();

    const section = container.querySelector('#pricing');
    expect(section).not.toBeNull();
    expect(section).toHaveClass('relative', 'overflow-hidden');
    expect(section?.className).not.toMatch(/bg-muted/);

    const firstChild = section?.firstElementChild;
    expect(firstChild).toHaveAttribute('aria-hidden', 'true');

    expect(
      screen.getByRole('heading', { level: 2, name: /Unlimited seats\. 5 GB of photos\./i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get Started Free/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Schedule a demo/i })).toBeInTheDocument();
  });
});
