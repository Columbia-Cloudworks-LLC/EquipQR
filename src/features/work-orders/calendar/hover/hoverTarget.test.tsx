import { afterEach, describe, expect, it } from 'vitest';
import {
  classifyCalendarHover,
  createCueRect,
  findSlotAtY,
} from '@/features/work-orders/calendar/hover/hoverTarget';

afterEach(() => {
  document.body.replaceChildren();
});

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'eq-work-order-calendar';
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

describe('classifyCalendarHover', () => {
  it('treats an event as hover-grow, not create', () => {
    const root = mount(`
      <div class="fc-daygrid-day">
        <a class="fc-event eq-cal-event" href="#">Oil change</a>
      </div>
    `);
    const eventEl = root.querySelector('.eq-cal-event') as HTMLElement;
    expect(classifyCalendarHover(eventEl, root)).toEqual({ kind: 'event', eventEl });
  });

  it('does not show create chrome on the more link', () => {
    const root = mount(`
      <div class="fc-daygrid-day">
        <a class="fc-more-link" href="#">+2 more</a>
      </div>
    `);
    expect(classifyCalendarHover(root.querySelector('.fc-more-link'), root)).toEqual({
      kind: 'more-link',
    });
  });

  it('classifies empty day-cell chrome as create', () => {
    const root = mount(`<div class="fc-daygrid-day"><div class="fc-daygrid-day-frame"></div></div>`);
    const frame = root.querySelector('.fc-daygrid-day-frame');
    const kind = classifyCalendarHover(frame, root);
    expect(kind.kind).toBe('create-day');
    if (kind.kind === 'create-day') {
      expect(kind.cellEl).toBe(root.querySelector('.fc-daygrid-day'));
    }
  });

  it('hides create chrome while dragging or selecting', () => {
    const root = mount(`
      <div class="fc-daygrid-day">
        <div class="fc-highlight"></div>
        <div class="fc-daygrid-day-frame"></div>
      </div>
    `);
    expect(classifyCalendarHover(root.querySelector('.fc-daygrid-day-frame'), root)).toEqual({
      kind: 'none',
    });
  });

  it('maps a time-grid column plus slot row to create-slot', () => {
    const root = mount(`
      <table>
        <tr>
          <td class="fc-timegrid-slot-lane" data-time="08:00:00"></td>
        </tr>
      </table>
      <div class="fc-timegrid-col" data-date="2026-08-20"></div>
    `);
    const slot = root.querySelector('.fc-timegrid-slot-lane') as HTMLElement;
    const col = root.querySelector('.fc-timegrid-col') as HTMLElement;
    slot.getBoundingClientRect = () => ({
      top: 40, bottom: 64, left: 0, right: 100, width: 100, height: 24, x: 0, y: 40, toJSON: () => ({}),
    });
    expect(findSlotAtY(root, 50)).toBe(slot);
    expect(classifyCalendarHover(col, root, { clientY: 50 })).toEqual({
      kind: 'create-slot',
      colEl: col,
      slotEl: slot,
    });
  });

  it('maps a slot-lane hit (outside the day column) to the column under the pointer', () => {
    const root = mount(`
      <table>
        <tr>
          <td class="fc-timegrid-slot-lane" data-time="10:00:00"></td>
        </tr>
      </table>
      <div class="fc-timegrid-col fc-timegrid-axis"></div>
      <div class="fc-timegrid-col" data-date="2026-08-03"></div>
    `);
    const slot = root.querySelector('.fc-timegrid-slot-lane') as HTMLElement;
    const col = root.querySelector('.fc-timegrid-col[data-date]') as HTMLElement;
    slot.getBoundingClientRect = () => ({
      top: 40, bottom: 64, left: 0, right: 400, width: 400, height: 24, x: 0, y: 40, toJSON: () => ({}),
    });
    col.getBoundingClientRect = () => ({
      top: 0, bottom: 200, left: 80, right: 180, width: 100, height: 200, x: 80, y: 0, toJSON: () => ({}),
    });
    expect(classifyCalendarHover(slot, root, { clientX: 120, clientY: 50 })).toEqual({
      kind: 'create-slot',
      colEl: col,
      slotEl: slot,
    });
  });
});

describe('createCueRect', () => {
  it('positions the plus wash over a day cell relative to the calendar root', () => {
    const root = mount(`<div class="fc-daygrid-day"></div>`);
    const cell = root.querySelector('.fc-daygrid-day') as HTMLElement;
    root.getBoundingClientRect = () => ({
      top: 10, left: 20, right: 220, bottom: 210, width: 200, height: 200, x: 20, y: 10, toJSON: () => ({}),
    });
    cell.getBoundingClientRect = () => ({
      top: 30, left: 40, right: 140, bottom: 130, width: 100, height: 100, x: 40, y: 30, toJSON: () => ({}),
    });
    expect(createCueRect({ kind: 'create-day', cellEl: cell }, root)).toEqual({
      top: 20,
      left: 20,
      width: 100,
      height: 100,
    });
  });
});
