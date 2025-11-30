/**
 * @deprecated This file is deprecated. Import from canonical services instead:
 * - Types: import from '@/types/organization'
 * - Class: import from '@/services/organizationStorageService'
 * 
 * This file re-exports from the canonical locations for backward compatibility.
 */

// Re-export types from canonical location
export type { StorageUsageData, StorageUsage } from '@/types/organization';

// Re-export class from canonical service
export { OrganizationStorageService as OptimizedOrganizationStorageService } from './organizationStorageService';