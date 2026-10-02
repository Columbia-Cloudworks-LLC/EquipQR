import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroGallery } from './HeroGallery';
import {
  HERO_GALLERY_HOLD_MS,
  HERO_GALLERY_MANUAL_PAUSE_MS,
  type HeroSlideDefinition,
  type HeroSlideProps,
} from './types';

function setReducedMotion(enabled: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: enabled && query.includes('prefers-reduced-motion'),
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

function mockSlide(index: number): HeroSlideDefinition {
  const label = `Story ${index + 1}`;
  return {
    id: `story-${index + 1}`,
    label,
    description: `${label} explains one EquipQR workflow from start to finish.`,
    preload: () => Promise.resolve(),
    Stage: function Stage({ onLoopComplete }: HeroSlideProps) {
      return (
        <button type="button" data-testid={`loop-${index + 1}`} onClick={onLoopComplete}>
          complete {label}
        </button>
      );
    },
    StaticFrame: function StaticFrame() {
      return <div data-testid={`static-${index + 1}`}>{label} still</div>;
    },
    Fallback: function Fallback() {
      return null;
    },
  };
}

function renderGallery(slides: HeroSlideDefinition[]) {
  return render(
    <MemoryRouter>
      <HeroGallery slides={slides} />
    </MemoryRouter>,
  );
}

describe('HeroGallery', () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the headline and signup action outside the changing story', () => {
    renderGallery([mockSlide(0), mockSlide(1)]);
    expect(screen.getByRole('heading', { level: 1, name: /QR-tracked work orders/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /get started free/i })).toHaveAttribute('href', '/auth?tab=signup');
    expect(screen.getByRole('region', { name: /workflow gallery/i })).toBeInTheDocument();
  });

  it('supports five registered stories and shows which one is active', () => {
    const slides = [0, 1, 2, 3, 4].map(mockSlide);
    renderGallery(slides);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Story 4' }));
    expect(screen.getByRole('tab', { name: 'Story 4' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Story 1' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('link', { name: /get started free/i })).toBeInTheDocument();
  });

  it('moves between stories with the keyboard', () => {
    renderGallery([mockSlide(0), mockSlide(1), mockSlide(2)]);
    const first = screen.getByRole('tab', { name: 'Story 1' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Story 2' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Story 2' })).toHaveFocus();
  });

  it('advances only after a completed loop and a short hold', () => {
    vi.useFakeTimers();
    renderGallery([mockSlide(0), mockSlide(1)]);
    fireEvent.click(screen.getByTestId('loop-1'));
    expect(screen.getByRole('tab', { name: 'Story 1' })).toHaveAttribute('aria-selected', 'true');
    act(() => {
      vi.advanceTimersByTime(HERO_GALLERY_HOLD_MS - 1);
    });
    expect(screen.getByRole('tab', { name: 'Story 1' })).toHaveAttribute('aria-selected', 'true');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('tab', { name: 'Story 2' })).toHaveAttribute('aria-selected', 'true');
  });

  it('does not auto-advance while stories are paused or just after a manual choice', () => {
    vi.useFakeTimers();
    renderGallery([mockSlide(0), mockSlide(1)]);
    fireEvent.click(screen.getByRole('button', { name: 'Pause stories' }));
    fireEvent.click(screen.getByTestId('loop-1'));
    act(() => {
      vi.advanceTimersByTime(HERO_GALLERY_HOLD_MS);
    });
    expect(screen.getByRole('tab', { name: 'Story 1' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Play stories' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Story 2' }));
    fireEvent.click(screen.getByTestId('loop-2'));
    act(() => {
      vi.advanceTimersByTime(HERO_GALLERY_MANUAL_PAUSE_MS);
    });
    expect(screen.getByRole('tab', { name: 'Story 2' })).toHaveAttribute('aria-selected', 'true');
  });

  it('changes stories on a horizontal touch swipe and ignores a vertical drag', () => {
    renderGallery([mockSlide(0), mockSlide(1)]);
    const stage = screen.getByTestId('hero-gallery-stage');
    fireEvent.pointerDown(stage, { pointerType: 'touch', clientX: 80, clientY: 40 });
    fireEvent.pointerUp(stage, { pointerType: 'touch', clientX: 90, clientY: 180 });
    expect(screen.getByRole('tab', { name: 'Story 1' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.pointerDown(stage, { pointerType: 'touch', clientX: 220, clientY: 80 });
    fireEvent.pointerUp(stage, { pointerType: 'touch', clientX: 40, clientY: 90 });
    expect(screen.getByRole('tab', { name: 'Story 2' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows still frames and skips auto-rotation when reduced motion is on', () => {
    setReducedMotion(true);
    renderGallery([mockSlide(0), mockSlide(1)]);
    expect(screen.getByTestId('static-1')).toBeInTheDocument();
    expect(screen.queryByTestId('loop-1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause stories/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Story 2' }));
    expect(screen.getByTestId('static-2')).toBeInTheDocument();
  });
});
