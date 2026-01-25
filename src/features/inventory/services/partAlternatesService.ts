import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { 
  AlternatePartResult, 
  MakeModelCompatiblePart,
  PartAlternateGroup,
  PartIdentifier,
  PartIdentifierType,
  VerificationStatus
} from '@/features/inventory/types/inventory';

// ============================================
// Lookup Alternates by Part Number
// ============================================

/**
 * Determines if an error represents a request cancellation/abort.
 * Only treats errors as cancellations when a signal was provided (to avoid false positives).
 * 
 * @param error - The error to check (Error instance or plain object)
 * @param signal - Optional AbortSignal that was used for the request
 * @returns true if the error represents a cancellation
 */
function isCancellation(error: unknown, signal?: AbortSignal): boolean {
  // If signal was aborted, it's definitely a cancellation
  if (signal?.aborted) {
    return true;
  }

  // If no signal was provided, don't treat any error as a cancellation
  // (to avoid silently swallowing real errors)
  if (!signal) {
    return false;
  }

  // Extract error name and message
  const name = typeof error === 'object' && error !== null && 'name' in error
    ? (error as { name?: unknown }).name
    : error instanceof Error
      ? error.name
      : undefined;

  const msg = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : error instanceof Error
      ? (error.message ?? '')
      : '';

  const lower = msg.toLowerCase();

  // Check for well-known cancellation types
  // Only check message substrings when signal is present (to avoid false positives)
  return (
    name === 'AbortError' ||
    lower.includes('abort') ||
    lower.includes('cancel')
  );
}

/**
 * Look up alternate/interchangeable parts by part number.
 * Searches part_identifiers and inventory_items (by SKU/external_id),
 * then returns all members of matching alternate groups with stock info.
 * 
 * @param organizationId - Organization ID for access control
 * @param partNumber - Part number to search for
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Array of alternate parts with inventory and group info
 */
export const getAlternatesForPartNumber = async (
  organizationId: string,
  partNumber: string,
  signal?: AbortSignal
): Promise<AlternatePartResult[]> => {
  try {
    if (!partNumber.trim()) {
      return [];
    }

    // Check if already aborted before making request
    if (signal?.aborted) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_alternates_for_part_number', {
      p_organization_id: organizationId,
      p_part_number: partNumber.trim()
    }, { signal });

    // If request was aborted, return empty result silently
    if (signal?.aborted) {
      return [];
    }

    if (error) {
      // Handle permission errors
      if (error.code === '42501') {
        throw new Error('Access denied');
      }
      // Silently ignore abort errors (request cancelled due to new search)
      // Only treat as cancellation if signal was provided
      if (isCancellation(error, signal)) {
        return [];
      }
      throw error;
    }

    return (data || []) as AlternatePartResult[];
  } catch (error) {
    // Silently handle abort/cancellation errors - these are expected when user types fast.
    // Only treat as cancellation if signal was provided (to avoid silently swallowing real errors)
    if (isCancellation(error, signal)) {
      return [];
    }
    // Only log actual errors, not cancellations
    logger.error('Error looking up alternates for part number:', error);
    throw error;
  }
};

// ============================================
// Lookup Alternates for Inventory Item
// ============================================

/**
 * Get all alternate parts for a given inventory item.
 * 
 * @param organizationId - Organization ID for access control
 * @param inventoryItemId - Inventory item to find alternates for
 * @returns Array of alternate parts
 */
export const getAlternatesForInventoryItem = async (
  organizationId: string,
  inventoryItemId: string
): Promise<AlternatePartResult[]> => {
  try {
    const { data, error } = await supabase.rpc('get_alternates_for_inventory_item', {
      p_organization_id: organizationId,
      p_inventory_item_id: inventoryItemId
    });

    if (error) {
      if (error.code === '42501') {
        throw new Error('Access denied');
      }
      throw error;
    }

    return (data || []) as AlternatePartResult[];
  } catch (error) {
    logger.error('Error looking up alternates for inventory item:', error);
    throw error;
  }
};

// ============================================
// Lookup Compatible Parts by Make/Model
// ============================================

/**
 * Get compatible parts for a given manufacturer and optional model.
 * Does NOT require an equipment record - works with ad-hoc lookups.
 * 
 * @param organizationId - Organization ID for access control
 * @param manufacturer - Equipment manufacturer
 * @param model - Optional equipment model
 * @returns Array of compatible parts from rule-based matching
 */
export const getCompatiblePartsForMakeModel = async (
  organizationId: string,
  manufacturer: string,
  model?: string
): Promise<MakeModelCompatiblePart[]> => {
  try {
    if (!manufacturer.trim()) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_compatible_parts_for_make_model', {
      p_organization_id: organizationId,
      p_manufacturer: manufacturer.trim(),
      p_model: model?.trim() || null
    });

    if (error) {
      if (error.code === '42501') {
        throw new Error('Access denied');
      }
      throw error;
    }

    return (data || []) as MakeModelCompatiblePart[];
  } catch (error) {
    logger.error('Error looking up compatible parts for make/model:', error);
    throw error;
  }
};

// ============================================
// Alternate Group Management
// ============================================

/**
 * Create a new alternate group.
 */
export const createAlternateGroup = async (
  organizationId: string,
  data: {
    name: string;
    description?: string;
    status?: VerificationStatus;
    notes?: string;
    evidence_url?: string;
  }
): Promise<PartAlternateGroup> => {
  try {
    const { data: group, error } = await supabase
      .from('part_alternate_groups')
      .insert({
        organization_id: organizationId,
        name: data.name,
        description: data.description || null,
        status: data.status || 'unverified',
        notes: data.notes || null,
        evidence_url: data.evidence_url || null,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return group as PartAlternateGroup;
  } catch (error) {
    logger.error('Error creating alternate group:', error);
    throw error;
  }
};

/**
 * Type definitions for joined data from Supabase queries
 */
interface PartIdentifierJoin {
  identifier_type?: string;
  raw_value?: string;
  manufacturer?: string;
}

interface InventoryItemJoin {
  name?: string;
  sku?: string;
  quantity_on_hand?: number;
}

interface PartGroupMemberRow {
  id: string;
  group_id: string;
  part_identifier_id: string | null;
  inventory_item_id: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  part_identifiers: PartIdentifierJoin | null;
  inventory_items: InventoryItemJoin | null;
}

/**
 * Member of an alternate group with full details.
 */
export interface AlternateGroupMember {
  id: string;
  group_id: string;
  part_identifier_id: string | null;
  inventory_item_id: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  // Joined from part_identifiers
  identifier_type?: PartIdentifierType | null;
  identifier_value?: string | null;
  identifier_manufacturer?: string | null;
  // Joined from inventory_items
  inventory_name?: string | null;
  inventory_sku?: string | null;
  quantity_on_hand?: number;
}

/**
 * Alternate group with its members.
 */
export interface AlternateGroupWithMembers extends PartAlternateGroup {
  members: AlternateGroupMember[];
}

/**
 * Get an alternate group by ID with its members.
 */
export const getAlternateGroupById = async (
  organizationId: string,
  groupId: string
): Promise<AlternateGroupWithMembers | null> => {
  try {
    // Get the group
    const { data: group, error: groupError } = await supabase
      .from('part_alternate_groups')
      .select('*')
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .single();

    if (groupError) {
      if (groupError.code === 'PGRST116') return null; // Not found
      throw groupError;
    }

    // Get members with joined data
    const { data: members, error: membersError } = await supabase
      .from('part_alternate_group_members')
      .select(`
        id,
        group_id,
        part_identifier_id,
        inventory_item_id,
        is_primary,
        notes,
        created_at,
        part_identifiers (
          identifier_type,
          raw_value,
          manufacturer
        ),
        inventory_items (
          name,
          sku,
          quantity_on_hand
        )
      `)
      .eq('group_id', groupId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (membersError) throw membersError;

    // Transform members to flat structure
    const transformedMembers: AlternateGroupMember[] = (members as PartGroupMemberRow[] || []).map((m) => {
      const partIdent: PartIdentifierJoin | null = m.part_identifiers;
      const invItem: InventoryItemJoin | null = m.inventory_items;
      
      return {
        id: m.id,
        group_id: m.group_id,
        part_identifier_id: m.part_identifier_id,
        inventory_item_id: m.inventory_item_id,
        is_primary: m.is_primary,
        notes: m.notes,
        created_at: m.created_at,
        identifier_type: (partIdent?.identifier_type as PartIdentifierType | undefined) || null,
        identifier_value: partIdent?.raw_value || null,
        identifier_manufacturer: partIdent?.manufacturer || null,
        inventory_name: invItem?.name || null,
        inventory_sku: invItem?.sku || null,
        quantity_on_hand: invItem?.quantity_on_hand ?? 0,
      };
    });

    return {
      ...(group as PartAlternateGroup),
      members: transformedMembers,
    };
  } catch (error) {
    logger.error('Error fetching alternate group:', error);
    throw error;
  }
};

/**
 * Update an alternate group.
 */
export const updateAlternateGroup = async (
  organizationId: string,
  groupId: string,
  data: Partial<{
    name: string;
    description: string;
    status: VerificationStatus;
    notes: string;
    evidence_url: string;
  }>
): Promise<PartAlternateGroup> => {
  try {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.status !== undefined) {
      updateData.status = data.status;
      // If marking as verified, set verified_by and verified_at
      if (data.status === 'verified') {
        updateData.verified_by = (await supabase.auth.getUser()).data.user?.id;
        updateData.verified_at = new Date().toISOString();
      }
    }
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.evidence_url !== undefined) updateData.evidence_url = data.evidence_url || null;

    const { data: group, error } = await supabase
      .from('part_alternate_groups')
      .update(updateData)
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return group as PartAlternateGroup;
  } catch (error) {
    logger.error('Error updating alternate group:', error);
    throw error;
  }
};

/**
 * Delete an alternate group.
 */
export const deleteAlternateGroup = async (
  organizationId: string,
  groupId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('part_alternate_groups')
      .delete()
      .eq('id', groupId)
      .eq('organization_id', organizationId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error deleting alternate group:', error);
    throw error;
  }
};

/**
 * Remove a member from an alternate group.
 */
export const removeGroupMember = async (memberId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('part_alternate_group_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error removing group member:', error);
    throw error;
  }
};

/**
 * Get all alternate groups for an organization.
 */
export const getAlternateGroups = async (
  organizationId: string
): Promise<PartAlternateGroup[]> => {
  try {
    const { data, error } = await supabase
      .from('part_alternate_groups')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) throw error;
    return (data || []) as PartAlternateGroup[];
  } catch (error) {
    logger.error('Error fetching alternate groups:', error);
    throw error;
  }
};

/**
 * Add a part identifier to an alternate group.
 */
export const addIdentifierToGroup = async (
  groupId: string,
  identifierId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('part_alternate_group_members')
      .insert({
        group_id: groupId,
        part_identifier_id: identifierId
      });

    if (error && error.code !== '23505') throw error;
  } catch (error) {
    logger.error('Error adding identifier to group:', error);
    throw error;
  }
};

/**
 * Add an inventory item directly to an alternate group.
 */
export const addInventoryItemToGroup = async (
  groupId: string,
  inventoryItemId: string,
  isPrimary: boolean = false
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('part_alternate_group_members')
      .insert({
        group_id: groupId,
        inventory_item_id: inventoryItemId,
        is_primary: isPrimary
      });

    if (error && error.code !== '23505') throw error;
  } catch (error) {
    logger.error('Error adding inventory item to group:', error);
    throw error;
  }
};

// ============================================
// Part Identifier Management
// ============================================

/**
 * Create a new part identifier.
 */
export const createPartIdentifier = async (
  organizationId: string,
  data: {
    identifier_type: PartIdentifierType;
    raw_value: string;
    manufacturer?: string;
    inventory_item_id?: string;
    notes?: string;
  }
): Promise<PartIdentifier> => {
  try {
    const { data: identifier, error } = await supabase
      .from('part_identifiers')
      .insert({
        organization_id: organizationId,
        identifier_type: data.identifier_type,
        raw_value: data.raw_value.trim(),
        norm_value: data.raw_value.trim().toLowerCase(),
        manufacturer: data.manufacturer || null,
        inventory_item_id: data.inventory_item_id || null,
        notes: data.notes || null,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('This part number already exists');
      }
      throw error;
    }
    return identifier as PartIdentifier;
  } catch (error) {
    logger.error('Error creating part identifier:', error);
    throw error;
  }
};

/**
 * Search for part identifiers by value.
 */
export const searchPartIdentifiers = async (
  organizationId: string,
  searchTerm: string
): Promise<PartIdentifier[]> => {
  try {
    const normValue = searchTerm.trim().toLowerCase();
    if (!normValue) return [];

    const { data, error } = await supabase
      .from('part_identifiers')
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('norm_value', `%${normValue}%`)
      .order('raw_value')
      .limit(50);

    if (error) throw error;
    return (data || []) as PartIdentifier[];
  } catch (error) {
    logger.error('Error searching part identifiers:', error);
    throw error;
  }
};
