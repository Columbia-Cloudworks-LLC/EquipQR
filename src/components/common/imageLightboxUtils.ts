export interface TouchPoint {
  clientX: number;
  clientY: number;
}

export interface LightboxTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export const LIGHTBOX_MIN_SCALE = 1;
export const LIGHTBOX_MAX_SCALE = 4;

export function getTouchDistance(touchA: TouchPoint, touchB: TouchPoint): number {
  const dx = touchA.clientX - touchB.clientX;
  const dy = touchA.clientY - touchB.clientY;
  return Math.hypot(dx, dy);
}

export function clampScale(
  scale: number,
  min: number = LIGHTBOX_MIN_SCALE,
  max: number = LIGHTBOX_MAX_SCALE,
): number {
  return Math.min(max, Math.max(min, scale));
}

export function applyPinchScale(
  currentScale: number,
  startDistance: number,
  currentDistance: number,
): number {
  if (startDistance <= 0) {
    return currentScale;
  }
  return clampScale(currentScale * (currentDistance / startDistance));
}

export const DEFAULT_LIGHTBOX_TRANSFORM: LightboxTransform = {
  scale: LIGHTBOX_MIN_SCALE,
  translateX: 0,
  translateY: 0,
};
