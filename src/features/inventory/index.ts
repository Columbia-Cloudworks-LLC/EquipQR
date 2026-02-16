// Inventory Feature Barrel Export
// This file exports the key components, hooks, types, and services from the inventory feature

// Components
export { default as InventoryItemForm } from './components/InventoryItemForm';
export { default as InventoryQRCodeDisplay } from './components/InventoryQRCodeDisplay';
export { PartsManagersSheet } from './components/PartsManagersSheet';

// Types
export * from './types/inventory';

// Schemas
export * from './schemas/inventorySchema';

// Services
export * from './services/inventoryService';
export * from './services/inventoryOrganizationService';
export * from './services/inventoryCompatibilityService';
export * from './services/inventoryCompatibilityRulesService';
export * from './services/partAlternatesService';

