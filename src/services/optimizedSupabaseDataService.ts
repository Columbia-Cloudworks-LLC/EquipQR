import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Optimized types with computed fields
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

// OPTIMIZED: Single query with joins instead of multiple calls
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
      console.error('Error fetching teams with members:', error);
      return [];
    }

    if (!teamsWithMembers || teamsWithMembers.length === 0) {
      return [];
    }

    // Single query to get work order counts
    const teamIds = teamsWithMembers.map(team => team.id);
    const { data: workOrderCounts } = await supabase
      .from('work_orders')
      .select('team_id')
      .in('team_id', teamIds)
      .not('status', 'eq', 'completed');

    return teamsWithMembers.map(team => {
      const teamMembers = (team.team_members || []).map((member: any) => ({
        id: member.user_id,
        name: member.profiles?.name || 'Unknown',
        email: member.profiles?.email || '',
        role: member.role,
      }));

      const workOrderCount = (workOrderCounts || []).filter(wo => wo.team_id === team.id).length;

      return {
        ...team,
        memberCount: teamMembers.length,
        workOrderCount,
        members: teamMembers
      };
    });
  } catch (error) {
    console.error('Error in getOptimizedTeamsByOrganization:', error);
    return [];
  }
};

// OPTIMIZED: Single query with all joins for work orders
export const getOptimizedWorkOrdersByOrganization = async (organizationId: string): Promise<WorkOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        assignee:profiles!work_orders_assignee_id_fkey (
          id,
          name
        ),
        team:teams!work_orders_team_id_fkey (
          id,
          name
        ),
        equipment:equipment!work_orders_equipment_id_fkey (
          id,
          name
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_date', { ascending: false });

    if (error) {
      console.error('Error fetching optimized work orders:', error);
      return [];
    }

    return (data || []).map(wo => ({
      ...wo,
      assigneeName: (wo.assignee as any)?.name,
      teamName: (wo.team as any)?.name,
      equipmentName: (wo.equipment as any)?.name
    }));
  } catch (error) {
    console.error('Error in getOptimizedWorkOrdersByOrganization:', error);
    return [];
  }
};

// OPTIMIZED: Batch queries for dashboard stats
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
    console.error('Error in getOptimizedDashboardStats:', error);
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

// OPTIMIZED: Single query with join for notes
export const getOptimizedNotesByEquipmentId = async (organizationId: string, equipmentId: string): Promise<Note[]> => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        author:profiles!notes_author_id_fkey (
          id,
          name
        ),
        equipment!inner (
          organization_id
        )
      `)
      .eq('equipment_id', equipmentId)
      .eq('equipment.organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching optimized notes:', error);
      return [];
    }

    return (data || []).map(note => ({
      ...note,
      authorName: (note.author as any)?.name || 'Unknown'
    }));
  } catch (error) {
    console.error('Error in getOptimizedNotesByEquipmentId:', error);
    return [];
  }
};

// OPTIMIZED: Batch equipment queries
export const getOptimizedEquipmentByOrganization = async (organizationId: string): Promise<Equipment[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getOptimizedEquipmentByOrganization:', error);
    return [];
  }
};

// OPTIMIZED: Single work order query with all related data
export const getOptimizedWorkOrderById = async (organizationId: string, workOrderId: string): Promise<WorkOrder | undefined> => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        assignee:profiles!work_orders_assignee_id_fkey (
          id,
          name
        ),
        team:teams!work_orders_team_id_fkey (
          id,
          name
        ),
        equipment:equipment!work_orders_equipment_id_fkey (
          id,
          name
        )
      `)
      .eq('id', workOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      console.error('Error fetching optimized work order by ID:', error);
      return undefined;
    }

    return {
      ...data,
      assigneeName: (data.assignee as any)?.name,
      teamName: (data.team as any)?.name,
      equipmentName: (data.equipment as any)?.name
    };
  } catch (error) {
    console.error('Error in getOptimizedWorkOrderById:', error);
    return undefined;
  }
};