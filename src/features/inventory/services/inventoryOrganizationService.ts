import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface InventoryOrganizationInfo {
  inventoryItemId: string;
  organizationId: string;
  organizationName: string;
  userHasAccess: boolean;
  userRole?: string;
}

/**
 * Get organization information for an inventory item
 * Similar to getEquipmentOrganization but for inventory items
 */
export const getInventoryItemOrganization = async (
  inventoryItemId: string
): Promise<InventoryOrganizationInfo | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Get inventory item with organization info
    const { data: inventoryItem, error: itemError } = await supabase
      .from('inventory_items')
      .select(`
        id,
        organization_id,
        organizations!inner (
          id,
          name
        )
      `)
      .eq('id', inventoryItemId)
      .single();

    if (itemError || !inventoryItem) {
      logger.error('Error fetching inventory item:', itemError);
      return null;
    }

    const organization = inventoryItem.organizations as { id: string; name: string } | null;
    if (!organization) {
      return null;
    }

    // Check if user has access to this organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const userHasAccess = !membershipError && !!membership;

    return {
      inventoryItemId: inventoryItem.id,
      organizationId: organization.id,
      organizationName: organization.name,
      userHasAccess,
      userRole: membership?.role
    };
  } catch (error) {
    logger.error('Error in getInventoryItemOrganization:', error);
    return null;
  }
};

