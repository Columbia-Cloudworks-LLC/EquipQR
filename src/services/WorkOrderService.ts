import { BaseService, ApiResponse, PaginationParams, FilterParams } from './base/BaseService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { validateStorageQuota } from '@/utils/storageQuota';

// Import and re-export unified types from the single source of truth
import {
  WorkOrder,
  WorkOrderRow,
  WorkOrderCreateData,
  WorkOrderUpdateData,
  WorkOrderNote,
  WorkOrderNoteCreateData,
  WorkOrderImage,
  WorkOrderServiceFilters,
} from '@/types/workOrder';

// Re-export types for backward compatibility
export type {
  WorkOrder,
  WorkOrderRow,
  WorkOrderCreateData,
  WorkOrderUpdateData,
  WorkOrderNote,
  WorkOrderNoteCreateData,
  WorkOrderImage,
};

/**
 * Filters for WorkOrderService.getAll()
 * Extends base FilterParams with work order specific filters
 */
export interface WorkOrderFilters extends FilterParams, WorkOrderServiceFilters {}

// Optimized select query string with all joins
const WORK_ORDER_SELECT = `
  *,
  assignee:profiles!work_orders_assignee_id_fkey (
    id,
    name
  ),
  equipment:equipment!work_orders_equipment_id_fkey (
    id,
    name,
    team_id,
    teams:team_id (
      id,
      name
    )
  ),
  creator:profiles!work_orders_created_by_fkey (
    id,
    name
  )
`;

/**
 * Maps raw Supabase row to WorkOrder with computed fields
 */
function mapWorkOrderRow(wo: Record<string, unknown>): WorkOrder {
  const assignee = wo.assignee as { id?: string; name?: string } | null;
  const equipment = wo.equipment as { 
    id?: string; 
    name?: string; 
    team_id?: string; 
    teams?: { id?: string; name?: string } | null 
  } | null;
  const creator = wo.creator as { id?: string; name?: string } | null;

  return {
    // Base work order fields
    id: wo.id as string,
    title: wo.title as string,
    description: wo.description as string,
    equipment_id: wo.equipment_id as string,
    organization_id: wo.organization_id as string,
    priority: wo.priority as WorkOrder['priority'],
    status: wo.status as WorkOrder['status'],
    assignee_id: wo.assignee_id as string | null,
    assignee_name: wo.assignee_name as string | null,
    team_id: wo.team_id as string | null,
    created_by: wo.created_by as string,
    created_by_admin: wo.created_by_admin as string | null,
    created_by_name: wo.created_by_name as string | null,
    created_date: wo.created_date as string,
    due_date: wo.due_date as string | null,
    estimated_hours: wo.estimated_hours as number | null,
    completed_date: wo.completed_date as string | null,
    acceptance_date: wo.acceptance_date as string | null,
    updated_at: wo.updated_at as string,
    is_historical: wo.is_historical as boolean,
    historical_start_date: wo.historical_start_date as string | null,
    historical_notes: wo.historical_notes as string | null,
    has_pm: wo.has_pm as boolean,
    pm_required: wo.pm_required as boolean,
    // Computed fields from joins
    assigneeName: assignee?.name || undefined,
    teamName: equipment?.teams?.name || undefined,
    equipmentName: equipment?.name || undefined,
    equipmentTeamId: equipment?.team_id || undefined,
    equipmentTeamName: equipment?.teams?.name || undefined,
    createdByName: creator?.name || undefined,
    // Assignment object for component compatibility
    assignedTo: assignee?.id && assignee?.name ? { id: assignee.id, name: assignee.name } : null,
  };
}

export class WorkOrderService extends BaseService {
  /**
   * Get all work orders for an organization with optional filters
   * Uses optimized single query with joins
   */
  async getAll(
    filters: WorkOrderFilters = {},
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<WorkOrder[]>> {
    try {
      let query = supabase
        .from('work_orders')
        .select(WORK_ORDER_SELECT)
        .eq('organization_id', this.organizationId);

      // Apply team-based access control filtering
      if (filters.userTeamIds !== undefined && !filters.isOrgAdmin) {
        if (filters.userTeamIds.length > 0) {
          // Get equipment IDs for user's teams
          const { data: equipmentIds } = await supabase
            .from('equipment')
            .select('id')
            .eq('organization_id', this.organizationId)
            .in('team_id', filters.userTeamIds);

          const ids = equipmentIds?.map(e => e.id) || [];
          if (ids.length > 0) {
            query = query.in('equipment_id', ids);
          } else {
            // No equipment for user's teams, return empty
            return this.handleSuccess([]);
          }
        } else {
          // User has no team memberships
          return this.handleSuccess([]);
        }
      }

      // Apply status filter (uses idx_work_orders_org_status composite index)
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply priority filter
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      // Apply assignee filter (uses idx_work_orders_assignee_id index)
      if (filters.assigneeId && filters.assigneeId !== 'all') {
        if (filters.assigneeId === 'unassigned') {
          query = query.is('assignee_id', null);
        } else {
          query = query.eq('assignee_id', filters.assigneeId);
        }
      }

      // Apply team filter - requires getting equipment IDs first
      if (filters.teamId && filters.teamId !== 'all') {
        const { data: equipmentIds } = await supabase
          .from('equipment')
          .select('id')
          .eq('organization_id', this.organizationId)
          .eq('team_id', filters.teamId);

        const ids = equipmentIds?.map(e => e.id) || [];
        if (ids.length > 0) {
          query = query.in('equipment_id', ids);
        } else {
          // No equipment for this team
          return this.handleSuccess([]);
        }
      }

      // Apply equipment filter (uses idx_work_orders_equipment_id index)
      if (filters.equipmentId) {
        query = query.eq('equipment_id', filters.equipmentId);
      }

      // Apply due date filter (uses idx_work_orders_org_due_date)
      if (filters.dueDateFilter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        switch (filters.dueDateFilter) {
          case 'overdue':
            query = query
              .lt('due_date', today.toISOString())
              .not('status', 'eq', 'completed')
              .not('status', 'eq', 'cancelled');
            break;
          case 'today': {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', tomorrow.toISOString());
            break;
          }
          case 'this_week':
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', weekFromNow.toISOString());
            break;
        }
      }

      // Apply text search if provided
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply sorting
      if (pagination.sortBy) {
        query = query.order(pagination.sortBy, {
          ascending: pagination.sortOrder !== 'desc'
        });
      } else {
        query = query.order('created_date', { ascending: false });
      }

      // Apply pagination
      if (pagination.limit) {
        const startIndex = ((pagination.page || 1) - 1) * pagination.limit;
        query = query.range(startIndex, startIndex + pagination.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching work orders:', error);
        return this.handleError(error);
      }

      const workOrders = (data || []).map(wo => mapWorkOrderRow(wo as unknown as Record<string, unknown>));
      return this.handleSuccess(workOrders);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get work order by ID with organization validation
   * Uses optimized query with joins
   */
  async getById(id: string): Promise<ApiResponse<WorkOrder>> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(WORK_ORDER_SELECT)
        .eq('id', id)
        .eq('organization_id', this.organizationId)
        .single();

      if (error) {
        logger.error('Error fetching work order by ID:', error);
        return this.handleError(error);
      }

      if (!data) {
        return this.handleError(new Error('Work order not found'));
      }

      return this.handleSuccess(mapWorkOrderRow(data as unknown as Record<string, unknown>));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create new work order
   */
  async create(data: WorkOrderCreateData): Promise<ApiResponse<WorkOrder>> {
    try {
      // Validate required fields
      if (!data.title || !data.description || !data.equipment_id) {
        return this.handleError(new Error('Missing required fields: title, description, equipment_id'));
      }

      const { data: newWorkOrder, error } = await supabase
        .from('work_orders')
        .insert({
          organization_id: this.organizationId,
          title: data.title,
          description: data.description,
          equipment_id: data.equipment_id,
          priority: data.priority || 'medium',
          status: data.status || 'submitted',
          assignee_id: data.assignee_id || null,
          team_id: data.team_id || null,
          due_date: data.due_date || null,
          estimated_hours: data.estimated_hours || null,
          created_by: data.created_by,
          is_historical: data.is_historical || false,
          historical_start_date: data.historical_start_date || null,
          historical_notes: data.historical_notes || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating work order:', error);
        return this.handleError(error);
      }

      // Fetch the complete work order with joins
      return this.getById(newWorkOrder.id);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update work order
   */
  async update(id: string, data: WorkOrderUpdateData): Promise<ApiResponse<WorkOrder>> {
    try {
      // Build update object with only provided fields
      const updateData: Partial<WorkOrderRow> = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.equipment_id !== undefined) updateData.equipment_id = data.equipment_id;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.assignee_id !== undefined) updateData.assignee_id = data.assignee_id;
      if (data.team_id !== undefined) updateData.team_id = data.team_id;
      if (data.due_date !== undefined) updateData.due_date = data.due_date;
      if (data.estimated_hours !== undefined) updateData.estimated_hours = data.estimated_hours;
      if (data.completed_date !== undefined) updateData.completed_date = data.completed_date;

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error updating work order:', error);
        return this.handleError(error);
      }

      // Fetch the updated work order with joins
      return this.getById(id);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update work order status
   */
  async updateStatus(id: string, status: WorkOrder['status']): Promise<ApiResponse<WorkOrder>> {
    try {
      const updateData: Partial<WorkOrderRow> = { status };

      // Set completed_date if transitioning to completed
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      // Set acceptance_date if transitioning to accepted
      if (status === 'accepted') {
        updateData.acceptance_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error updating work order status:', error);
        return this.handleError(error);
      }

      // Fetch the updated work order with joins
      return this.getById(id);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete work order
   */
  async delete(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id)
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error deleting work order:', error);
        return this.handleError(error);
      }

      return this.handleSuccess(true);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get status counts for work orders
   */
  async getStatusCounts(): Promise<ApiResponse<Record<WorkOrder['status'], number>>> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('status')
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error fetching work order status counts:', error);
        return this.handleError(error);
      }

      const counts = (data || []).reduce((acc, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      }, {} as Record<WorkOrder['status'], number>);

      // Ensure all statuses are present
      const allStatuses: WorkOrder['status'][] = [
        'submitted', 'accepted', 'assigned', 'in_progress', 
        'on_hold', 'completed', 'cancelled'
      ];
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
   * Get priority distribution for work orders
   */
  async getPriorityDistribution(): Promise<ApiResponse<Record<WorkOrder['priority'], number>>> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('priority')
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error fetching work order priority distribution:', error);
        return this.handleError(error);
      }

      const distribution = (data || []).reduce((acc, wo) => {
        acc[wo.priority] = (acc[wo.priority] || 0) + 1;
        return acc;
      }, {} as Record<WorkOrder['priority'], number>);

      // Ensure all priorities are present
      const allPriorities: WorkOrder['priority'][] = ['low', 'medium', 'high'];
      allPriorities.forEach(priority => {
        if (!(priority in distribution)) {
          distribution[priority] = 0;
        }
      });

      return this.handleSuccess(distribution);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get dashboard stats for work orders
   */
  async getDashboardStats(): Promise<ApiResponse<{
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('status, due_date')
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error fetching work order dashboard stats:', error);
        return this.handleError(error);
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const workOrders = data || [];

      const total = workOrders.length;
      const completed = workOrders.filter(wo => wo.status === 'completed').length;
      const pending = workOrders.filter(wo => 
        !['completed', 'cancelled'].includes(wo.status)
      ).length;
      const overdue = workOrders.filter(wo => 
        wo.due_date && 
        new Date(wo.due_date) < today && 
        !['completed', 'cancelled'].includes(wo.status)
      ).length;

      return this.handleSuccess({ total, completed, pending, overdue });
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================
  // Convenience methods
  // ============================================

  /**
   * Get work orders assigned to a specific user
   */
  async getMyWorkOrders(userId: string): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ assigneeId: userId });
  }

  /**
   * Get work orders for a specific team
   */
  async getTeamWorkOrders(
    teamId: string,
    status?: WorkOrder['status'] | 'all'
  ): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ teamId, status });
  }

  /**
   * Get work orders for specific equipment
   */
  async getEquipmentWorkOrders(
    equipmentId: string,
    status?: WorkOrder['status'] | 'all'
  ): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ equipmentId, status });
  }

  /**
   * Get overdue work orders
   */
  async getOverdueWorkOrders(): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ dueDateFilter: 'overdue' });
  }

  /**
   * Get work orders due today
   */
  async getWorkOrdersDueToday(): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ dueDateFilter: 'today' });
  }

  // ============================================
  // Work Order Notes Methods
  // ============================================

  /**
   * Get notes for a work order with author names and associated images
   */
  async getNotes(workOrderId: string): Promise<ApiResponse<WorkOrderNote[]>> {
    try {
      // Verify work order belongs to organization
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .select('id')
        .eq('id', workOrderId)
        .eq('organization_id', this.organizationId)
        .single();

      if (woError || !workOrder) {
        return this.handleError(new Error('Work order not found'));
      }

      // Get notes
      const { data: notes, error: notesError } = await supabase
        .from('work_order_notes')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (notesError) {
        logger.error('Error fetching work order notes:', notesError);
        return this.handleError(notesError);
      }

      if (!notes || notes.length === 0) {
        return this.handleSuccess([]);
      }

      // Get author names
      const authorIds = [...new Set(notes.map(note => note.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', authorIds);

      // Get all images for this work order
      const { data: allImages } = await supabase
        .from('work_order_images')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      // Get uploader names for images
      const uploaderIds = [...new Set((allImages || []).map(img => img.uploaded_by))];
      let uploaderProfiles: Array<{ id: string; name?: string }> = [];
      
      if (uploaderIds.length > 0) {
        const { data: uploaderData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', uploaderIds);
        uploaderProfiles = uploaderData || [];
      }

      // Map notes with authors and images
      const enrichedNotes: WorkOrderNote[] = notes.map(note => {
        const author = (profiles || []).find(p => p.id === note.author_id);
        const noteImages = (allImages || [])
          .filter(img => img.note_id === note.id)
          .map(img => {
            const uploader = uploaderProfiles.find(p => p.id === img.uploaded_by);
            return {
              ...img,
              uploaded_by_name: uploader?.name || 'Unknown'
            };
          });

        return {
          ...note,
          author_name: author?.name || 'Unknown',
          images: noteImages
        };
      });

      return this.handleSuccess(enrichedNotes);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a note for a work order
   */
  async createNote(
    workOrderId: string,
    noteData: WorkOrderNoteCreateData
  ): Promise<ApiResponse<WorkOrderNote>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return this.handleError(new Error('User not authenticated'));
      }

      // Verify work order belongs to organization
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .select('id')
        .eq('id', workOrderId)
        .eq('organization_id', this.organizationId)
        .single();

      if (woError || !workOrder) {
        return this.handleError(new Error('Work order not found'));
      }

      const { data: note, error } = await supabase
        .from('work_order_notes')
        .insert({
          work_order_id: workOrderId,
          author_id: userData.user.id,
          content: noteData.content,
          hours_worked: noteData.hours_worked || 0,
          is_private: noteData.is_private || false
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating work order note:', error);
        return this.handleError(error);
      }

      // Get author profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', userData.user.id)
        .single();

      return this.handleSuccess({
        ...note,
        author_name: profile?.name || 'Unknown',
        images: []
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a note with images
   */
  async createNoteWithImages(
    workOrderId: string,
    noteData: WorkOrderNoteCreateData,
    images: File[]
  ): Promise<ApiResponse<WorkOrderNote>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return this.handleError(new Error('User not authenticated'));
      }

      // Validate storage quota for all files
      const totalFileSize = images.reduce((sum, file) => sum + file.size, 0);
      await validateStorageQuota(this.organizationId, totalFileSize);

      // Create the note first
      const noteResult = await this.createNote(workOrderId, noteData);
      if (!noteResult.success || !noteResult.data) {
        return noteResult;
      }

      const note = noteResult.data;
      const uploadedImages: WorkOrderImage[] = [];

      // Upload images
      for (const file of images) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${userData.user.id}/${workOrderId}/${note.id}/${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('work-order-images')
            .upload(fileName, file);

          if (uploadError) {
            logger.error('Failed to upload image:', uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('work-order-images')
            .getPublicUrl(uploadData.path);

          const { data: imageRecord, error: imageError } = await supabase
            .from('work_order_images')
            .insert({
              work_order_id: workOrderId,
              note_id: note.id,
              file_name: file.name,
              file_url: publicUrl,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: userData.user.id,
              description: `Attached to note: ${note.id}`
            })
            .select()
            .single();

          if (imageError) {
            logger.error('Failed to save image record:', imageError);
            continue;
          }

          uploadedImages.push({
            ...imageRecord,
            uploaded_by_name: note.author_name
          });
        } catch (error) {
          logger.error('Error processing image:', error);
        }
      }

      return this.handleSuccess({
        ...note,
        images: uploadedImages
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================
  // Work Order Images Methods
  // ============================================

  /**
   * Get all images for a work order
   */
  async getImages(workOrderId: string): Promise<ApiResponse<WorkOrderImage[]>> {
    try {
      // Verify work order belongs to organization
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .select('id')
        .eq('id', workOrderId)
        .eq('organization_id', this.organizationId)
        .single();

      if (woError || !workOrder) {
        return this.handleError(new Error('Work order not found'));
      }

      const { data: images, error } = await supabase
        .from('work_order_images')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching work order images:', error);
        return this.handleError(error);
      }

      if (!images || images.length === 0) {
        return this.handleSuccess([]);
      }

      // Get uploader names
      const uploaderIds = [...new Set(images.map(img => img.uploaded_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', uploaderIds);

      const enrichedImages: WorkOrderImage[] = images.map(image => {
        const uploader = (profiles || []).find(p => p.id === image.uploaded_by);
        return {
          ...image,
          uploaded_by_name: uploader?.name || 'Unknown'
        };
      });

      return this.handleSuccess(enrichedImages);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Upload an image for a work order
   */
  async uploadImage(
    workOrderId: string,
    file: File,
    description?: string
  ): Promise<ApiResponse<WorkOrderImage>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return this.handleError(new Error('User not authenticated'));
      }

      // Verify work order belongs to organization
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .select('id')
        .eq('id', workOrderId)
        .eq('organization_id', this.organizationId)
        .single();

      if (woError || !workOrder) {
        return this.handleError(new Error('Work order not found'));
      }

      // Validate storage quota
      await validateStorageQuota(this.organizationId, file.size);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.user.id}/${workOrderId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('work-order-images')
        .upload(fileName, file);

      if (uploadError) {
        logger.error('Error uploading image:', uploadError);
        return this.handleError(uploadError);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-images')
        .getPublicUrl(uploadData.path);

      // Save image record
      const { data: imageRecord, error: imageError } = await supabase
        .from('work_order_images')
        .insert({
          work_order_id: workOrderId,
          uploaded_by: userData.user.id,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          description: description || null
        })
        .select()
        .single();

      if (imageError) {
        logger.error('Error saving image record:', imageError);
        return this.handleError(imageError);
      }

      // Get uploader profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', userData.user.id)
        .single();

      return this.handleSuccess({
        ...imageRecord,
        uploaded_by_name: profile?.name || 'Unknown'
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete an image from a work order
   */
  async deleteImage(imageId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return this.handleError(new Error('User not authenticated'));
      }

      // Get image details and verify ownership
      const { data: image, error: fetchError } = await supabase
        .from('work_order_images')
        .select(`
          *,
          work_orders!inner (
            organization_id
          )
        `)
        .eq('id', imageId)
        .single();

      if (fetchError || !image) {
        return this.handleError(new Error('Image not found'));
      }

      // Verify organization
      const workOrder = image.work_orders as { organization_id: string };
      if (workOrder.organization_id !== this.organizationId) {
        return this.handleError(new Error('Not authorized'));
      }

      // Check if user can delete (must be uploader or have admin permissions)
      if (image.uploaded_by !== userData.user.id) {
        return this.handleError(new Error('Not authorized to delete this image'));
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('work_order_images')
        .delete()
        .eq('id', imageId);

      if (deleteError) {
        logger.error('Error deleting image:', deleteError);
        return this.handleError(deleteError);
      }

      // Delete from storage
      try {
        const filePath = image.file_url.split('/').slice(-4).join('/');
        await supabase.storage
          .from('work-order-images')
          .remove([filePath]);
      } catch (storageError) {
        logger.warn('Failed to delete image from storage:', storageError);
        // Don't fail the operation if storage deletion fails
      }

      return this.handleSuccess(true);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
