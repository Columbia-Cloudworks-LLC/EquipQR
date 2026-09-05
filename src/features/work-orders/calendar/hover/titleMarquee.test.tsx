import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TITLE_MARQUEE_IDLE_MS,
  TITLE_MARQUEE_PASS_MS,
  startTitleMarquee,
} from '@/features/work-orders/calendar/hover/titleMarquee';

function eventWithTitle(overflow: number): HTMLElement {
  const eventEl = document.createElement('div');
  eventEl.className = 'eq-cal-event';
  const outer = document.createElement('div');
  outer.className = 'eq-cal-event-title';
  const inner = document.createElement('span');
  inner.className = 'eq-cal-event-title-inner';
  inner.textContent = 'Engine Oil & Filter Change - CAT 336 Unit 104';
  Object.defineProperty(outer, 'clientWidth', { configurable: true, value: 80 });
  Object.defineProperty(inner, 'scrollWidth', { configurable: true, value: 80 + overflow });
  outer.appendChild(inner);
  eventEl.appendChild(outer);
  return eventEl;
}

describe('startTitleMarquee', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('does nothing when the title is not truncated', () => {
    const eventEl = eventWithTitle(0);
    const inner = eventEl.querySelector('.eq-cal-event-title-inner') as HTMLElement;
    startTitleMarquee(eventEl);
    vi.advanceTimersByTime(TITLE_MARQUEE_IDLE_MS + TITLE_MARQUEE_PASS_MS);
    expect(inner.style.transform).toBe('');
  });

  it('waits 1.5s, scrolls once, snaps back, then waits before repeating', () => {
    const eventEl = eventWithTitle(40);
    const outer = eventEl.querySelector('.eq-cal-event-title') as HTMLElement;
    const inner = eventEl.querySelector('.eq-cal-event-title-inner') as HTMLElement;
    const handle = startTitleMarquee(eventEl);

    vi.advanceTimersByTime(TITLE_MARQUEE_IDLE_MS - 1);
    expect(inner.style.transform).toBe('');

    vi.advanceTimersByTime(1);
    expect(outer.classList.contains('is-marquee')).toBe(true);
    expect(inner.style.transform).toBe('translateX(-40px)');

    vi.advanceTimersByTime(TITLE_MARQUEE_PASS_MS);
    expect(inner.style.transform).toBe('translateX(0)');
    expect(outer.classList.contains('is-marquee')).toBe(false);

    vi.advanceTimersByTime(TITLE_MARQUEE_IDLE_MS);
    expect(inner.style.transform).toBe('translateX(-40px)');

    handle.stop();
    expect(inner.style.transform).toBe('translateX(0)');
    expect(outer.classList.contains('is-marquee')).toBe(false);
  });

  it('skips animation when reduced motion is preferred', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: matchMedia });
    const eventEl = eventWithTitle(40);
    const inner = eventEl.querySelector('.eq-cal-event-title-inner') as HTMLElement;
    startTitleMarquee(eventEl);
    vi.advanceTimersByTime(TITLE_MARQUEE_IDLE_MS + TITLE_MARQUEE_PASS_MS);
    expect(inner.style.transform).toBe('');
  });
});
