import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AboutSection from './AboutSection';
import HeroAnimation from './HeroAnimation';
import HowItWorksSection from './HowItWorksSection';
import LandingFooter from './LandingFooter';
import SocialProofSection from './SocialProofSection';
import WhyDifferentSection from './WhyDifferentSection';

// Mock GSAP modules so the animation components render without errors in jsdom
vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis() })),
    to: vi.fn(() => ({ kill: vi.fn() })),
    from: vi.fn(() => ({ kill: vi.fn() })),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
  default: {
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis() })),
    to: vi.fn(() => ({ kill: vi.fn() })),
    from: vi.fn(() => ({ kill: vi.fn() })),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
}));

vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn(),
}));

vi.mock('gsap/MorphSVGPlugin', () => ({
  MorphSVGPlugin: {},
}));

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Landing mobile UX pass', () => {
  it('renders the hero as a section with the correct aria-label', () => {
    renderWithRouter(<HeroAnimation />);

    expect(
      screen.getByRole('region', { name: /EquipQR asset tracking demo/i }),
    ).toBeInTheDocument();
  });

  it('renders the hero tagline as an H1 heading', () => {
    renderWithRouter(<HeroAnimation />);

    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders the reduced-motion static composite when prefers-reduced-motion is enabled', () => {
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

    renderWithRouter(<HeroAnimation />);

    expect(screen.getByTestId('static-hero-composite')).toBeInTheDocument();
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
