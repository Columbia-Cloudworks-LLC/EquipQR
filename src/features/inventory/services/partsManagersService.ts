/**
 * Parts Managers Service
 * 
 * Handles CRUD operations for organization-level parts managers.
 * Parts managers can edit all inventory items in their organization.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * PartsManager - Represents a user who can manage inventory for an organization.
 */
export interface PartsManager {
  organization_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
  // Joined fields
  userName?: string;
  userEmail?: string;
  assignedByName?: string;
}

/**
 * Fetches all parts managers for an organization.
 */
export const getPartsManagers = async (
  organizationId: string
): Promise<PartsManager[]> => {
  try {
    const { data, error } = await supabase
      .from('parts_managers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('assigned_at', { ascending: false });

    if (error) {
      logger.error('Error fetching parts managers:', error);
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Fetch user details for the managers
    const userIds = data.map(pm => pm.user_id);
    const assignerIds = data
      .filter(pm => pm.assigned_by)
      .map(pm => pm.assigned_by as string);
    
    const allUserIds = [...new Set([...userIds, ...assignerIds])];

    // Get profiles for all users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', allUserIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, { name: p.name, email: p.email }])
    );

    return data.map(pm => ({
      ...pm,
      userName: profileMap.get(pm.user_id)?.name || 'Unknown',
      userEmail: profileMap.get(pm.user_id)?.email || '',
      assignedByName: pm.assigned_by 
        ? profileMap.get(pm.assigned_by)?.name || 'Unknown'
        : undefined,
    }));
  } catch (error) {
    logger.error('Error in getPartsManagers:', error);
    throw error;
  }
};

/**
 * Checks if a user is a parts manager for an organization.
 */
export const isUserPartsManager = async (
  organizationId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('parts_managers')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error checking parts manager status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('Error in isUserPartsManager:', error);
    return false;
  }
};

/**
 * Adds a user as a parts manager for an organization.
 */
export const addPartsManager = async (
  organizationId: string,
  userId: string,
  assignedBy: string
): Promise<PartsManager> => {
  try {
    const { data, error } = await supabase
      .from('parts_managers')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        assigned_by: assignedBy,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error adding parts manager:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    logger.error('Error in addPartsManager:', error);
    throw error;
  }
};

/**
 * Removes a user as a parts manager for an organization.
 */
export const removePartsManager = async (
  organizationId: string,
  userId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('parts_managers')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error removing parts manager:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    logger.error('Error in removePartsManager:', error);
    throw error;
  }
};
