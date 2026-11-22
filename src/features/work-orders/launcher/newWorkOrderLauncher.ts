import type { WorkOrderPriority } from '@/features/work-orders/types/workOrder';

/**
 * Request to open the New Work Order dialog from anywhere inside the dashboard.
 * Dispatched as a window event so list rows, checklist items and the keyboard
 * shortcut can all launch the same dialog without threading callbacks through
 * every page.
 */
export interface NewWorkOrderRequest {
  /** Equipment to pre-select. */
  equipmentId?: string;
  /** Pre-filled title (e.g. the defect on a follow-up work order). */
  title?: string;
  /** Pre-filled description. */
  description?: string;
  priority?: WorkOrderPriority;
  /** Open directly in Log Completed mode. */
  logCompleted?: boolean;
}

export const NEW_WORK_ORDER_EVENT = 'equipqr:new-work-order';

export function openNewWorkOrder(request: NewWorkOrderRequest = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NewWorkOrderRequest>(NEW_WORK_ORDER_EVENT, { detail: request }));
}

const QUEUED_NEW_WORK_ORDER_KEY = 'equipqr_queued_new_work_order';

/**
 * Ask the dashboard to open the New Work Order dialog after a full page load.
 * Used by pages outside the dashboard (the QR scan page when offline), which
 * cannot dispatch the window event because the launcher is not mounted yet.
 */
export function queueNewWorkOrderForDashboard(request: Pick<NewWorkOrderRequest, 'equipmentId'>): void {
  try {
    sessionStorage.setItem(QUEUED_NEW_WORK_ORDER_KEY, JSON.stringify(request));
  } catch {
    // Without session storage the dashboard simply opens without the dialog.
  }
}

/** Read and clear a request left by `queueNewWorkOrderForDashboard`. */
export function takeQueuedNewWorkOrder(): NewWorkOrderRequest | null {
  try {
    const raw = sessionStorage.getItem(QUEUED_NEW_WORK_ORDER_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(QUEUED_NEW_WORK_ORDER_KEY);
    const parsed = JSON.parse(raw) as { equipmentId?: unknown } | null;
    return typeof parsed?.equipmentId === 'string' ? { equipmentId: parsed.equipmentId } : null;
  } catch {
    return null;
  }
}

/**
 * True when a keystroke should be left alone: the user is typing in a field,
 * holding a modifier, or a dialog/menu already owns the keyboard.
 */
export function shouldIgnoreNewWorkOrderShortcut(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.repeat) return true;
  if (event.metaKey || event.ctrlKey || event.altKey) return true;

  const target = event.target;
  if (target instanceof HTMLElement) {
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
      return true;
    }
    if (target.closest('[contenteditable="true"], [role="textbox"], [role="combobox"]')) {
      return true;
    }
  }

  if (typeof document !== 'undefined') {
    return document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]') !== null;
  }
  return false;
}
