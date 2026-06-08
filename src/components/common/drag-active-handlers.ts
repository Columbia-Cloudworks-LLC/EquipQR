import type React from 'react';

/** Shared dragenter/dragover/dragleave handler for file-drop zones. */
export function handleDragActiveState(
  e: React.DragEvent,
  setDragActive: (active: boolean) => void,
): void {
  e.preventDefault();
  e.stopPropagation();
  if (e.type === 'dragenter' || e.type === 'dragover') {
    setDragActive(true);
  } else if (e.type === 'dragleave') {
    setDragActive(false);
  }
}

/** Clears drag-active state after a drop (call before reading dataTransfer). */
export function finishDragDrop(
  e: React.DragEvent,
  setDragActive: (active: boolean) => void,
): void {
  e.preventDefault();
  e.stopPropagation();
  setDragActive(false);
}
