/**
 * Test Mocks
 * 
 * Centralized exports for all test mocks.
 */

// Scenario-driven Supabase mock (preferred for journey tests)
export {
  resetSupabaseMock,
  seedSupabaseMock,
  setSupabasePersona,
  setSupabaseError,
  getSupabaseStore,
  scenarioSupabaseMock,
  createScenarioSupabaseMock,
  type SeedData,
  type TableName,
  type SupabaseError,
} from './supabase-scenario';

// Legacy mock (for backward compatibility)
export {
  createMockSupabaseClient,
  mockEquipment,
  mockWorkOrder,
  mockUser,
} from './mock-supabase';

// Test types
export * from './testTypes';
