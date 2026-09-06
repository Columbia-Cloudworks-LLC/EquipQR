import { afterEach, describe, expect, it } from 'vitest';
import { bindCalendarHover } from '@/features/work-orders/calendar/hover/bindCalendarHover';

function mount(): { root: HTMLElement; cue: HTMLElement; eventEl: HTMLElement; frame: HTMLElement } {
  const root = document.createElement('div');
  root.className = 'eq-work-order-calendar';
  root.innerHTML = `
    <div class="fc-daygrid-day">
      <div class="fc-daygrid-day-frame"></div>
      <a class="fc-event eq-cal-event" href="#">
        <div class="eq-cal-event-title"><span class="eq-cal-event-title-inner">Title</span></div>
      </a>
      <a class="fc-more-link" href="#">+2 more</a>
    </div>
  `;
  const cue = document.createElement('div');
  cue.className = 'eq-cal-create-cue';
  cue.hidden = true;
  root.appendChild(cue);
  document.body.appendChild(root);
  return {
    root,
    cue,
    eventEl: root.querySelector('.eq-cal-event') as HTMLElement,
    frame: root.querySelector('.fc-daygrid-day-frame') as HTMLElement,
  };
}

describe('bindCalendarHover', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('shows the create cue on empty cell chrome and hides it on an event', () => {
    const { root, cue, eventEl, frame } = mount();
    const cell = root.querySelector('.fc-daygrid-day') as HTMLElement;
    cell.getBoundingClientRect = () => ({
      top: 0, left: 0, right: 80, bottom: 80, width: 80, height: 80, x: 0, y: 0, toJSON: () => ({}),
    });
    root.getBoundingClientRect = () => ({
      top: 0, left: 0, right: 80, bottom: 80, width: 80, height: 80, x: 0, y: 0, toJSON: () => ({}),
    });
    const unbind = bindCalendarHover(root, cue);

    frame.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: 10, clientY: 10 }));
    expect(cue.hidden).toBe(false);
    expect(cue.style.width).toBe('80px');

    eventEl.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: 12, clientY: 12 }));
    expect(cue.hidden).toBe(true);

    unbind();
  });

  it('does not show the create cue on the more link', () => {
    const { root, cue } = mount();
    const unbind = bindCalendarHover(root, cue);
    root.querySelector('.fc-more-link')?.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, clientX: 8, clientY: 8 }),
    );
    expect(cue.hidden).toBe(true);
    unbind();
  });

  it('marks the calendar as dragging on event pointerdown so hover expand cannot cancel a drag', () => {
    const { root, cue, eventEl } = mount();
    const unbind = bindCalendarHover(root, cue);

    eventEl.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 12,
      clientY: 12,
    }));
    expect(root.classList.contains('eq-cal-dragging')).toBe(true);

    eventEl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
    expect(root.classList.contains('eq-cal-dragging')).toBe(false);

    unbind();
  });
});
