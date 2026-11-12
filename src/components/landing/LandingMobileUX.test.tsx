import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AboutSection from './AboutSection';
import HowItWorksSection from './HowItWorksSection';
import LandingFooter from './LandingFooter';
import SocialProofSection from './SocialProofSection';
import WhyDifferentSection from './WhyDifferentSection';

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Landing mobile UX pass', () => {
  // Render the sections in reduced-motion mode so LandingReveal shows content immediately
  // instead of waiting on an IntersectionObserver that jsdom does not provide.
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia });
  });

  it('renders why-different bullet titles as headings for faster scanning', () => {
    renderWithRouter(<WhyDifferentSection />);

    expect(
      screen.getByRole('heading', { level: 3, name: /one scan, full history/i })
    ).toBeInTheDocument();
  });

  it('renders how-it-works as an ordered list of steps', () => {
    renderWithRouter(<HowItWorksSection />);

    const steps = screen.getByRole('list', { name: /how equipqr works/i });

    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
  });

  it('marks landing content blocks for reveal-on-scroll motion', () => {
    const { container } = renderWithRouter(
      <>
        <WhyDifferentSection />
        <HowItWorksSection />
        <SocialProofSection />
      </>
    );

    expect(container.querySelectorAll('[data-reveal="true"]').length).toBeGreaterThan(0);
  });

  it('renders customer results as dedicated metric items', () => {
    renderWithRouter(<SocialProofSection />);

    const customerResults = screen.getByRole('list', { name: /customer results/i });

    expect(within(customerResults).getAllByRole('listitem')).toHaveLength(2);
    expect(within(customerResults).getByText('100%')).toBeInTheDocument();
    expect(within(customerResults).getByText('50%')).toBeInTheDocument();
  });

  it('renders each use-case outcome as a labeled chip', () => {
    renderWithRouter(<AboutSection />);

    expect(screen.getAllByLabelText('The Win')).toHaveLength(5);
  });

  it('shows a construction-yellow bulldozer on the equipment rental card', () => {
    renderWithRouter(<AboutSection />);

    const heading = screen.getByRole('heading', { name: /equipment rental agencies/i });
    const icon = screen.getByTestId('about-rental-bulldozer');
    const well = icon.closest('span');

    expect(heading).toBeInTheDocument();
    expect(icon.tagName.toLowerCase()).toBe('svg');
    expect(well?.className).toMatch(/text-warning/);
    expect(well?.className).toMatch(/bg-warning/);
  });

  it('renders footer navigation as accordion triggers on mobile', () => {
    renderWithRouter(<LandingFooter />);

    expect(screen.getByRole('button', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Company' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Legal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });
});
