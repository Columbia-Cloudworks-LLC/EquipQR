/** True when the browser exposes the View Transitions API. */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/** Whether equipment card morph should request `viewTransition` on navigate. */
export function shouldEnableEquipmentViewTransition(
  reducedMotion: boolean,
  supportsVT: boolean = supportsViewTransitions(),
): boolean {
  return !reducedMotion && supportsVT;
}
