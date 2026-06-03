/**
 * Types Index - Central export for shared domain types.
 *
 * Prefer feature-local type modules for new code; this barrel re-exports
 * stable cross-cutting types only.
 */

export * from '@/features/equipment/types/equipment';
export * from '@/features/equipment/types/equipmentNotes';
export * from '@/features/teams/types/team';
export * from './permissions';
export * from './settings';
export * from './csvImport';
export * from './audit';
