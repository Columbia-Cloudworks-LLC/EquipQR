import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { getAuthClaims } from '@/lib/authClaims';
import { resolveOrganizationAccess } from '@/features/organization/services/organizationMembershipAccess';

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
    const claims = await getAuthClaims();
    if (!claims) {
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

    const access = await resolveOrganizationAccess(inventoryItem, claims.sub);
    if (!access) {
      return null;
    }

    return {
      inventoryItemId: inventoryItem.id,
      ...access,
    };
  } catch (error) {
    logger.error('Error in getInventoryItemOrganization:', error);
    return null;
  }
};

