import { logger } from '../utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Use native Supabase types directly
export type Equipment = Tables<'equipment'>;
export type Note = Tables<'notes'> & {
  authorName?: string;
};
export type WorkOrder = Tables<'work_orders'> & {
  assigneeName?: string;
  teamName?: string;
};
export type Scan = Tables<'scans'> & {
  scannedByName?: string;
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
export type WorkOrderCost = Tables<'work_order_costs'> & {
  createdByName?: string;
};

export interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  maintenanceEquipment: number;
  totalWorkOrders: number;
}

// Equipment functions
// @deprecated Use EquipmentService.getAll() instead. Will be removed in Phase 2.
export const getEquipmentByOrganization = async (organizationId: string): Promise<Equipment[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      logger.error('Error fetching equipment:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getEquipmentByOrganization:', error);
    return [];
  }
};

// @deprecated Use EquipmentService.getById() instead. Will be removed in Phase 2.
export const getEquipmentById = async (organizationId: string, equipmentId: string): Promise<Equipment | undefined> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      logger.error('Error fetching equipment by ID:', error);
      return undefined;
    }

    return data;
  } catch (error) {
    logger.error('Error in getEquipmentById:', error);
    return undefined;
  }
};

// Team functions
export const getTeamsByOrganization = async (organizationId: string): Promise<Team[]> => {
  try {
    // First get all teams for the organization
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (teamsError) {
      logger.error('Error fetching teams:', teamsError);
      return [];
    }

    if (!teamsData || teamsData.length === 0) {
      return [];
    }

    // Get team IDs
    const teamIds = teamsData.map(team => team.id);

    // Get team members with profile data using separate query to avoid RLS context issues
    const { data: membersData, error: membersError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        user_id,
        role,
        profiles!team_members_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .in('team_id', teamIds);

    if (membersError) {
      logger.error('Error fetching team members:', membersError);
    }

    // Get work order counts for teams through equipment
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, team_id')
      .eq('organization_id', organizationId)
      .in('team_id', teamIds);

    if (equipmentError) {
      logger.error('Error fetching equipment for work order counts:', equipmentError);
    }

    // Get work order counts
    const equipmentIds = (equipment || []).map(eq => eq.id);
    const { data: workOrderCounts, error: workOrderError } = equipmentIds.length > 0 ? 
      await supabase
        .from('work_orders')
        .select('equipment_id')
        .in('equipment_id', equipmentIds)
        .not('status', 'eq', 'completed') : 
      { data: [], error: null };

    if (workOrderError) {
      logger.error('Error fetching work order counts:', workOrderError);
    }

    // Build teams with member and work order data
    return teamsData.map(team => {
      const teamMembers = (membersData || [])
        .filter(member => member.team_id === team.id)
        .map(member => ({
          id: member.user_id,
          name: (member.profiles as { name?: string })?.name || 'Unknown',
          email: (member.profiles as { email?: string })?.email || '',
          role: member.role,
        }));

      // Count work orders for this team
      const teamEquipment = (equipment || []).filter(eq => eq.team_id === team.id);
      const teamEquipmentIds = teamEquipment.map(eq => eq.id);
      const workOrderCount = (workOrderCounts || []).filter(wo => 
        teamEquipmentIds.includes(wo.equipment_id)
      ).length;

      return {
        ...team,
        memberCount: teamMembers.length,
        workOrderCount,
        members: teamMembers
      };
    });
  } catch (error) {
    logger.error('Error in getTeamsByOrganization:', error);
    return [];
  }
};

// Dashboard statistics
export const getDashboardStatsByOrganization = async (organizationId: string): Promise<DashboardStats> => {
  try {
    // Get equipment stats
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('equipment')
      .select('status')
      .eq('organization_id', organizationId);

    if (equipmentError) {
      logger.error('Error fetching equipment stats:', equipmentError);
    }

    // Get work order stats
    const { data: workOrderData, error: workOrderError } = await supabase
      .from('work_orders')
      .select('status')
      .eq('organization_id', organizationId);

    if (workOrderError) {
      logger.error('Error fetching work order stats:', workOrderError);
    }

    const equipment = equipmentData || [];
    const workOrders = workOrderData || [];

    return {
      totalEquipment: equipment.length,
      activeEquipment: equipment.filter(e => e.status === 'active').length,
      maintenanceEquipment: equipment.filter(e => e.status === 'maintenance').length,
      totalWorkOrders: workOrders.length
    };
  } catch (error) {
    logger.error('Error in getDashboardStatsByOrganization:', error);
    return {
      totalEquipment: 0,
      activeEquipment: 0,
      maintenanceEquipment: 0,
      totalWorkOrders: 0
    };
  }
};

// Notes functions
export const getNotesByEquipmentId = async (organizationId: string, equipmentId: string): Promise<Note[]> => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        equipment!inner (
          organization_id
        )
      `)
      .eq('equipment_id', equipmentId)
      .eq('equipment.organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching notes:', error);
      return [];
    }

    // Get author profiles
    const authorIds = [...new Set((data || []).map(note => note.author_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', authorIds);

    if (profilesError) {
      logger.error('Error fetching author profiles:', profilesError);
    }

    return (data || []).map(note => ({
      ...note,
      authorName: profiles?.find(p => p.id === note.author_id)?.name || 'Unknown'
    }));
  } catch (error) {
    logger.error('Error in getNotesByEquipmentId:', error);
    return [];
  }
};

// Work orders functions
export const getWorkOrdersByEquipmentId = async (organizationId: string, equipmentId: string): Promise<WorkOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('organization_id', organizationId)
      .order('created_date', { ascending: false });

    if (error) {
      logger.error('Error fetching work orders:', error);
      return [];
    }

    // Get profiles for transforming the data - teams come from equipment assignment
    const assigneeIds = [...new Set((data || []).map(wo => wo.assignee_id).filter(Boolean))];
    
    const profilesResult = assigneeIds.length > 0 ? 
      await supabase.from('profiles').select('id, name').in('id', assigneeIds) : 
      { data: [], error: null };

    // Sort work orders by appropriate date field (historical_start_date for historical, created_date for regular)
    const sortedData = (data || []).sort((a, b) => {
      const dateA = a.is_historical && a.historical_start_date ? 
        new Date(a.historical_start_date) : new Date(a.created_date);
      const dateB = b.is_historical && b.historical_start_date ? 
        new Date(b.historical_start_date) : new Date(b.created_date);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    return sortedData.map(wo => ({
      ...wo,
      assigneeName: profilesResult.data?.find(p => p.id === wo.assignee_id)?.name,
      teamName: undefined // Team info now comes from equipment assignment
    }));
  } catch (error) {
    logger.error('Error in getWorkOrdersByEquipmentId:', error);
    return [];
  }
};

export const getAllWorkOrdersByOrganization = async (organizationId: string): Promise<WorkOrder[]> => {
  try {
    // First get all work orders for the organization
    const { data: workOrders, error: workOrdersError } = await supabase
      .from('work_orders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_date', { ascending: false });

    if (workOrdersError) {
      logger.error('Error fetching all work orders:', workOrdersError);
      return [];
    }

    if (!workOrders || workOrders.length === 0) {
      return [];
    }

    // Get unique assignee IDs from work orders
    const assigneeIds = [...new Set(workOrders.map(wo => wo.assignee_id).filter(Boolean))];
    
    // Get assignee profiles in separate query to avoid RLS context issues
    const { data: profiles, error: profilesError } = assigneeIds.length > 0 ? 
      await supabase.from('profiles').select('id, name').in('id', assigneeIds) : 
      { data: [], error: null };

    if (profilesError) {
      logger.error('Error fetching assignee profiles:', profilesError);
    }

    // Combine work orders with assignee names
    return workOrders.map(wo => ({
      ...wo,
      assigneeName: profiles?.find(p => p.id === wo.assignee_id)?.name,
      teamName: undefined // Team info now comes from equipment assignment
    }));
  } catch (error) {
    logger.error('Error in getAllWorkOrdersByOrganization:', error);
    return [];
  }
};

export const getWorkOrderById = async (organizationId: string, workOrderId: string): Promise<WorkOrder | undefined> => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', workOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      logger.error('Error fetching work order by ID:', error);
      return undefined;
    }

    // Get profiles for transforming the data - teams come from equipment assignment
    const profilesResult = data.assignee_id ? 
      await supabase.from('profiles').select('id, name').eq('id', data.assignee_id).single() : 
      { data: null, error: null };

    return {
      ...data,
      assigneeName: profilesResult.data?.name,
      teamName: undefined // Team info now comes from equipment assignment
    };
  } catch (error) {
    logger.error('Error in getWorkOrderById:', error);
    return undefined;
  }
};

// Scans functions
export const getScansByEquipmentId = async (organizationId: string, equipmentId: string): Promise<Scan[]> => {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select(`
        *,
        equipment!inner (
          organization_id
        )
      `)
      .eq('equipment_id', equipmentId)
      .eq('equipment.organization_id', organizationId)
      .order('scanned_at', { ascending: false });

    if (error) {
      logger.error('Error fetching scans:', error);
      return [];
    }

    // Get scanned by user profiles
    const userIds = [...new Set((data || []).map(scan => scan.scanned_by))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);

    if (profilesError) {
      logger.error('Error fetching user profiles:', profilesError);
    }

    return (data || []).map(scan => ({
      ...scan,
      scannedByName: profiles?.find(p => p.id === scan.scanned_by)?.name || 'Unknown'
    }));
  } catch (error) {
    logger.error('Error in getScansByEquipmentId:', error);
    return [];
  }
};

// Create scan function
export const createScan = async (
  organizationId: string,
  equipmentId: string,
  location?: string,
  notes?: string
): Promise<Scan | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      logger.error('User not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('scans')
      .insert({
        equipment_id: equipmentId,
        scanned_by: userData.user.id,
        location: location || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating scan:', error);
      return null;
    }

    // Get scanned by user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', userData.user.id)
      .single();

    return {
      ...data,
      scannedByName: profile?.name || 'Unknown'
    };
  } catch (error) {
    logger.error('Error in createScan:', error);
    return null;
  }
};

// Mutation functions
export const updateWorkOrderStatus = async (
  organizationId: string,
  workOrderId: string,
  newStatus: WorkOrder['status']
): Promise<boolean> => {
  try {
    const updateData: { status: WorkOrder['status']; completed_date?: string } = { status: newStatus };
    
    // Set completion date if marking as completed
    if (newStatus === 'completed') {
      updateData.completed_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', workOrderId)
      .eq('organization_id', organizationId);

    if (error) {
      logger.error('Error updating work order status:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in updateWorkOrderStatus:', error);
    return false;
  }
};

// Create equipment
// @deprecated Use EquipmentService.create() instead. Will be removed in Phase 2.
export const createEquipment = async (
  organizationId: string,
  equipmentData: Omit<Equipment, 'id' | 'created_at' | 'updated_at' | 'organization_id'>
): Promise<Equipment | null> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .insert({
        organization_id: organizationId,
        ...equipmentData
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating equipment:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in createEquipment:', error);
    return null;
  }
};

// Create work order
export const createWorkOrder = async (
  organizationId: string,
  workOrderData: Omit<WorkOrder, 'id' | 'created_date' | 'updated_at' | 'organization_id' | 'assigneeName' | 'teamName' | 'completed_date' | 'created_by'>
): Promise<WorkOrder | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      logger.error('User not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('work_orders')
      .insert({
        organization_id: organizationId,
        created_by: userData.user.id,
        ...workOrderData
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating work order:', error);
      return null;
    }

    // Get profiles for transforming the data - teams come from equipment assignment
    const profilesResult = data.assignee_id ? 
      await supabase.from('profiles').select('id, name').eq('id', data.assignee_id).single() : 
      { data: null, error: null };

    return {
      ...data,
      assigneeName: profilesResult.data?.name,
      teamName: undefined // Team info now comes from equipment assignment
    };
  } catch (error) {
    logger.error('Error in createWorkOrder:', error);
    return null;
  }
};

// Create note
export const createNote = async (
  organizationId: string,
  equipmentId: string,
  content: string,
  isPrivate: boolean = false
): Promise<Note | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      logger.error('User not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        equipment_id: equipmentId,
        content,
        author_id: userData.user.id,
        is_private: isPrivate
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating note:', error);
      return null;
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', userData.user.id)
      .single();

    return {
      ...data,
      authorName: profile?.name || 'Unknown'
    };
  } catch (error) {
    logger.error('Error in createNote:', error);
    return null;
  }
};

// Update equipment
// @deprecated Use EquipmentService.update() instead. Will be removed in Phase 2.
export const updateEquipment = async (
  organizationId: string,
  equipmentId: string,
  equipmentData: Partial<Omit<Equipment, 'id' | 'created_at' | 'updated_at' | 'organization_id'>>
): Promise<Equipment | null> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .update(equipmentData)
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating equipment:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in updateEquipment:', error);
    return null;
  }
};
