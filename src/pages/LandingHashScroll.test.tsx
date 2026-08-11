import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import Landing from './Landing';

vi.mock('@/components/landing/LandingHeader', () => ({ default: () => null }));
vi.mock('@/components/landing/HeroAnimation', () => ({ default: () => null }));
vi.mock('@/components/landing/LandingFooter', () => ({ default: () => null }));
vi.mock('@/components/landing/WhyDifferentSection', () => ({ default: () => <div /> }));
vi.mock('@/components/landing/HowItWorksSection', () => ({ default: () => <div /> }));
vi.mock('@/components/landing/FeaturesSection', () => ({
  default: ({ id }: { id?: string }) => <section id={id}>features</section>,
}));
vi.mock('@/components/landing/SocialProofSection', () => ({ default: () => <div /> }));
vi.mock('@/components/landing/AboutSection', () => ({ default: () => <div /> }));
vi.mock('@/components/landing/PricingSection', () => ({
  default: () => <section id="pricing">pricing</section>,
}));
vi.mock('@/components/landing/RoadmapSection', () => ({ default: () => <div /> }));
vi.mock('@/components/landing/CTASection', () => ({ default: () => <div /> }));

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('Landing hash scroll', () => {
  const origScrollIntoView = Element.prototype.scrollIntoView;
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    mockMatchMedia(false);
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = origScrollIntoView;
    cleanup();
  });

  it('scrolls when landing loads with a hash (e.g. footer deep link into /#features)', async () => {
    render(
      <MemoryRouter initialEntries={['/#features']}>
        <Routes>
          <Route path="/" element={<Landing />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('scrolls when the hash changes while already on / (e.g. /#pricing)', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Link to="/#pricing">To pricing</Link>
        <Routes>
          <Route path="/" element={<Landing />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: /to pricing/i }));

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('uses instant scroll when prefers-reduced-motion is reduce', async () => {
    mockMatchMedia(true);

    render(
      <MemoryRouter initialEntries={['/#features']}>
        <Routes>
          <Route path="/" element={<Landing />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'auto' });
  });
});
