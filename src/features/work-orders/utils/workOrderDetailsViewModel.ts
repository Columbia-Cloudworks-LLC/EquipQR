import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { EquipmentForPDF, WorkOrderForPDF } from '@/features/work-orders/services/workOrderReportPDFService';

export interface WorkOrderDetailsPermissionLevels {
  isManager: boolean;
  isTechnician: boolean;
}

export interface WorkOrderFooterContext {
  permissionLevels: WorkOrderDetailsPermissionLevels;
  assigneeId?: string | null;
  createdBy?: string | null;
  status: WorkOrderStatus | string;
  userId?: string | null;
}

export interface WorkOrderMobileFooterContext {
  isMobile: boolean;
  isWorkOrderLocked: boolean;
  workOrderStatus: WorkOrderStatus | string;
  footerRoleEligible: boolean;
}

export interface WorkOrderTeamSource {
  team_id?: string | null;
  teamName?: string | null;
}

export interface EquipmentTeamSource {
  team_id?: string | null;
}

export interface WorkOrderPdfSource {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_date?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  estimated_hours?: number | null;
  assigneeName?: string | null;
  teamName?: string | null;
  has_pm?: boolean;
}

export interface EquipmentPdfSource {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  status: string;
  location?: string | null;
  customer_id?: string | null;
}

export interface MobileWorkOrderSummarySource {
  status: string;
  priority: string;
  dueDate?: string | null;
}

export interface MobileEquipmentSummarySource {
  id: string;
  name: string;
  status: string;
}

export interface OfflineQueueSnapshot {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
}

export interface TeamSummary {
  id: string;
  name: string;
}

export interface AssigneeNameSummary {
  name: string;
}

export interface MobileAssigneeSummary {
  id: string;
  name: string;
}

const EMPTY_WORK_ORDER_PDF: WorkOrderForPDF = {
  id: '',
  title: '',
  description: '',
  status: 'submitted',
  priority: 'medium',
  created_date: '',
};

export function isFooterRoleEligible({
  permissionLevels,
  assigneeId,
  createdBy,
  status,
  userId,
}: WorkOrderFooterContext): boolean {
  return (
    permissionLevels.isManager ||
    (permissionLevels.isTechnician && assigneeId === userId) ||
    (!!userId && !!createdBy && createdBy === userId && status === 'submitted')
  );
}

export function shouldShowMobileActionFooter({
  isMobile,
  isWorkOrderLocked,
  workOrderStatus,
  footerRoleEligible,
}: WorkOrderMobileFooterContext): boolean {
  return (
    isMobile &&
    footerRoleEligible &&
    !isWorkOrderLocked &&
    workOrderStatus !== 'completed' &&
    workOrderStatus !== 'cancelled'
  );
}

/** Scroll clearance for mobile work-order details fixed chrome (QAB FAB; optional sync banner). */
export function getMobileWorkOrderDetailsBottomPaddingClass(isMobile: boolean): string | undefined {
  if (!isMobile) return undefined;
  // FAB uses bottom-[78px] + h-14; --mobile-bottom-nav-height matches that offset (+ safe area).
  return 'pb-[calc(var(--mobile-bottom-nav-height)+3.5rem+1rem)]';
}

export function buildWorkOrderPdfInput(workOrder: WorkOrderPdfSource | null | undefined): WorkOrderForPDF {
  if (!workOrder) {
    return EMPTY_WORK_ORDER_PDF;
  }

  return {
    id: workOrder.id,
    title: workOrder.title,
    description: workOrder.description,
    status: workOrder.status,
    priority: workOrder.priority,
    created_date: workOrder.created_date ?? '',
    due_date: workOrder.due_date,
    completed_date: workOrder.completed_date,
    estimated_hours: workOrder.estimated_hours,
    assigneeName: workOrder.assigneeName ?? undefined,
    teamName: workOrder.teamName ?? undefined,
    has_pm: workOrder.has_pm,
  };
}

export function buildEquipmentPdfInput(
  equipment: EquipmentPdfSource | null | undefined,
): EquipmentForPDF | null {
  if (!equipment) {
    return null;
  }

  return {
    id: equipment.id,
    name: equipment.name,
    manufacturer: equipment.manufacturer,
    model: equipment.model,
    serial_number: equipment.serial_number,
    status: equipment.status,
    location: equipment.location,
    customerId: equipment.customer_id ?? null,
  };
}

export function buildWorkOrderTeamSummary(
  workOrder: WorkOrderTeamSource,
  equipment?: EquipmentTeamSource | null,
): TeamSummary | undefined {
  const teamId = workOrder.team_id || equipment?.team_id;
  if (!workOrder.teamName || !teamId) {
    return undefined;
  }

  return { id: teamId, name: workOrder.teamName };
}

export function buildWorkOrderAssigneeSummary(
  assigneeName?: string | null,
): AssigneeNameSummary | undefined {
  if (!assigneeName) {
    return undefined;
  }

  return { name: assigneeName };
}

export function buildMobileWorkOrderAssigneeSummary(
  assigneeName?: string | null,
): MobileAssigneeSummary | undefined {
  if (!assigneeName) {
    return undefined;
  }

  return { id: '', name: assigneeName };
}

export function buildMobileWorkOrderSummary(
  workOrder: MobileWorkOrderSummarySource,
): { status: string; priority: string; due_date?: string | null } {
  return {
    status: workOrder.status,
    priority: workOrder.priority,
    due_date: workOrder.dueDate,
  };
}

export function buildMobileEquipmentSummary(
  equipment: MobileEquipmentSummarySource,
): MobileEquipmentSummarySource {
  return {
    id: equipment.id,
    name: equipment.name,
    status: equipment.status,
  };
}

export function buildOfflineSyncState(offlineQueue: OfflineQueueSnapshot) {
  return {
    isOnline: offlineQueue.isOnline,
    isSyncing: offlineQueue.isSyncing,
    pendingCount: offlineQueue.pendingCount,
    failedCount: offlineQueue.failedCount,
  };
}

export function shouldHideInlineNoteAddButton(showMobileActionFooter: boolean): boolean {
  return showMobileActionFooter;
}
