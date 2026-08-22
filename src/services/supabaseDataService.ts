import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Use native Supabase types directly
export type Equipment = Tables<'equipment'>;
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
export type WorkOrderCost = Tables<'work_order_costs'> & {
  createdByName?: string;
};

/**
 * @deprecated Use EquipmentService.getAll() from '@/features/equipment/services/EquipmentService' instead.
 */
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
