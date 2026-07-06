import {
  CheckCircle,
  ClipboardCheck,
  DollarSign,
  MessageSquarePlus,
  Pause,
  Play,
  QrCode,
} from 'lucide-react';
import type { WorkOrderSheetQuickAction } from '@/features/work-orders/components/MobileWorkOrderActionSheet';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

export interface BuildWorkOrderSheetQuickActionsInput {
  workOrderStatus: WorkOrderStatus;
  showMobileActionFooter: boolean;
  canAddNotes: boolean;
  canCaptureCosts: boolean;
  canCompletePmGate: boolean;
  isActionPending?: boolean;
  onRequestAccept: () => void;
  onStartMobileWorkOrder: () => void;
  onPutAssignedMobileWorkOrderOnHold: () => void;
  onPauseResumeMobileWorkOrder: () => void;
  onOpenCompleteDialog: () => void;
  onScrollToChecklist: () => void;
  onOpenNotesComposer: () => void;
  onScrollToCosts: () => void;
  onShowWorkOrderQr: () => void;
}

/**
 * Consolidates all thumb-reachable field actions into the mobile quick-actions
 * sheet (issue #1151 follow-up). Sync banners appear only when the queue needs attention.
 */
export function buildWorkOrderSheetQuickActions(
  input: BuildWorkOrderSheetQuickActionsInput,
): WorkOrderSheetQuickAction[] {
  const {
    workOrderStatus,
    showMobileActionFooter,
    canAddNotes,
    canCaptureCosts,
    canCompletePmGate,
    isActionPending = false,
    onRequestAccept,
    onStartMobileWorkOrder,
    onPutAssignedMobileWorkOrderOnHold,
    onPauseResumeMobileWorkOrder,
    onOpenCompleteDialog,
    onScrollToChecklist,
    onOpenNotesComposer,
    onScrollToCosts,
    onShowWorkOrderQr,
  } = input;

  const actions: WorkOrderSheetQuickAction[] = [];

  if (showMobileActionFooter) {
    switch (workOrderStatus) {
      case 'submitted':
        actions.push({
          id: 'accept',
          label: 'Accept work order',
          icon: CheckCircle,
          tone: 'primary',
          onSelect: onRequestAccept,
          disabled: isActionPending,
        });
        break;
      case 'assigned':
      case 'accepted':
        actions.push(
          {
            id: 'start',
            label: 'Start work',
            icon: Play,
            tone: 'primary',
            onSelect: onStartMobileWorkOrder,
            disabled: isActionPending,
          },
          {
            id: 'hold-assigned',
            label: 'Put on hold',
            icon: Pause,
            tone: 'warning',
            onSelect: onPutAssignedMobileWorkOrderOnHold,
            disabled: isActionPending,
          },
        );
        break;
      case 'in_progress':
        if (!canCompletePmGate) {
          actions.push({
            id: 'checklist',
            label: 'Continue checklist',
            icon: ClipboardCheck,
            tone: 'primary',
            onSelect: onScrollToChecklist,
          });
        } else {
          actions.push({
            id: 'complete',
            label: 'Complete work order',
            icon: CheckCircle,
            tone: 'success',
            onSelect: onOpenCompleteDialog,
            disabled: isActionPending,
          });
        }
        actions.push({
          id: 'hold-progress',
          label: 'Put on hold',
          icon: Pause,
          tone: 'warning',
          onSelect: onPauseResumeMobileWorkOrder,
          disabled: isActionPending,
        });
        break;
      case 'on_hold':
        actions.push({
          id: 'resume',
          label: 'Resume work',
          icon: Play,
          tone: 'primary',
          onSelect: onPauseResumeMobileWorkOrder,
          disabled: isActionPending,
        });
        break;
      default:
        break;
    }
  }

  if (canAddNotes) {
    actions.push({
      id: 'add-note-or-photo',
      label: 'Add note or photo',
      icon: MessageSquarePlus,
      tone: 'capture',
      onSelect: onOpenNotesComposer,
    });
  }

  if (canCaptureCosts) {
    actions.push({
      id: 'add-parts-or-labor',
      label: 'Add parts or labor',
      icon: DollarSign,
      tone: 'capture',
      onSelect: onScrollToCosts,
    });
  }

  actions.push({
    id: 'wo-qr',
    label: 'Show work order QR code',
    icon: QrCode,
    tone: 'utility',
    onSelect: onShowWorkOrderQr,
  });

  return actions;
}
