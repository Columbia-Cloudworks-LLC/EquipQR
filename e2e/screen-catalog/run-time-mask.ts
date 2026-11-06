/**
 * Masks timestamps that only exist because of *this* run.
 *
 * The browser clock is pinned (see config.ts), so the app never derives the
 * real date on its own. Any rendered date equal to the real run date, or any
 * time of day between the DB reset and the capture, comes from rows the
 * database wrote at reset time (`NOW()` defaults). Those change on every run,
 * so their text is replaced in the DOM with RUN_TIME_PLACEHOLDER before the
 * screenshot. A fixed string keeps the layout identical run to run, unlike a
 * painted mask whose box width follows the timestamp.
 */
import type { Page } from '@playwright/test';

export const RUN_TIME_MARK = 'data-screen-catalog-mask';
export const RUN_TIME_PLACEHOLDER = '‹run time›';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    period: get('dayPeriod').toUpperCase(),
  };
}

/**
 * Build one regex source matching the run's calendar date(s) in common formats
 * (optionally followed by a time) and any 12-hour time of day inside the run window.
 */
export function buildRunTimePattern(windowStart: Date, windowEnd: Date, timeZone: string): string {
  const dates = new Set<string>();
  const times = new Set<string>();
  const start = new Date(windowStart.getTime() - 2 * 60_000);
  const end = new Date(windowEnd.getTime() + 2 * 60_000);
  for (let t = start.getTime(); t <= end.getTime(); t += 60_000) {
    const p = partsIn(new Date(t), timeZone);
    const mm = String(p.month).padStart(2, '0');
    const dd = String(p.day).padStart(2, '0');
    const name = MONTHS[p.month - 1];
    for (const format of [
      `${p.month}/${p.day}/${p.year}`,
      `${mm}/${dd}/${p.year}`,
      `${p.year}-${mm}-${dd}`,
      `${name.slice(0, 3)} ${p.day}, ${p.year}`,
      `${name} ${p.day}, ${p.year}`,
      `${p.day} ${name.slice(0, 3)} ${p.year}`,
    ]) {
      dates.add(escapeRegex(format));
    }
    const period = p.period === 'PM' ? '[Pp][Mm]' : '[Aa][Mm]';
    times.add(`${p.hour}:${String(p.minute).padStart(2, '0')}(?::\\d{2})?\\s?${period}`);
  }
  const anyTime = String.raw`\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?`;
  const datePart = `(?:${[...dates].sort((a, b) => b.length - a.length).join('|')})(?:,?\\s(?:at\\s)?${anyTime})?`;
  const timePart = `(?:${[...times].join('|')})`;
  return String.raw`(?<![\d/])(?:${datePart}|${timePart})(?![\d])`;
}

/** Replace every run-time match on the page with the placeholder (in a marker span). Returns the original strings. */
export async function markRunTimestamps(page: Page, pattern: string): Promise<string[]> {
  return page.evaluate(
    ({ pattern, mark, placeholder }) => {
      const regex = new RegExp(pattern, 'g');
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          node.parentElement?.closest(`[${mark}], script, style, noscript`) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      const targets: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        regex.lastIndex = 0;
        if (regex.test(node.data)) targets.push(node);
      }
      const matched: string[] = [];
      for (const node of targets) {
        regex.lastIndex = 0;
        const text = node.data;
        const fragment = document.createDocumentFragment();
        let last = 0;
        for (const match of text.matchAll(regex)) {
          const index = match.index ?? 0;
          fragment.append(text.slice(last, index));
          const span = document.createElement('span');
          span.setAttribute(mark, 'run-time');
          span.title = 'Timestamp written by the DB reset; replaced for a deterministic capture';
          span.textContent = placeholder;
          fragment.append(span);
          matched.push(match[0]);
          last = index + match[0].length;
        }
        fragment.append(text.slice(last));
        node.replaceWith(fragment);
      }
      return matched;
    },
    { pattern, mark: RUN_TIME_MARK, placeholder: RUN_TIME_PLACEHOLDER },
  );
}

export function replaceRunTimestamps(text: string, pattern: string): string {
  return text.replace(new RegExp(pattern, 'g'), RUN_TIME_PLACEHOLDER);
}
