import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useEffect } from 'react';
import HeroSection from './HeroSection';

type EventName = 'select' | 'settle' | 'reInit';
type Listener = (api: FakeCarouselApi) => void;

type FakeCarouselApi = {
  selectedScrollSnap: () => number;
  scrollSnapList: () => number[];
  on: (event: EventName, callback: Listener) => void;
  off: (event: EventName, callback: Listener) => void;
  scrollTo: (index: number) => void;
};

let selectedSnap = 0;
const listeners = new Map<EventName, Listener>();

const fakeApi: FakeCarouselApi = {
  selectedScrollSnap: () => selectedSnap,
  scrollSnapList: () => [0, 1, 2],
  on: (event, callback) => {
    listeners.set(event, callback);
  },
  off: (event, callback) => {
    if (listeners.get(event) === callback) {
      listeners.delete(event);
    }
  },
  scrollTo: (index) => {
    selectedSnap = index;
  },
};

vi.mock('@/components/ui/carousel', () => {
  const Carousel = ({
    setApi,
    children,
    ...props
  }: {
    setApi?: (api: FakeCarouselApi) => void;
    children: React.ReactNode;
  }) => {
    useEffect(() => {
      setApi?.(fakeApi);
    }, [setApi]);

    return (
      <div role="region" aria-label="EquipQR product preview" {...props}>
        {children}
      </div>
    );
  };

  const CarouselContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const CarouselItem = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const CarouselPrevious = () => <button type="button">Previous slide</button>;
  const CarouselNext = () => <button type="button">Next slide</button>;

  return {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
  };
});

describe('HeroSection carousel sync regression', () => {
  beforeEach(() => {
    selectedSnap = 0;
    listeners.clear();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates active slide indicator on settle, not on select', () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    );

    const slideOneButton = screen.getByRole('button', { name: /show slide 1/i });
    const slideTwoButton = screen.getByRole('button', { name: /show slide 2/i });

    expect(slideOneButton).toHaveAttribute('aria-pressed', 'true');
    expect(slideTwoButton).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      selectedSnap = 1;
      listeners.get('select')?.(fakeApi);
    });

    expect(slideOneButton).toHaveAttribute('aria-pressed', 'true');
    expect(slideTwoButton).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      listeners.get('settle')?.(fakeApi);
    });

    expect(slideOneButton).toHaveAttribute('aria-pressed', 'false');
    expect(slideTwoButton).toHaveAttribute('aria-pressed', 'true');
  });
});
