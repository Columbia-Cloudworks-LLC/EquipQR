export const TITLE_MARQUEE_IDLE_MS = 1500;
export const TITLE_MARQUEE_PASS_MS = 1500;

export type TitleMarquee = {
  readonly eventEl: HTMLElement;
  stop: () => void;
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isTruncated(outer: HTMLElement, inner: HTMLElement): boolean {
  return inner.scrollWidth - outer.clientWidth > 1;
}

export function startTitleMarquee(eventEl: HTMLElement): TitleMarquee {
  const outer = eventEl.querySelector<HTMLElement>('.eq-cal-event-title');
  const inner = eventEl.querySelector<HTMLElement>('.eq-cal-event-title-inner');
  const timers: number[] = [];

  const stop = () => {
    for (const id of timers) window.clearTimeout(id);
    timers.length = 0;
    if (!outer || !inner) return;
    outer.classList.remove('is-marquee');
    inner.style.transition = 'none';
    inner.style.transform = 'translateX(0)';
  };

  if (!outer || !inner || prefersReducedMotion() || !isTruncated(outer, inner)) {
    return { eventEl, stop };
  }

  const overflow = inner.scrollWidth - outer.clientWidth;

  const runPass = () => {
    if (!isTruncated(outer, inner)) {
      stop();
      return;
    }
    outer.classList.add('is-marquee');
    inner.style.transition = `transform ${TITLE_MARQUEE_PASS_MS}ms ease`;
    inner.style.transform = `translateX(-${overflow}px)`;
    timers.push(window.setTimeout(() => {
      inner.style.transition = 'none';
      inner.style.transform = 'translateX(0)';
      outer.classList.remove('is-marquee');
      timers.push(window.setTimeout(runPass, TITLE_MARQUEE_IDLE_MS));
    }, TITLE_MARQUEE_PASS_MS));
  };

  timers.push(window.setTimeout(runPass, TITLE_MARQUEE_IDLE_MS));
  return { eventEl, stop };
}
