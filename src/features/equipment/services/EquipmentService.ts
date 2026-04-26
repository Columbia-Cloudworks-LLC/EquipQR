import { ApiResponse, PaginationParams, FilterParams } from '@/services/base/BaseService';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';
import { getAuthClaims } from '@/lib/authClaims';

// Use Supabase types for Equipment
export type Equipment = Tables<'equipment'>;

// Extended equipment type with team info for display purposes.
// `team` is the raw join shape returned by Supabase; `team_name` is the
// flattened convenience field every UI consumer reads (EquipmentCard,
// EquipmentTable). The service layer is responsible for populating
// `team_name` from `team.name` so consumers never have to do the lookup.
export interface EquipmentTeamSummary {
  id: string;
  name: string;
  description?: string | null;
  location_address?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  override_equipment_location?: boolean | null;
}

export interface EquipmentWithTeam extends Equipment {
  team?: EquipmentTeamSummary | null;
  team_name?: string;
}

/**
 * Lightweight equipment row for selector / offline-merge / dropdown use cases.
 *
 * `EquipmentService.getSummaries` returns this projection. It MUST stay narrow
 * (no large JSON or text columns) so it can be loaded over Slow 4G connections
 * without paying the cost of `select('*')` for every equipment row in the org.
 *
 * Consumers that need the full row should use `useEquipmentById` for the
 * specific record they care about — it shares the same `equipment` cache root.
 */
export interface EquipmentSummary {
  id: string;
  organization_id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  status: Equipment['status'];
  team_id: string | null;
  location: string | null;
  image_url: string | null;
  working_hours: number | null;
  last_maintenance: string | null;
  /**
   * Subset of the `last_known_location` JSON column. The DB column stores
   * arbitrary JSON (it's used by both scan-location and reverse-geocode
   * payloads), but selectors only ever read `.name`. Narrowing here keeps
   * downstream consumers honest without losing flexibility — anything that
   * needs lat/lng must use `useEquipmentById` to get the full row.
   */
  last_known_location: { name?: string } | null;
  team?: { id: string; name: string } | null;
  team_name?: string;
}

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

/**
 * Minimal data for quick equipment creation during work order creation.
 * Name is provided but can be auto-generated from manufacturer + model.
 */
export interface QuickEquipmentCreateData {
  manufacturer: string;
  model: string;
  serial_number: string;
  working_hours?: number | null;
  team_id: string;
  name: string;
}

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

/**
 * Helper functions for consistent error/success handling
 */
function handleError(error: unknown): ApiResponse<null> {
  logger.error('EquipmentService error:', error);
  return {
    data: null,
    error: error instanceof Error ? error.message : 'Operation failed',
    success: false
  };
}

function handleSuccess<T>(data: T): ApiResponse<T> {
  return {
    data,
    error: null,
    success: true
  };
}

/**
 * Maximum number of concurrent per-row Supabase updates issued by
 * `EquipmentService.batchUpdate`. Bulk saves chunk into batches of this size
 * and run sequentially across chunks to avoid rate limiting and network
 * saturation on large bulk-edit payloads (#627).
 */
const BATCH_UPDATE_CONCURRENCY = 10;

/**
 * Equipment Service using static methods pattern
 * 
 * This service uses static methods rather than instance methods to avoid the need
 * for service instantiation. All methods require organizationId as the first parameter
 * for security and multi-tenancy support.
 * 
 * Note: This differs from other services (e.g., WorkOrderService) which extend BaseService
 * and use instance methods. The static pattern was chosen to simplify the API and make
 * organizationId explicitly required for all operations.
 */
export class EquipmentService {
  /**
   * Get all equipment for an organization with optional filters and team-based access control
   * Uses optimized single query approach
   */
  static async getAll(
    organizationId: string,
    filters: EquipmentFilters = {},
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<EquipmentWithTeam[]>> {
    try {
      let query = supabase
        .from('equipment')
        .select('*, team:team_id(id, name)')
        .eq('organization_id', organizationId);

      // Apply team-based filtering if user is not org admin
      if (filters.userTeamIds !== undefined && !filters.isOrgAdmin) {
        if (filters.userTeamIds.length > 0) {
          query = query.in('team_id', filters.userTeamIds);
        } else {
          // Users with no team memberships see no equipment
          return handleSuccess([]);
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
        return handleError(error);
      }

      const flattened = (data || []).map(row => ({
        ...row,
        team_name: (row.team as { name?: string } | null | undefined)?.name ?? undefined,
      })) as EquipmentWithTeam[];

      return handleSuccess(flattened);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Lightweight per-org equipment summaries for selectors, offline merge, and
   * dropdown / autocomplete use cases. Projects only the columns those surfaces
   * need so the payload stays small on Slow 4G — this is the difference between
   * a 50 KB and a 500 KB response on large fleets.
   *
   * The shape is intentionally a superset of `EquipmentSelectorItem` so the
   * existing work-order equipment selector and inventory item selectors can
   * consume it directly.
   */
  static async getSummaries(
    organizationId: string,
    options: { userTeamIds?: string[]; isOrgAdmin?: boolean } = {}
  ): Promise<ApiResponse<EquipmentSummary[]>> {
    try {
      let query = supabase
        .from('equipment')
        .select(
          'id, organization_id, name, manufacturer, model, serial_number, status, team_id, location, image_url, working_hours, last_maintenance, last_known_location, team:team_id(id, name)'
        )
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (options.userTeamIds !== undefined && !options.isOrgAdmin) {
        if (options.userTeamIds.length === 0) {
          return handleSuccess([]);
        }
        query = query.in('team_id', options.userTeamIds);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching equipment summaries:', error);
        return handleError(error);
      }

      const flattened: EquipmentSummary[] = (data || []).map(row => ({
        id: row.id,
        organization_id: row.organization_id,
        name: row.name,
        manufacturer: row.manufacturer,
        model: row.model,
        serial_number: row.serial_number,
        status: row.status,
        team_id: row.team_id,
        location: row.location ?? null,
        image_url: row.image_url ?? null,
        working_hours: row.working_hours ?? null,
        last_maintenance: row.last_maintenance ?? null,
        last_known_location:
          row.last_known_location && typeof row.last_known_location === 'object' && !Array.isArray(row.last_known_location)
            ? (row.last_known_location as { name?: string })
            : null,
        team: row.team as { id: string; name: string } | null,
        team_name: (row.team as { name?: string } | null | undefined)?.name ?? undefined,
      }));

      return handleSuccess(flattened);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Get equipment by ID with organization validation
   */
  static async getById(
    organizationId: string,
    id: string
  ): Promise<ApiResponse<EquipmentWithTeam>> {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          *,
          team:team_id(
            id,
            name,
            description,
            location_address,
            location_city,
            location_state,
            location_country,
            location_lat,
            location_lng,
            override_equipment_location
          )
        `)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        logger.error('Error fetching equipment by ID:', error);
        return handleError(error);
      }

      if (!data) {
        return handleError(new Error('Equipment not found'));
      }

      const flattened: EquipmentWithTeam = {
        ...(data as EquipmentWithTeam),
        team_name: (data.team as { name?: string } | null | undefined)?.name ?? undefined,
      };

      return handleSuccess(flattened);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Create new equipment
   */
  static async create(
    organizationId: string,
    data: EquipmentCreateData
  ): Promise<ApiResponse<Equipment>> {
    try {
      // Validate required fields
      if (!data.name || !data.manufacturer || !data.model || !data.serial_number) {
        return handleError(new Error('Missing required fields'));
      }

      const { data: newEquipment, error } = await supabase
        .from('equipment')
        .insert({
          organization_id: organizationId,
          ...data
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating equipment:', error);
        return handleError(error);
      }

      return handleSuccess(newEquipment);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Create equipment with minimal data (quick creation during work order creation)
   * 
   * Auto-generates description and sets sensible defaults for optional fields.
   * Used when technicians create equipment inline while creating work orders.
   */
  static async createQuick(
    organizationId: string,
    data: QuickEquipmentCreateData
  ): Promise<ApiResponse<Equipment>> {
    try {
      // Validate required fields
      if (!data.manufacturer || !data.model || !data.serial_number || !data.team_id || !data.name) {
        return handleError(new Error('Missing required fields for quick equipment creation'));
      }

      // Auto-generate description
      const notes = `${data.manufacturer} ${data.model} - S/N: ${data.serial_number}\nCreated via quick entry during work order creation`;

      const { data: newEquipment, error } = await supabase
        .from('equipment')
        .insert({
          organization_id: organizationId,
          name: data.name,
          manufacturer: data.manufacturer,
          model: data.model,
          serial_number: data.serial_number,
          working_hours: data.working_hours ?? null,
          team_id: data.team_id,
          status: 'active',
          location: '', // Optional for quick creation - can be updated later
          notes: notes,
          installation_date: new Date().toISOString().split('T')[0], // Default to today for quick creation
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating equipment (quick):', error);
        return handleError(error);
      }

      return handleSuccess(newEquipment);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Update equipment
   */
  static async update(
    organizationId: string,
    id: string,
    data: EquipmentUpdateData
  ): Promise<ApiResponse<Equipment>> {
    try {
      const { data: updated, error } = await supabase
        .from('equipment')
        .update(data)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating equipment:', error);
        return handleError(error);
      }

      if (!updated) {
        return handleError(new Error('Equipment not found'));
      }

      return handleSuccess(updated);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Bulk update equipment rows. Uses partial-tolerant semantics: each row is
   * updated independently and per-row failures do not block the rest. Returns
   * separate `succeeded` and `failed` lists so the caller can surface partial-
   * success UX (e.g., a sonner warning toast with row counts).
   *
   * Single-row update path is identical to `update()` — same RLS policy, same
   * audit-log behavior, no new triggers. Used by the bulk-edit grid (#627).
   *
   * Concurrency is capped at `BATCH_UPDATE_CONCURRENCY` to avoid network
   * saturation and per-tenant rate limiting on large bulk saves; chunks run
   * sequentially while rows within a chunk run in parallel via
   * `Promise.allSettled`.
   */
  static async batchUpdate(
    organizationId: string,
    updates: Array<{ id: string; data: EquipmentUpdateData }>
  ): Promise<ApiResponse<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }>> {
    try {
      if (updates.length === 0) {
        return handleSuccess({ succeeded: [], failed: [] });
      }

      const succeeded: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (let chunkStart = 0; chunkStart < updates.length; chunkStart += BATCH_UPDATE_CONCURRENCY) {
        const chunk = updates.slice(chunkStart, chunkStart + BATCH_UPDATE_CONCURRENCY);
        const results = await Promise.allSettled(
          chunk.map(async ({ id, data }) => {
            const { data: rows, error } = await supabase
              .from('equipment')
              .update(data)
              .eq('id', id)
              .eq('organization_id', organizationId)
              .select('id');

            if (error) {
              return { id, error: error.message };
            }
            if (!rows || rows.length === 0) {
              // Either the id is wrong or the row belongs to a different org —
              // RLS hides the difference, so we surface a generic message.
              return { id, error: 'Equipment not found or access denied' };
            }
            return { id, error: null as string | null };
          })
        );

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === 'fulfilled') {
            const { id, error } = result.value;
            if (error) {
              failed.push({ id, error });
            } else {
              succeeded.push(id);
            }
          } else {
            // Unexpected promise rejection (network / runtime). Preserve the
            // original update payload's id so the caller can map back to the row.
            const id = chunk[i].id;
            const error = result.reason instanceof Error ? result.reason.message : 'Unknown error';
            failed.push({ id, error });
          }
        }
      }

      return handleSuccess({ succeeded, failed });
    } catch (error) {
      // Outer catch handles unexpected runtime errors (e.g. `supabase.from()`
      // throwing synchronously, malformed inputs that escape Promise.allSettled)
      // so callers always receive a normalized `ApiResponse` matching the rest
      // of this service — no caller has to handle a different failure shape.
      return handleError(error);
    }
  }

  /**
   * Delete equipment
   */
  static async delete(
    organizationId: string,
    id: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        logger.error('Error deleting equipment:', error);
        return handleError(error);
      }

      return handleSuccess(true);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Get status counts for equipment
   */
  static async getStatusCounts(
    organizationId: string
  ): Promise<ApiResponse<Record<Equipment['status'], number>>> {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('status')
        .eq('organization_id', organizationId);

      if (error) {
        logger.error('Error fetching equipment status counts:', error);
        return handleError(error);
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

      return handleSuccess(counts);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Get notes for equipment with author names (optimized JOIN)
   */
  static async getNotesByEquipmentId(
    organizationId: string,
    equipmentId: string
  ): Promise<ApiResponse<EquipmentNote[]>> {
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
        logger.error('Error fetching equipment notes:', error);
        return handleError(error);
      }

      const notes: EquipmentNote[] = (data || []).map(note => ({
        ...note,
        authorName: (note.author as { name?: string } | null | undefined)?.name || 'Unknown'
      }));

      return handleSuccess(notes);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Get scans for equipment with scanner names (optimized JOIN)
   */
  static async getScansByEquipmentId(
    organizationId: string,
    equipmentId: string
  ): Promise<ApiResponse<EquipmentScan[]>> {
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
        .eq('equipment.organization_id', organizationId)
        .order('scanned_at', { ascending: false });

      if (error) {
        logger.error('Error fetching equipment scans:', error);
        return handleError(error);
      }

      const scans: EquipmentScan[] = (data || []).map(scan => ({
        ...scan,
        scannedByName: (scan.scanned_by_profile as { name?: string } | null | undefined)?.name || 'Unknown'
      }));

      return handleSuccess(scans);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Get work orders for equipment with assignee names (optimized JOIN)
   */
  static async getWorkOrdersByEquipmentId(
    organizationId: string,
    equipmentId: string
  ): Promise<ApiResponse<EquipmentWorkOrder[]>> {
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
        .eq('organization_id', organizationId)
        .order('created_date', { ascending: false });

      if (error) {
        logger.error('Error fetching equipment work orders:', error);
        return handleError(error);
      }

      const workOrders: EquipmentWorkOrder[] = (data || []).map(wo => ({
        ...wo,
        assigneeName: (wo.assignee as { name?: string } | null | undefined)?.name,
        equipmentName: (wo.equipment as { name?: string } | null | undefined)?.name
      }));

      return handleSuccess(workOrders);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Get team-accessible equipment (for RBAC)
   */
  static async getTeamAccessibleEquipment(
    organizationId: string,
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
        .eq('organization_id', organizationId);

      // Organization admins can see all equipment
      if (!isOrgAdmin) {
        // Regular users can only see equipment assigned to their teams
        if (userTeamIds.length > 0) {
          query = query.in('team_id', userTeamIds);
        } else {
          // Users with no team memberships see no equipment
          return handleSuccess([]);
        }
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) {
        logger.error('Error fetching team-accessible equipment:', error);
        return handleError(error);
      }

      // Note: this query aliases the join as `teams` (not `team`); flatten
      // the same way so the convenience field is consistent.
      const flattened = (data || []).map(row => ({
        ...row,
        team_name: (row.teams as { name?: string } | null | undefined)?.name ?? undefined,
      }));

      return handleSuccess(flattened);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Get accessible equipment IDs (helper for work order filtering)
   */
  static async getAccessibleEquipmentIds(
    organizationId: string,
    userTeamIds: string[],
    isOrgAdmin: boolean = false
  ): Promise<ApiResponse<string[]>> {
    const result = await EquipmentService.getTeamAccessibleEquipment(organizationId, userTeamIds, isOrgAdmin);
    if (result.success && result.data) {
      return handleSuccess(result.data.map(eq => eq.id));
    }
    return handleSuccess([]);
  }

  /**
   * Create a scan record for equipment
   * Validates equipment belongs to the organization
   */
  static async createScan(
    organizationId: string,
    equipmentId: string,
    location?: string,
    notes?: string,
    options: {
      validateEquipment?: boolean;
      includeProfile?: boolean;
    } = {}
  ): Promise<ApiResponse<EquipmentScan>> {
    try {
      // Always derive user identity server-side; never trust caller-provided identity.
      const userId = (await getAuthClaims())?.sub;
      if (!userId) {
        return handleError(new Error('User not authenticated'));
      }

      if (options.validateEquipment !== false) {
        // Verify equipment belongs to this organization when the caller has not
        // already loaded the record through an org-scoped equipment query.
        const equipmentResult = await EquipmentService.getById(organizationId, equipmentId);
        if (!equipmentResult.success || !equipmentResult.data) {
          return handleError(new Error('Equipment not found or access denied'));
        }
      }

      // Create the scan
      const { data, error } = await supabase
        .from('scans')
        .insert({
          equipment_id: equipmentId,
          scanned_by: userId,
          location: location || null,
          notes: notes || null
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating scan:', error);
        return handleError(error);
      }

      if (options.includeProfile === false) {
        return handleSuccess(data);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', userId)
        .single();

      const scan: EquipmentScan = {
        ...data,
        scannedByName: profile?.name || 'Unknown'
      };

      return handleSuccess(scan);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Create a note for equipment
   * Validates equipment belongs to the organization
   */
  static async createNote(
    organizationId: string,
    equipmentId: string,
    content: string,
    isPrivate: boolean = false
  ): Promise<ApiResponse<EquipmentNote>> {
    try {
      // Get authenticated user
      const claims = await getAuthClaims();
      if (!claims) {
        return handleError(new Error('User not authenticated'));
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        return handleError(new Error('Note content is required'));
      }

      // Verify equipment belongs to this organization
      const equipmentResult = await EquipmentService.getById(organizationId, equipmentId);
      if (!equipmentResult.success || !equipmentResult.data) {
        return handleError(new Error('Equipment not found or access denied'));
      }

      // Create the note
      const { data, error } = await supabase
        .from('notes')
        .insert({
          equipment_id: equipmentId,
          content: content.trim(),
          author_id: claims.sub,
          is_private: isPrivate
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating note:', error);
        return handleError(error);
      }

      // Get author profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', claims.sub)
        .single();

      const note: EquipmentNote = {
        ...data,
        authorName: profile?.name || 'Unknown'
      };

      return handleSuccess(note);
    } catch (error) {
      return handleError(error);
    }
  }
}
