import {
  classifyCalendarHover,
  createCueRect,
} from '@/features/work-orders/calendar/hover/hoverTarget';
import { startTitleMarquee, type TitleMarquee } from '@/features/work-orders/calendar/hover/titleMarquee';

function hideCue(cue: HTMLElement): void {
  cue.hidden = true;
  cue.style.top = '';
  cue.style.left = '';
  cue.style.width = '';
  cue.style.height = '';
}

function showCue(cue: HTMLElement, rect: { top: number; left: number; width: number; height: number }): void {
  cue.hidden = false;
  cue.style.top = `${rect.top}px`;
  cue.style.left = `${rect.left}px`;
  cue.style.width = `${rect.width}px`;
  cue.style.height = `${rect.height}px`;
}

export function bindCalendarHover(root: HTMLElement, cue: HTMLElement): () => void {
  let marquee: TitleMarquee | null = null;
  let last: { target: EventTarget | null; x: number; y: number } | null = null;

  const sync = (target: EventTarget | null, x: number, y: number) => {
    last = { target, x, y };
    const kind = classifyCalendarHover(target, root, { clientX: x, clientY: y });
    if (kind.kind === 'event') {
      hideCue(cue);
      if (marquee?.eventEl !== kind.eventEl) {
        marquee?.stop();
        marquee = startTitleMarquee(kind.eventEl);
      }
      return;
    }

    marquee?.stop();
    marquee = null;

    const rect = createCueRect(kind, root);
    if (rect) {
      showCue(cue, rect);
      return;
    }
    hideCue(cue);
  };

  const onPointer = (event: PointerEvent) => {
    sync(event.target, event.clientX, event.clientY);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const kind = classifyCalendarHover(event.target, root, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
    if (kind.kind === 'event') {
      root.classList.add('eq-cal-dragging');
    }
  };

  const onPointerUp = () => {
    if (!root.querySelector('.fc-event-dragging, .fc-event-mirror')) {
      root.classList.remove('eq-cal-dragging');
    }
  };

  const onLeave = (event: PointerEvent) => {
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    last = null;
    marquee?.stop();
    marquee = null;
    hideCue(cue);
  };

  const onScroll = () => {
    if (!last) return;
    const stacked = document.elementFromPoint(last.x, last.y);
    sync(stacked ?? last.target, last.x, last.y);
  };

  hideCue(cue);
  root.addEventListener('pointermove', onPointer);
  root.addEventListener('pointerover', onPointer);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);
  root.addEventListener('pointerleave', onLeave);
  root.addEventListener('scroll', onScroll, true);

  return () => {
    root.removeEventListener('pointermove', onPointer);
    root.removeEventListener('pointerover', onPointer);
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointerup', onPointerUp);
    root.removeEventListener('pointercancel', onPointerUp);
    root.removeEventListener('pointerleave', onLeave);
    root.removeEventListener('scroll', onScroll, true);
    marquee?.stop();
    hideCue(cue);
  };
}
