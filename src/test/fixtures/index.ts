/**
 * Test Fixtures Index
 * 
 * Central export point for all test fixtures.
 * Import from '@/test/fixtures' to access personas and entities.
 */

// User Personas
export {
  personas,
  getPersona,
  createCustomPersona,
  type UserPersona,
  type PersonaKey,
  type TeamMembership
} from './personas';

// Entity Fixtures
export {
  // Organizations
  organizations,
  type TestOrganization,
  
  // Teams
  teams,
  type TestTeam,
  
  // Equipment
  equipment,
  type TestEquipment,
  
  // Work Orders
  workOrders,
  type TestWorkOrder,
  
  // PM Templates
  pmTemplates,
  type TestPMTemplate,
  
  // Inventory Items
  inventoryItems,
  type TestInventoryItem,
  
  // Inventory Transactions
  inventoryTransactions,
  type TestInventoryTransaction,
  
  // Part Compatibility Rules
  partCompatibilityRules,
  type TestPartCompatibilityRule,
  type ModelMatchType,
  type VerificationStatus,
  
  // Part Alternate Groups
  partAlternateGroups,
  type TestPartAlternateGroup,
  partIdentifiers,
  type TestPartIdentifier,
  type PartIdentifierType,
  
  // Utility Functions
  getWorkOrdersForTeam,
  getWorkOrdersForAssignee,
  getEquipmentForTeam,
  getWorkOrdersByStatus,
  createCustomWorkOrder,
  getLowStockInventoryItems,
  getTransactionsForItem,
  getCompatibilityRulesForItem,
  createCustomInventoryItem
} from './entities';

// Convenience re-exports for common testing patterns
export const defaultOrganization = () => import('./entities').then(m => m.organizations.acme);
export const defaultPersona = () => import('./personas').then(m => m.personas.technician);
