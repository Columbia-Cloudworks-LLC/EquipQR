import type { KeyboardEvent } from 'react';

export const WORK_ORDER_CARD_NAVIGABLE_CLASS =
  'hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

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
    onClick: () => onNavigate(workOrderId),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onNavigate(workOrderId);
      }
    },
  };
}
