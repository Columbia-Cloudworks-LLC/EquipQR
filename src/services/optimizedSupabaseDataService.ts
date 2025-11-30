/**
 * @deprecated This file is deprecated. Import from canonical services instead:
 * - Types: import from '@/services/supabaseDataService' or '@/types'
 * - Functions: import from '@/services/supabaseDataService'
 * 
 * This file re-exports from the canonical locations for backward compatibility.
 */

// Re-export everything from the canonical service
export {
  type Equipment,
  type Note,
  type WorkOrder,
  type Team,
  type TeamMember,
  type DashboardStats,
  getOptimizedTeamsByOrganization,
  getOptimizedDashboardStats
} from './supabaseDataService';
