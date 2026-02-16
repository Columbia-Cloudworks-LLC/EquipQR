// Work Orders Feature Barrel Export
// This file exports the key components, hooks, types, and services from the work-orders feature

// Components
export { default as WorkOrderForm } from './components/WorkOrderForm';
export { default as WorkOrderCard } from './components/WorkOrderCard';
export { default as WorkOrdersList } from './components/WorkOrdersList';
export { default as WorkOrderFilters } from './components/WorkOrderFilters';
export { default as MobileWorkOrderCard } from './components/MobileWorkOrderCard';
export { default as DesktopWorkOrderCard } from './components/DesktopWorkOrderCard';
export { default as HistoricalWorkOrderBadge } from './components/HistoricalWorkOrderBadge';
export { default as WorkOrdersEmptyState } from './components/WorkOrdersEmptyState';
export { default as WorkOrdersHeader } from './components/WorkOrdersHeader';

// Hooks
export { useWorkOrders } from './hooks/useWorkOrders';
export { useWorkOrderData } from './hooks/useWorkOrderData';
export { useWorkOrderForm } from './hooks/useWorkOrderForm';
export { useWorkOrderCosts } from './hooks/useWorkOrderCosts';
export { useWorkOrderUpdate } from './hooks/useWorkOrderUpdate';
export { useWorkOrderCreation } from './hooks/useWorkOrderCreation';
export { useWorkOrderFilters } from './hooks/useWorkOrderFilters';
export { useWorkOrderPermissionLevels } from './hooks/useWorkOrderPermissionLevels';
export { useWorkOrderEquipment } from './hooks/useWorkOrderEquipment';
export { useWorkOrderAssignment } from './hooks/useWorkOrderAssignment';
export { useWorkOrderStatusUpdate } from './hooks/useWorkOrderStatusUpdate';
export { useWorkOrderSubmission } from './hooks/useWorkOrderSubmission';
export { useWorkOrderPMChecklist } from './hooks/useWorkOrderPMChecklist';
export { useWorkOrderAcceptance } from './hooks/useWorkOrderAcceptance';
export { useWorkOrderReopening } from './hooks/useWorkOrderReopening';
export { useWorkOrderDetailsActions } from './hooks/useWorkOrderDetailsActions';
export { useWorkOrderImageCount } from './hooks/useWorkOrderImageCount';
export { useWorkOrderCostsState } from './hooks/useWorkOrderCostsState';
export { useWorkOrderCostsSubtotal } from './hooks/useWorkOrderCostsSubtotal';
export { useWorkOrderAssignmentManagement } from './hooks/useWorkOrderAssignmentManagement';
export { useWorkOrderContextualAssignment } from './hooks/useWorkOrderContextualAssignment';

// Types
export type {
  WorkOrder,
  WorkOrderInsert,
  WorkOrderUpdate,
  WorkOrderStatus,
  WorkOrderPriority,
} from './types/workOrder';
export type { WorkOrderCost, WorkOrderCostInsert } from './types/workOrderCosts';
export type { WorkOrderEquipment } from './types/workOrderEquipment';
export type { WorkOrderDetails as WorkOrderDetailsType } from './types/workOrderDetails';

// Schemas
export { workOrderSchema, workOrderDefaultValues } from './schemas/workOrderSchema';

// Services (for advanced use cases)
export * from './services/workOrderService';
export { deleteWorkOrderCascade } from './services/deleteWorkOrderService';

