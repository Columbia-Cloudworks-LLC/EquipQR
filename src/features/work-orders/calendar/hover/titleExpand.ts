export type TitleExpand = {
  readonly eventEl: HTMLElement;
  stop: () => void;
};

const TITLE_SELECTOR = '.eq-cal-event-title, .fc-event-title';

function clearExpandStyles(eventEl: HTMLElement, title: HTMLElement | null): void {
  eventEl.classList.remove('is-expanded');
  eventEl.style.width = '';
  eventEl.style.transform = '';
  title?.classList.remove('is-expanded');
}

function clampShift(
  eventLeft: number,
  eventWidth: number,
  extra: number,
  rootRect: DOMRect,
): number {
  const needed = eventWidth + extra;
  let left = eventLeft - extra / 2;
  if (left < rootRect.left) left = rootRect.left;
  if (left + needed > rootRect.right) left = rootRect.right - needed;
  if (left < rootRect.left) left = rootRect.left;
  return eventLeft - left;
}

export function startTitleExpand(eventEl: HTMLElement): TitleExpand {
  const title = eventEl.querySelector<HTMLElement>(TITLE_SELECTOR);

  const stop = () => {
    clearExpandStyles(eventEl, title);
  };

  if (!title) return { eventEl, stop };

  const overflow = title.scrollWidth - title.clientWidth;
  const eventRect = eventEl.getBoundingClientRect();
  if (overflow <= 1 || eventRect.width <= 0) {
    return { eventEl, stop };
  }

  const root = eventEl.closest<HTMLElement>('.eq-work-order-calendar');
  const rootRect = root?.getBoundingClientRect();
  const shift = rootRect
    ? clampShift(eventRect.left, eventRect.width, overflow, rootRect)
    : overflow / 2;

  eventEl.classList.add('is-expanded');
  title.classList.add('is-expanded');
  eventEl.style.width = `${eventRect.width + overflow}px`;
  eventEl.style.transform = `translateX(${-shift}px)`;

  return { eventEl, stop };
}
