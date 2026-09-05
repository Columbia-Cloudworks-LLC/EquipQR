import { afterEach, describe, expect, it } from 'vitest';
import { startTitleExpand } from '@/features/work-orders/calendar/hover/titleExpand';

function rect(
  left: number,
  width: number,
): DOMRect {
  return {
    x: left,
    y: 0,
    top: 0,
    left,
    right: left + width,
    bottom: 24,
    width,
    height: 24,
    toJSON: () => ({}),
  };
}

function mountChip(args: {
  titleClientWidth: number;
  titleScrollWidth: number;
  eventLeft: number;
  eventWidth: number;
  rootLeft?: number;
  rootWidth?: number;
}): { root: HTMLElement; eventEl: HTMLElement; title: HTMLElement } {
  const root = document.createElement('div');
  root.className = 'eq-work-order-calendar';
  root.innerHTML = `
    <a class="fc-event eq-cal-event eq-cal-chip" href="#">
      <div class="fc-event-main">
        <div class="fc-event-main-frame">
          <div class="fc-event-title-container">
            <div class="fc-event-title fc-sticky">Undercarriage Rebuild - Komatsu PC210 Unit 101</div>
          </div>
        </div>
      </div>
    </a>
  `;
  const eventEl = root.querySelector('.eq-cal-event') as HTMLElement;
  const title = root.querySelector('.fc-event-title') as HTMLElement;
  Object.defineProperty(title, 'clientWidth', { configurable: true, value: args.titleClientWidth });
  Object.defineProperty(title, 'scrollWidth', { configurable: true, value: args.titleScrollWidth });
  eventEl.getBoundingClientRect = () => rect(args.eventLeft, args.eventWidth);
  root.getBoundingClientRect = () => rect(args.rootLeft ?? 0, args.rootWidth ?? 800);
  document.body.appendChild(root);
  return { root, eventEl, title };
}

describe('startTitleExpand', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('does nothing when the title already fits', () => {
    const { eventEl } = mountChip({
      titleClientWidth: 160,
      titleScrollWidth: 160,
      eventLeft: 200,
      eventWidth: 168,
    });

    startTitleExpand(eventEl);

    expect(eventEl.classList.contains('is-expanded')).toBe(false);
    expect(eventEl.style.width).toBe('');
    expect(eventEl.style.transform).toBe('');
  });

  it('grows the chip from the center to fit the full title', () => {
    const { eventEl, title } = mountChip({
      titleClientWidth: 160,
      titleScrollWidth: 240,
      eventLeft: 300,
      eventWidth: 168,
    });

    const handle = startTitleExpand(eventEl);

    expect(eventEl.classList.contains('is-expanded')).toBe(true);
    expect(title.classList.contains('is-expanded')).toBe(true);
    expect(eventEl.style.width).toBe('248px');
    expect(eventEl.style.transform).toBe('translateX(-40px)');

    handle.stop();
    expect(eventEl.classList.contains('is-expanded')).toBe(false);
    expect(title.classList.contains('is-expanded')).toBe(false);
    expect(eventEl.style.width).toBe('');
    expect(eventEl.style.transform).toBe('');
  });

  it('clamps expansion so the chip stays inside the calendar', () => {
    const { eventEl } = mountChip({
      titleClientWidth: 80,
      titleScrollWidth: 200,
      eventLeft: 20,
      eventWidth: 88,
      rootLeft: 0,
      rootWidth: 400,
    });

    startTitleExpand(eventEl);

    expect(eventEl.style.width).toBe('208px');
    expect(eventEl.style.transform).toBe('translateX(-20px)');
  });
});
