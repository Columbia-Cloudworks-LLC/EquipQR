export type CalendarHoverKind =
  | { readonly kind: 'none' }
  | { readonly kind: 'more-link' }
  | { readonly kind: 'event'; readonly eventEl: HTMLElement }
  | { readonly kind: 'create-day'; readonly cellEl: HTMLElement }
  | { readonly kind: 'create-slot'; readonly colEl: HTMLElement; readonly slotEl: HTMLElement };

export type CueRect = {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
};

const EVENT_SELECTOR = '.eq-cal-event, .fc-event';
const MORE_LINK_SELECTOR = '.fc-more-link, .fc-daygrid-more-link';
const DAY_CELL_SELECTOR = '.fc-daygrid-day';
const TIME_COL_SELECTOR = '.fc-timegrid-col';
const BUSY_SELECTOR = '.fc-event-dragging, .fc-event-mirror, .fc-highlight';

function isBusy(root: ParentNode): boolean {
  if (root instanceof Element && root.classList.contains('eq-cal-dragging')) return true;
  return Boolean(root.querySelector(BUSY_SELECTOR));
}

function isTimeAxisCol(col: Element): boolean {
  return col.classList.contains('fc-timegrid-axis') || col.classList.contains('fc-timegrid-col-axis');
}

export function findSlotAtY(root: ParentNode, clientY: number): HTMLElement | null {
  const slots = root.querySelectorAll<HTMLElement>(
    '.fc-timegrid-slot-lane, .fc-timegrid-slot[data-time]:not(.fc-timegrid-slot-label)',
  );
  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    if (clientY >= rect.top && clientY < rect.bottom) return slot;
  }
  return null;
}

function findColAtX(root: ParentNode, clientX: number): HTMLElement | null {
  const cols = root.querySelectorAll<HTMLElement>(TIME_COL_SELECTOR);
  for (const col of cols) {
    if (isTimeAxisCol(col)) continue;
    const rect = col.getBoundingClientRect();
    if (clientX >= rect.left && clientX < rect.right) return col;
  }
  return null;
}

export type CalendarHoverPoint = {
  readonly clientX?: number;
  readonly clientY?: number;
};

export function classifyCalendarHover(
  target: EventTarget | null,
  root: ParentNode,
  point: CalendarHoverPoint = {},
): CalendarHoverKind {
  const clientX = point.clientX ?? 0;
  const clientY = point.clientY ?? 0;
  if (!(target instanceof Element) || !root.contains(target)) return { kind: 'none' };
  if (target.closest(MORE_LINK_SELECTOR)) return { kind: 'more-link' };

  const eventEl = target.closest(EVENT_SELECTOR);
  if (eventEl instanceof HTMLElement) return { kind: 'event', eventEl };

  if (isBusy(root)) return { kind: 'none' };

  const dayEl = target.closest(DAY_CELL_SELECTOR);
  if (dayEl instanceof HTMLElement) return { kind: 'create-day', cellEl: dayEl };

  const slotFromTarget = target.closest<HTMLElement>(
    '.fc-timegrid-slot-lane, .fc-timegrid-slot[data-time]:not(.fc-timegrid-slot-label)',
  );
  const colFromTarget = target.closest(TIME_COL_SELECTOR);
  const colEl =
    colFromTarget instanceof HTMLElement && !isTimeAxisCol(colFromTarget)
      ? colFromTarget
      : findColAtX(root, clientX);
  const slotEl = slotFromTarget ?? findSlotAtY(root, clientY);
  if (colEl && slotEl) return { kind: 'create-slot', colEl, slotEl };

  return { kind: 'none' };
}

export function createCueRect(kind: CalendarHoverKind, root: Element): CueRect | null {
  if (kind.kind === 'create-day') {
    return toRootRect(kind.cellEl, root);
  }
  if (kind.kind === 'create-slot') {
    const col = kind.colEl.getBoundingClientRect();
    const slot = kind.slotEl.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const height = Math.max(slot.height, 16);
    return {
      top: slot.top + slot.height / 2 - height / 2 - rootRect.top,
      left: col.left - rootRect.left,
      width: col.width,
      height,
    };
  }
  return null;
}

function toRootRect(el: Element, root: Element): CueRect {
  const rect = el.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  return {
    top: rect.top - rootRect.top,
    left: rect.left - rootRect.left,
    width: rect.width,
    height: rect.height,
  };
}
