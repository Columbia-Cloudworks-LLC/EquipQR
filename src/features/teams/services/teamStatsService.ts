import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// ============================================
// Types
// ============================================

export interface TeamEquipmentStats {
  totalEquipment: number;
  activeEquipment: number;
  maintenanceEquipment: number;
  inactiveEquipment: number;
}

export interface TeamWorkOrderStats {
  totalWorkOrders: number;
  activeWorkOrders: number;
  overdueWorkOrders: number;
  completedWorkOrders: number;
}

export interface TeamStats {
  equipment: TeamEquipmentStats;
  workOrders: TeamWorkOrderStats;
}

export interface RecentEquipmentItem {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  status: string;
  created_at: string;
}

export interface RecentWorkOrderItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  assigneeName: string | null;
  dueDate: string | null;
  created_date: string;
}

// ============================================
// Service Functions
// ============================================

/**
 * Get equipment count and stats for a specific team
 */
export async function getTeamEquipmentStats(
  organizationId: string,
  teamId: string
): Promise<TeamEquipmentStats> {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('status')
      .eq('organization_id', organizationId) // Explicit organization filter (defense-in-depth with RLS)
      .eq('team_id', teamId);

    if (error) {
      logger.error('Error fetching team equipment stats:', error);
      throw error;
    }

    const equipmentList = data || [];
    
    return {
      totalEquipment: equipmentList.length,
      activeEquipment: equipmentList.filter(e => e.status === 'active').length,
      maintenanceEquipment: equipmentList.filter(e => e.status === 'maintenance').length,
      inactiveEquipment: equipmentList.filter(e => e.status === 'inactive').length,
    };
  } catch (error) {
    logger.error('Error in getTeamEquipmentStats:', error);
    throw error;
  }
}

/**
 * Get work order stats for a specific team (through equipment)
 */
export async function getTeamWorkOrderStats(
  organizationId: string,
  teamId: string
): Promise<TeamWorkOrderStats> {
  try {
    // First, get equipment IDs for this team
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('equipment')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('team_id', teamId);

    if (equipmentError) {
      logger.error('Error fetching team equipment for work orders:', equipmentError);
      throw equipmentError;
    }

    const equipmentIds = (equipmentData || []).map(e => e.id);

    if (equipmentIds.length === 0) {
      return {
        totalWorkOrders: 0,
        activeWorkOrders: 0,
        overdueWorkOrders: 0,
        completedWorkOrders: 0,
      };
    }

    // Get work orders for this team's equipment
    const { data: workOrderData, error: workOrderError } = await supabase
      .from('work_orders')
      .select('status, due_date')
      .eq('organization_id', organizationId)
      .in('equipment_id', equipmentIds);

    if (workOrderError) {
      logger.error('Error fetching team work orders:', workOrderError);
      throw workOrderError;
    }

    const workOrders = workOrderData || [];
    const now = new Date();
    const activeStatuses = ['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold'];

    return {
      totalWorkOrders: workOrders.length,
      activeWorkOrders: workOrders.filter(wo => activeStatuses.includes(wo.status)).length,
      overdueWorkOrders: workOrders.filter(wo => 
        wo.due_date && 
        new Date(wo.due_date) < now && 
        !['completed', 'cancelled'].includes(wo.status)
      ).length,
      completedWorkOrders: workOrders.filter(wo => wo.status === 'completed').length,
    };
  } catch (error) {
    logger.error('Error in getTeamWorkOrderStats:', error);
    throw error;
  }
}

/**
 * Get recent equipment for a team
 */
export async function getTeamRecentEquipment(
  organizationId: string,
  teamId: string,
  limit: number = 5
): Promise<RecentEquipmentItem[]> {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('id, name, manufacturer, model, status, created_at')
      .eq('organization_id', organizationId)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching team recent equipment:', error);
      throw error;
    }

    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      manufacturer: item.manufacturer,
      model: item.model,
      status: item.status,
      created_at: item.created_at,
    }));
  } catch (error) {
    logger.error('Error in getTeamRecentEquipment:', error);
    throw error;
  }
}

/**
 * Get recent work orders for a team (through equipment)
 */
export async function getTeamRecentWorkOrders(
  organizationId: string,
  teamId: string,
  limit: number = 5
): Promise<RecentWorkOrderItem[]> {
  try {
    // First, get equipment IDs for this team
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('equipment')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('team_id', teamId);

    if (equipmentError) {
      logger.error('Error fetching team equipment for recent work orders:', equipmentError);
      throw equipmentError;
    }

    const equipmentIds = (equipmentData || []).map(e => e.id);

    if (equipmentIds.length === 0) {
      return [];
    }

    // Get recent work orders for this team's equipment
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        title,
        priority,
        status,
        due_date,
        created_date,
        assignee:profiles!work_orders_assignee_id_fkey (
          name
        )
      `)
      .eq('organization_id', organizationId)
      .in('equipment_id', equipmentIds)
      .order('created_date', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching team recent work orders:', error);
      throw error;
    }

    return (data || []).map(wo => ({
      id: wo.id,
      title: wo.title,
      priority: wo.priority,
      status: wo.status,
      assigneeName: wo.assignee?.name || null,
      dueDate: wo.due_date,
      created_date: wo.created_date,
    }));
  } catch (error) {
    logger.error('Error in getTeamRecentWorkOrders:', error);
    throw error;
  }
}

/**
 * Get all team stats in a single call (equipment + work orders)
 */
export async function getTeamStats(
  organizationId: string,
  teamId: string
): Promise<TeamStats> {
  const [equipment, workOrders] = await Promise.all([
    getTeamEquipmentStats(organizationId, teamId),
    getTeamWorkOrderStats(organizationId, teamId),
  ]);

  return { equipment, workOrders };
}
