/**
 * Organization Service - Canonical service for organization operations
 * 
 * This file consolidates organization-related operations from various sources.
 * Import from here instead of using optimizedOrganizationService.
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { 
  OrganizationMemberRecord,
  OrganizationWithMembership,
  OrganizationUpdatePayload
} from '@/features/organization/types/organization';
import {
  uploadImageToStorage,
  deleteImageFromStorage,
  generateSingleFilePath,
  validateImageFile,
} from '@/services/imageUploadService';

// Re-export types for backward compatibility
export type { 
  OrganizationMemberRecord as OptimizedOrganizationMember,
  OrganizationWithMembership as OptimizedOrganization,
  OrganizationUpdatePayload
};

// ============================================
// Organization Query Functions
// ============================================

/**
 * Get organization by ID
 */
export const getOrganizationById = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching organization:', error);
    return null;
  }
};

/**
 * Get user's organizations using idx_organization_members_user_status
 */
export const getUserOrganizations = async (userId: string): Promise<OrganizationWithMembership[]> => {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        organizations!inner (
          id,
          name,
          plan,
          member_count,
          max_members,
          features,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('joined_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(om => ({
      id: om.organizations.id,
      name: om.organizations.name,
      plan: om.organizations.plan,
      member_count: om.organizations.member_count,
      max_members: om.organizations.max_members,
      features: om.organizations.features,
      created_at: om.organizations.created_at,
      updated_at: om.organizations.updated_at,
      user_role: om.role,
      joined_date: om.joined_date
    }));
  } catch (error) {
    logger.error('Error fetching user organizations:', error);
    return [];
  }
};

/**
 * @deprecated Use getUserOrganizations instead
 */
export const getUserOrganizationsOptimized = getUserOrganizations;

// ============================================
// Organization Member Functions
// ============================================

/**
 * Get organization members using organization_id index
 */
export const getOrganizationMembers = async (organizationId: string): Promise<OrganizationMemberRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profiles!organization_members_user_id_fkey (
          name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('joined_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(member => ({
      id: member.id,
      user_id: member.user_id,
      organization_id: member.organization_id,
      role: member.role,
      status: member.status,
      joined_date: member.joined_date,
      user_name: member.profiles?.name,
      user_email: member.profiles?.email,
      slot_purchase_id: member.slot_purchase_id,
      activated_slot_at: member.activated_slot_at
    }));
  } catch (error) {
    logger.error('Error fetching organization members:', error);
    return [];
  }
};

/**
 * @deprecated Use getOrganizationMembers instead
 */
export const getOrganizationMembersOptimized = getOrganizationMembers;

/**
 * Get organization admins efficiently
 */
export const getOrganizationAdmins = async (organizationId: string): Promise<OrganizationMemberRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profiles!organization_members_user_id_fkey (
          name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .order('role', { ascending: true });

    if (error) throw error;

    return (data || []).map(member => ({
      id: member.id,
      user_id: member.user_id,
      organization_id: member.organization_id,
      role: member.role,
      status: member.status,
      joined_date: member.joined_date,
      user_name: member.profiles?.name,
      user_email: member.profiles?.email,
      slot_purchase_id: member.slot_purchase_id,
      activated_slot_at: member.activated_slot_at
    }));
  } catch (error) {
    logger.error('Error fetching organization admins:', error);
    return [];
  }
};

/**
 * @deprecated Use getOrganizationAdmins instead
 */
export const getOrganizationAdminsOptimized = getOrganizationAdmins;

// ============================================
// Organization Permission Functions
// ============================================

/**
 * Check user permissions efficiently using idx_organization_members_user_status
 */
export const checkUserOrgAccess = async (userId: string, organizationId: string): Promise<{ hasAccess: boolean; role?: string }> => {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return {
      hasAccess: !!data,
      role: data?.role
    };
  } catch (error) {
    logger.error('Error checking user organization access:', error);
    return { hasAccess: false };
  }
};

// ============================================
// Organization Update Functions
// ============================================

/**
 * Update organization information
 */
export const updateOrganization = async (organizationId: string, updates: OrganizationUpdatePayload): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error updating organization:', error, { organizationId, updates });
    return false;
  }
};

// ============================================
// Organization Logo Functions
// ============================================

/**
 * Upload an organization logo to Supabase Storage and update the organizations table.
 * Returns the public URL of the uploaded logo.
 */
export const uploadOrganizationLogo = async (
  organizationId: string,
  file: File
): Promise<string> => {
  validateImageFile(file, 5);

  const filePath = generateSingleFilePath(organizationId, 'logo', file);
  const publicUrl = await uploadImageToStorage(
    'organization-logos',
    filePath,
    file,
    { upsert: true }
  );

  // Update the organizations table with the new logo URL
  const { error } = await supabase
    .from('organizations')
    .update({ logo: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (error) {
    logger.error('Error updating organization logo in DB:', error);
    throw new Error('Failed to save logo');
  }

  return publicUrl;
};

/**
 * Delete the organization logo from storage and clear the column.
 */
export const deleteOrganizationLogo = async (
  organizationId: string,
  currentLogoUrl: string
): Promise<void> => {
  // Remove from storage (best-effort)
  await deleteImageFromStorage('organization-logos', currentLogoUrl);

  // Clear the logo column
  const { error } = await supabase
    .from('organizations')
    .update({ logo: null, updated_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (error) {
    logger.error('Error clearing organization logo:', error);
    throw new Error('Failed to remove logo');
  }
};


