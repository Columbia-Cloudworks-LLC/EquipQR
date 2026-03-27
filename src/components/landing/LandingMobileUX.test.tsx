import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AboutSection from './AboutSection';
import HeroSection from './HeroSection';
import HowItWorksSection from './HowItWorksSection';
import LandingFooter from './LandingFooter';
import SocialProofSection from './SocialProofSection';
import WhyDifferentSection from './WhyDifferentSection';

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Landing mobile UX pass', () => {
  it('shows the hero preview as an accessible carousel with slide pickers', () => {
    renderWithRouter(<HeroSection />);

    const carousel = screen.getByRole('region', { name: /equipqr product preview/i });

    expect(within(carousel).getAllByRole('button', { name: /show slide/i })).toHaveLength(3);
    expect(within(carousel).getByRole('button', { name: /next slide/i })).toBeInTheDocument();
  });

  it('gives the secondary hero CTA a full-height touch target', () => {
    renderWithRouter(<HeroSection />);

    const secondaryCta = screen.getByRole('link', {
      name: /jump to customer proof and testimonials/i,
    });

    expect(secondaryCta).toHaveClass('min-h-11');
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

    expect(screen.getAllByLabelText('The Win')).toHaveLength(6);
  });

  it('renders footer navigation as accordion triggers on mobile', () => {
    renderWithRouter(<LandingFooter />);

    expect(screen.getByRole('button', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Company' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Legal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });
});
