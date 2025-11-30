import { logger } from '../utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Types with computed fields
// Note: These types are kept for backward compatibility with components that import them.
// Prefer using types from the respective service files (EquipmentService, WorkOrderService).
export type Equipment = Tables<'equipment'>;
export type Note = Tables<'notes'> & {
  authorName?: string;
};
export type WorkOrder = Tables<'work_orders'> & {
  assigneeName?: string;
  teamName?: string;
  equipmentName?: string;
};
export type Team = Tables<'teams'> & {
  memberCount: number;
  workOrderCount: number;
  members: TeamMember[];
};
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Tables<'team_members'>['role'];
};

export interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  maintenanceEquipment: number;
  totalWorkOrders: number;
  completedWorkOrders: number;
  pendingWorkOrders: number;
}

// ============================================
// Teams - Will be consolidated into TeamService in Phase 2
// ============================================

/**
 * OPTIMIZED: Single query with joins instead of multiple calls
 * Fetches all teams for an organization with member info and work order counts
 */
export const getOptimizedTeamsByOrganization = async (organizationId: string): Promise<Team[]> => {
  try {
    // Single query to get teams with members using joins
    const { data: teamsWithMembers, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members:team_members (
          user_id,
          role,
          profiles:user_id!inner (
            id,
            name,
            email
          )
        )
      `)
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      logger.error('Error fetching teams with members:', error);
      return [];
    }

    if (!teamsWithMembers || teamsWithMembers.length === 0) {
      return [];
    }

    // Get work order counts by joining through equipment
    const { data: workOrderCounts } = await supabase
      .from('work_orders')
      .select('equipment_id, equipment:equipment_id(team_id)')
      .not('status', 'eq', 'completed');

    return teamsWithMembers.map(team => {
      const teamMembers = (team.team_members || []).map((member: { user_id: string; profiles?: { name?: string; email?: string }; role: TeamMember['role'] }) => ({
        id: member.user_id,
        name: member.profiles?.name || 'Unknown',
        email: member.profiles?.email || '',
        role: member.role,
      }));

      const workOrderCount = (workOrderCounts || []).filter(wo => wo.equipment?.team_id === team.id).length;

      return {
        ...team,
        memberCount: teamMembers.length,
        workOrderCount,
        members: teamMembers
      };
    });
  } catch (error) {
    logger.error('Error in getOptimizedTeamsByOrganization:', error);
    return [];
  }
};

// ============================================
// Dashboard Stats - Will be consolidated into DashboardService in Phase 2
// ============================================

/**
 * OPTIMIZED: Batch queries for dashboard stats
 * Fetches equipment and work order stats in parallel
 */
export const getOptimizedDashboardStats = async (organizationId: string): Promise<DashboardStats> => {
  try {
    // Batch both queries at once
    const [equipmentResult, workOrderResult] = await Promise.all([
      supabase
        .from('equipment')
        .select('status')
        .eq('organization_id', organizationId),
      supabase
        .from('work_orders')
        .select('status')
        .eq('organization_id', organizationId)
    ]);

    const equipment = equipmentResult.data || [];
    const workOrders = workOrderResult.data || [];

    return {
      totalEquipment: equipment.length,
      activeEquipment: equipment.filter(e => e.status === 'active').length,
      maintenanceEquipment: equipment.filter(e => e.status === 'maintenance').length,
      totalWorkOrders: workOrders.length,
      completedWorkOrders: workOrders.filter(wo => wo.status === 'completed').length,
      pendingWorkOrders: workOrders.filter(wo => !['completed', 'cancelled'].includes(wo.status)).length
    };
  } catch (error) {
    logger.error('Error in getOptimizedDashboardStats:', error);
    return {
      totalEquipment: 0,
      activeEquipment: 0,
      maintenanceEquipment: 0,
      totalWorkOrders: 0,
      completedWorkOrders: 0,
      pendingWorkOrders: 0
    };
  }
};
