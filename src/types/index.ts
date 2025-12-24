/**
 * Types Index - Central export for all domain types
 * 
 * Import types from this file for convenience:
 * import { WorkOrder, Equipment, OrganizationMember } from '@/types';
 */

// Equipment types (re-exported from features/equipment)
export * from '@/features/equipment/types/equipment';

// Work order types
export * from './workOrder';
export * from './workOrderCosts';
export * from './workOrderDetails';
export * from './workOrderEquipment';

// Organization types
export * from './organization';

// Team types (re-exported from features/teams)
export * from '@/features/teams/types/team';

// Equipment notes types (re-exported from features/equipment)
export * from '@/features/equipment/types/equipmentNotes';

// Other domain types
export * from './parts';
export * from './permissions';
export * from './settings';
export * from './billingExemptions';
export * from './csvImport';
export * from './cache';
export * from './organizationContext';

