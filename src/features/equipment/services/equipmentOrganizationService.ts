import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { getAuthClaims } from '@/lib/authClaims';

export interface EquipmentOrganizationInfo {
  equipmentId: string;
  organizationId: string;
  organizationName: string;
  userHasAccess: boolean;
  userRole?: string;
}

/**
 * Fetches equipment organization information without requiring current organization context
 */
export const getEquipmentOrganization = async (
  equipmentId: string,
  userId?: string
): Promise<EquipmentOrganizationInfo | null> => {
  try {
    logger.info('🔍 Fetching equipment organization for:', equipmentId);
    
    // Get equipment with organization info
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select(`
        id,
        organization_id,
        organizations!inner(
          id,
          name
        )
      `)
      .eq('id', equipmentId)
      .single();

    if (equipmentError) {
      logger.error('❌ Error fetching equipment:', equipmentError);
      return null;
    }

    if (!equipment) {
      logger.info('⚠️ Equipment not found:', equipmentId);
      return null;
    }

    // Check if current user has access to this organization
    const currentUserId = userId ?? (await getAuthClaims())?.sub;
    if (!currentUserId) {
      logger.info('❌ No authenticated user');
      return null;
    }

    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', equipment.organization_id)
      .eq('user_id', currentUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError) {
      logger.error('❌ Error checking organization membership:', membershipError);
    }

    const result: EquipmentOrganizationInfo = {
      equipmentId: equipment.id,
      organizationId: equipment.organization_id,
      organizationName: equipment.organizations.name,
      userHasAccess: !!membership,
      userRole: membership?.role
    };

    logger.info('✅ Equipment organization info:', result);
    return result;

  } catch (error) {
    logger.error('❌ Unexpected error in getEquipmentOrganization:', error);
    return null;
  }
};

/**
 * Checks if user has access to multiple organizations
 */
export const checkUserHasMultipleOrganizations = async (userId?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from('organization_members')
      .select('organization_id')
      .eq('status', 'active');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: memberships, error } = await query;

    if (error) {
      logger.error('❌ Error checking user organizations:', error);
      return false;
    }

    return (memberships?.length || 0) > 1;
  } catch (error) {
    logger.error('❌ Unexpected error checking multiple organizations:', error);
    return false;
  }
};