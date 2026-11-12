import type { KeyboardEvent, SyntheticEvent } from 'react';

export const WORK_ORDER_CARD_NAVIGABLE_CLASS =
  'hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * Elements that own their click and keyboard behavior. An event that starts
 * inside one of these must not also navigate the card.
 */
const NESTED_CONTROL_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  '[contenteditable="true"]',
  '[aria-haspopup]',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="combobox"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="tab"]',
].join(',');

/**
 * True when the event came from a nested control inside the card, or from
 * portal content (popover, select, dropdown) rendered outside the card's DOM.
 * React synthetic events bubble through portals, so those reach the card's
 * handlers even though their DOM nodes are not inside it.
 */
export function isEventFromNestedControl(event: SyntheticEvent<HTMLElement>): boolean {
  const card = event.currentTarget;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (!card.contains(target)) return true;
  const control = target.closest(NESTED_CONTROL_SELECTOR);
  return control !== null && control !== card && card.contains(control);
}

export function getWorkOrderCardNavigationProps(
  workOrderId: string,
  onNavigate?: (id: string) => void,
) {
  if (!onNavigate) {
    return {
      role: undefined,
      tabIndex: undefined,
      onClick: undefined,
      onKeyDown: undefined,
    };
  }

  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: (event: SyntheticEvent<HTMLElement>) => {
      if (isEventFromNestedControl(event)) return;
      onNavigate(workOrderId);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (isEventFromNestedControl(event)) return;
      event.preventDefault();
      onNavigate(workOrderId);
    },
  };
}
