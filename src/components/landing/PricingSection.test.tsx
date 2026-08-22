import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PricingSection from '@/components/landing/PricingSection';

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
