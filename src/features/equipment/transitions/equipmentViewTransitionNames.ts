import type { CSSProperties } from 'react';

/** Shared View Transition names for equipment card → details morph. */
export const EQUIPMENT_VIEW_TRANSITION = {
  /** Card silhouette ↔ details page shell (primary expand morph). */
  shell: 'eq-vt-shell',
  image: 'eq-vt-image',
  name: 'eq-vt-name',
  meta: 'eq-vt-meta',
  location: 'eq-vt-location',
  hours: 'eq-vt-hours',
} as const;

export type EquipmentViewTransitionToken = keyof typeof EQUIPMENT_VIEW_TRANSITION;

/**
 * Returns an inline style that assigns a view-transition-name when active.
 * Only the transitioning equipment should pass `isActive: true` so names never collide.
 */
export function getEquipmentViewTransitionStyle(
  token: EquipmentViewTransitionToken,
  isActive: boolean,
): CSSProperties | undefined {
  if (!isActive) {
    return undefined;
  }

  return {
    viewTransitionName: EQUIPMENT_VIEW_TRANSITION[token],
  };
}
