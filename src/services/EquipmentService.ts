import { BaseService, ApiResponse, PaginationParams, FilterParams } from './base/BaseService';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

// Use Supabase types for Equipment
export type Equipment = Tables<'equipment'>;

export interface EquipmentFilters extends FilterParams {
  status?: Equipment['status'];
  location?: string;
  manufacturer?: string;
  model?: string;
  team_id?: string | null;
  // Team-based access control
  userTeamIds?: string[];
  isOrgAdmin?: boolean;
}

export type EquipmentCreateData = Omit<Equipment, 'id' | 'created_at' | 'updated_at' | 'organization_id'>;

export type EquipmentUpdateData = Partial<Omit<Equipment, 'id' | 'created_at' | 'updated_at' | 'organization_id'>>;

export interface EquipmentNote extends Tables<'notes'> {
  authorName?: string;
}

export interface EquipmentScan extends Tables<'scans'> {
  scannedByName?: string;
}

export interface EquipmentWorkOrder extends Tables<'work_orders'> {
  assigneeName?: string;
  equipmentName?: string;
}

export class EquipmentService extends BaseService {
  /**
   * Get all equipment for an organization with optional filters and team-based access control
   * Uses optimized single query approach
   */
  async getAll(
    filters: EquipmentFilters = {},
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<Equipment[]>> {
    try {
      let query = supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', this.organizationId);

      // Apply team-based filtering if user is not org admin
      if (filters.userTeamIds !== undefined && !filters.isOrgAdmin) {
        if (filters.userTeamIds.length > 0) {
          query = query.in('team_id', filters.userTeamIds);
        } else {
          // Users with no team memberships see no equipment
          return this.handleSuccess([]);
        }
      }

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.manufacturer) {
        query = query.ilike('manufacturer', `%${filters.manufacturer}%`);
      }
      if (filters.model) {
        query = query.ilike('model', `%${filters.model}%`);
      }
      if (filters.team_id !== undefined) {
        if (filters.team_id === null) {
          query = query.is('team_id', null);
        } else {
          query = query.eq('team_id', filters.team_id);
        }
      }

      // Apply sorting
      if (pagination.sortBy) {
        query = query.order(pagination.sortBy, { 
          ascending: pagination.sortOrder !== 'desc' 
        });
      } else {
        query = query.order('name', { ascending: true });
      }

      // Apply pagination
      if (pagination.limit) {
        const startIndex = ((pagination.page || 1) - 1) * pagination.limit;
        query = query.range(startIndex, startIndex + pagination.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching equipment:', error);
        return this.handleError(error);
      }

      return this.handleSuccess(data || []);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get equipment by ID with organization validation
   */
  async getById(id: string): Promise<ApiResponse<Equipment>> {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', id)
        .eq('organization_id', this.organizationId)
        .single();

      if (error) {
        logger.error('Error fetching equipment by ID:', error);
        return this.handleError(error);
      }

      if (!data) {
        return this.handleError(new Error('Equipment not found'));
      }

      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create new equipment
   */
  async create(data: EquipmentCreateData): Promise<ApiResponse<Equipment>> {
    try {
      // Validate required fields
      if (!data.name || !data.manufacturer || !data.model || !data.serial_number) {
        return this.handleError(new Error('Missing required fields'));
      }

      const { data: newEquipment, error } = await supabase
        .from('equipment')
        .insert({
          organization_id: this.organizationId,
          ...data
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating equipment:', error);
        return this.handleError(error);
      }

      return this.handleSuccess(newEquipment);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update equipment
   */
  async update(id: string, data: EquipmentUpdateData): Promise<ApiResponse<Equipment>> {
    try {
      const { data: updated, error } = await supabase
        .from('equipment')
        .update(data)
        .eq('id', id)
        .eq('organization_id', this.organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating equipment:', error);
        return this.handleError(error);
      }

      if (!updated) {
        return this.handleError(new Error('Equipment not found'));
      }

      return this.handleSuccess(updated);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete equipment
   */
  async delete(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id)
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error deleting equipment:', error);
        return this.handleError(error);
      }

      return this.handleSuccess(true);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get status counts for equipment
   */
  async getStatusCounts(): Promise<ApiResponse<Record<Equipment['status'], number>>> {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('status')
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error fetching equipment status counts:', error);
        return this.handleError(error);
      }

      const counts = (data || []).reduce((acc, eq) => {
        acc[eq.status] = (acc[eq.status] || 0) + 1;
        return acc;
      }, {} as Record<Equipment['status'], number>);

      // Ensure all statuses are present
      const allStatuses: Equipment['status'][] = ['active', 'maintenance', 'inactive'];
      allStatuses.forEach(status => {
        if (!(status in counts)) {
          counts[status] = 0;
        }
      });

      return this.handleSuccess(counts);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get notes for equipment with author names (optimized JOIN)
   */
  async getNotesByEquipmentId(equipmentId: string): Promise<ApiResponse<EquipmentNote[]>> {
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
        .eq('equipment.organization_id', this.organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching equipment notes:', error);
        return this.handleError(error);
      }

      const notes: EquipmentNote[] = (data || []).map(note => ({
        ...note,
        authorName: (note.author as { name?: string } | null | undefined)?.name || 'Unknown'
      }));

      return this.handleSuccess(notes);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get scans for equipment with scanner names (optimized JOIN)
   */
  async getScansByEquipmentId(equipmentId: string): Promise<ApiResponse<EquipmentScan[]>> {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select(`
          *,
          scanned_by_profile:profiles!scans_scanned_by_fkey (
            id,
            name
          ),
          equipment!inner (
            organization_id
          )
        `)
        .eq('equipment_id', equipmentId)
        .eq('equipment.organization_id', this.organizationId)
        .order('scanned_at', { ascending: false });

      if (error) {
        logger.error('Error fetching equipment scans:', error);
        return this.handleError(error);
      }

      const scans: EquipmentScan[] = (data || []).map(scan => ({
        ...scan,
        scannedByName: (scan.scanned_by_profile as { name?: string } | null | undefined)?.name || 'Unknown'
      }));

      return this.handleSuccess(scans);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get work orders for equipment with assignee names (optimized JOIN)
   */
  async getWorkOrdersByEquipmentId(equipmentId: string): Promise<ApiResponse<EquipmentWorkOrder[]>> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          assignee:profiles!work_orders_assignee_id_fkey (
            id,
            name
          ),
          equipment:equipment!work_orders_equipment_id_fkey (
            id,
            name
          )
        `)
        .eq('equipment_id', equipmentId)
        .eq('organization_id', this.organizationId)
        .order('created_date', { ascending: false });

      if (error) {
        logger.error('Error fetching equipment work orders:', error);
        return this.handleError(error);
      }

      const workOrders: EquipmentWorkOrder[] = (data || []).map(wo => ({
        ...wo,
        assigneeName: (wo.assignee as { name?: string } | null | undefined)?.name,
        equipmentName: (wo.equipment as { name?: string } | null | undefined)?.name
      }));

      return this.handleSuccess(workOrders);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get team-accessible equipment (for RBAC)
   */
  async getTeamAccessibleEquipment(
    userTeamIds: string[],
    isOrgAdmin: boolean = false
  ): Promise<ApiResponse<Equipment[]>> {
    try {
      let query = supabase
        .from('equipment')
        .select(`
          *,
          teams:team_id (
            id,
            name
          )
        `)
        .eq('organization_id', this.organizationId);

      // Organization admins can see all equipment
      if (!isOrgAdmin) {
        // Regular users can only see equipment assigned to their teams
        if (userTeamIds.length > 0) {
          query = query.in('team_id', userTeamIds);
        } else {
          // Users with no team memberships see no equipment
          return this.handleSuccess([]);
        }
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) {
        logger.error('Error fetching team-accessible equipment:', error);
        return this.handleError(error);
      }

      return this.handleSuccess(data || []);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get accessible equipment IDs (helper for work order filtering)
   */
  async getAccessibleEquipmentIds(
    userTeamIds: string[],
    isOrgAdmin: boolean = false
  ): Promise<string[]> {
    const result = await this.getTeamAccessibleEquipment(userTeamIds, isOrgAdmin);
    if (result.success && result.data) {
      return result.data.map(eq => eq.id);
    }
    return [];
  }

  /**
   * Create a scan record for equipment
   * Validates equipment belongs to the organization
   */
  async createScan(
    equipmentId: string,
    location?: string,
    notes?: string
  ): Promise<ApiResponse<EquipmentScan>> {
    try {
      // Get authenticated user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return this.handleError(new Error('User not authenticated'));
      }

      // Verify equipment belongs to this organization
      const equipmentResult = await this.getById(equipmentId);
      if (!equipmentResult.success || !equipmentResult.data) {
        return this.handleError(new Error('Equipment not found or access denied'));
      }

      // Create the scan
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
        return this.handleError(error);
      }

      // Get scanner profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', userData.user.id)
        .single();

      const scan: EquipmentScan = {
        ...data,
        scannedByName: profile?.name || 'Unknown'
      };

      return this.handleSuccess(scan);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a note for equipment
   * Validates equipment belongs to the organization
   */
  async createNote(
    equipmentId: string,
    content: string,
    isPrivate: boolean = false
  ): Promise<ApiResponse<EquipmentNote>> {
    try {
      // Get authenticated user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return this.handleError(new Error('User not authenticated'));
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        return this.handleError(new Error('Note content is required'));
      }

      // Verify equipment belongs to this organization
      const equipmentResult = await this.getById(equipmentId);
      if (!equipmentResult.success || !equipmentResult.data) {
        return this.handleError(new Error('Equipment not found or access denied'));
      }

      // Create the note
      const { data, error } = await supabase
        .from('notes')
        .insert({
          equipment_id: equipmentId,
          content: content.trim(),
          author_id: userData.user.id,
          is_private: isPrivate
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating note:', error);
        return this.handleError(error);
      }

      // Get author profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', userData.user.id)
        .single();

      const note: EquipmentNote = {
        ...data,
        authorName: profile?.name || 'Unknown'
      };

      return this.handleSuccess(note);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

/**
 * Static helper functions for backward compatibility
 * @deprecated Use EquipmentService instance methods instead
 */
export const getTeamAccessibleEquipment = async (
  organizationId: string,
  userTeamIds: string[],
  isOrgAdmin: boolean = false
): Promise<Array<Equipment & { team_name?: string }>> => {
  const service = new EquipmentService(organizationId);
  const result = await service.getTeamAccessibleEquipment(userTeamIds, isOrgAdmin);
  if (result.success && result.data) {
    // Fetch team names for equipment that has team_id
    const teamIds = [...new Set(result.data.filter(eq => eq.team_id).map(eq => eq.team_id!))];
    let teamNames: Record<string, string> = {};
    
    if (teamIds.length > 0) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds)
        .eq('organization_id', organizationId);
      
      if (teams) {
        teamNames = teams.reduce((acc, team) => {
          acc[team.id] = team.name;
          return acc;
        }, {} as Record<string, string>);
      }
    }
    
    return result.data.map(eq => ({
      ...eq,
      team_name: eq.team_id ? teamNames[eq.team_id] : undefined
    }));
  }
  return [];
};

export const getAccessibleEquipmentIds = async (
  organizationId: string,
  userTeamIds: string[],
  isOrgAdmin: boolean = false
): Promise<string[]> => {
  const service = new EquipmentService(organizationId);
  return service.getAccessibleEquipmentIds(userTeamIds, isOrgAdmin);
};
