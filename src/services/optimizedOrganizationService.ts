import { logger } from '../utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface OptimizedOrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  status: string;
  joined_date: string;
  user_name?: string;
  user_email?: string;
  slot_purchase_id?: string;
  activated_slot_at?: string;
}

// Get user's organizations using idx_organization_members_user_status
export interface OptimizedOrganization {
  id: string;
  name: string;
  plan: string;
  member_count: number;
  max_members: number;
  features: unknown;
  created_at: string;
  updated_at: string;
  user_role: string;
  joined_date: string;
}

// Get user's organizations using idx_organization_members_user_status
export const getUserOrganizationsOptimized = async (userId: string): Promise<OptimizedOrganization[]> => {
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

// Get organization members using organization_id index
export const getOrganizationMembersOptimized = async (organizationId: string): Promise<OptimizedOrganizationMember[]> => {
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

// Get organization admins efficiently
export const getOrganizationAdminsOptimized = async (organizationId: string): Promise<OptimizedOrganizationMember[]> => {
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

// Check user permissions efficiently using idx_organization_members_user_status
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

// Organization update payload type
export interface OrganizationUpdatePayload {
  name?: string;
  logo?: string | null;
  background_color?: string | null;
}

// Update organization information
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

// Get organization by ID
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