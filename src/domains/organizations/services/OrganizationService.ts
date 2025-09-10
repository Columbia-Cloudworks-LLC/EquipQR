/**
 * Consolidated Organization Service
 * Merges multiple organization services into a unified service
 * Follows SOLID principles with dependency injection and single responsibility
 */

import { BaseService } from '@/shared/base/BaseService';
import { BaseRepository } from '@/shared/base/BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import { 
  Organization, 
  EnhancedOrganization,
  CreateOrganizationData, 
  UpdateOrganizationData,
  OrganizationFilters,
  OrganizationStats,
  OrganizationMember,
  OrganizationInvitation,
  CreateInvitationData,
  UpdateMemberData,
  OrganizationBulkUpdateData,
  OrganizationSearchResult,
  OrganizationUsageAnalytics,
  OrganizationBilling,
  OrganizationLimits,
  ActivityItem,
  ActivityType
} from '../types/Organization';
import { ApiResponse, FilterParams, PaginationParams } from '@/shared/types/common';
import { ORGANIZATIONS } from '@/shared/constants';

/**
 * Organization Repository
 */
class OrganizationRepository extends BaseRepository<Organization, CreateOrganizationData, UpdateOrganizationData> {
  protected tableName = ORGANIZATIONS;

  constructor() {
    super(supabase);
  }

  /**
   * Get organization with enhanced data (members, stats, etc.)
   */
  async getEnhancedOrganization(organizationId: string): Promise<EnhancedOrganization | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        members:organization_members (
          *,
          profiles:user_id (
            name,
            email
          )
        ),
        invitations:organization_invitations (
          *,
          profiles:invited_by (
            name
          )
        )
      `)
      .eq('id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data) return null;

    // Get organization stats
    const stats = await this.getOrganizationStats(organizationId);
    
    // Get recent activity
    const recentActivity = await this.getRecentActivity(organizationId);

    return {
      ...data,
      stats: stats.data,
      recent_activity: recentActivity.data || [],
      member_count: data.members?.length || 0,
      is_trial: data.trial_ends_at ? new Date(data.trial_ends_at) > new Date() : false,
      is_active: data.status === 'active'
    };
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: string): Promise<ApiResponse<OrganizationStats>> {
    try {
      // Get member stats
      const { data: members, error: membersError } = await this.supabase
        .from('organization_members')
        .select('role, status')
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      // Get equipment stats
      const { data: equipment, error: equipmentError } = await this.supabase
        .from('equipment')
        .select('status')
        .eq('organization_id', organizationId);

      if (equipmentError) throw equipmentError;

      // Get work order stats
      const { data: workOrders, error: workOrdersError } = await this.supabase
        .from('work_orders')
        .select('status, created_date, completed_date')
        .eq('organization_id', organizationId);

      if (workOrdersError) throw workOrdersError;

      // Get storage usage
      const { data: storage, error: storageError } = await this.supabase
        .from('equipment_images')
        .select('file_size')
        .eq('organization_id', organizationId);

      if (storageError) throw storageError;

      // Calculate stats
      const memberStats = (members || []).reduce((acc, member) => {
        acc.by_role[member.role] = (acc.by_role[member.role] || 0) + 1;
        acc.by_status[member.status] = (acc.by_status[member.status] || 0) + 1;
        if (member.status === 'active') acc.active_members += 1;
        return acc;
      }, {
        total_members: members?.length || 0,
        active_members: 0,
        by_role: {} as Record<string, number>,
        by_status: {} as Record<string, number>
      });

      const equipmentStats = (equipment || []).reduce((acc, eq) => {
        acc.total_equipment += 1;
        if (eq.status === 'active') acc.active_equipment += 1;
        return acc;
      }, {
        total_equipment: 0,
        active_equipment: 0
      });

      const workOrderStats = (workOrders || []).reduce((acc, wo) => {
        acc.total_work_orders += 1;
        if (wo.status === 'completed') acc.completed_work_orders += 1;
        if (wo.status === 'overdue') acc.overdue_work_orders += 1;
        return acc;
      }, {
        total_work_orders: 0,
        completed_work_orders: 0,
        overdue_work_orders: 0
      });

      const storageUsed = (storage || []).reduce((total, img) => total + (img.file_size || 0), 0);
      const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB default

      const stats: OrganizationStats = {
        ...memberStats,
        ...equipmentStats,
        ...workOrderStats,
        pending_invitations: 0, // Will be calculated separately
        storage_used_bytes: storageUsed,
        storage_limit_bytes: storageLimit,
        storage_usage_percentage: (storageUsed / storageLimit) * 100,
        monthly_work_orders: 0, // Will be calculated separately
        monthly_equipment_added: 0, // Will be calculated separately
        avg_work_order_completion_time: 0 // Will be calculated separately
      };

      return {
        data: stats,
        error: null,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get organization stats',
        success: false
      };
    }
  }

  /**
   * Get recent activity for organization
   */
  async getRecentActivity(organizationId: string, limit: number = 10): Promise<ApiResponse<ActivityItem[]>> {
    try {
      // This would typically come from an activity log table
      // For now, we'll return a placeholder
      const activities: ActivityItem[] = [];
      
      return {
        data: activities,
        error: null,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get recent activity',
        success: false
      };
    }
  }

  /**
   * Search organizations
   */
  async searchOrganizations(searchTerm: string): Promise<OrganizationSearchResult[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(org => {
      const matchedFields: string[] = [];
      let relevanceScore = 0;

      if (org.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedFields.push('name');
        relevanceScore += 10;
      }
      if (org.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedFields.push('description');
        relevanceScore += 5;
      }
      if (org.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchedFields.push('email');
        relevanceScore += 8;
      }

      return {
        ...org,
        relevance_score: relevanceScore,
        matched_fields: matchedFields
      };
    }).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }
}

/**
 * Organization Service
 */
export class OrganizationService extends BaseService {
  private repository: OrganizationRepository;

  constructor(organizationId: string) {
    super(organizationId);
    this.repository = new OrganizationRepository();
  }

  /**
   * Get organization by ID with full details
   */
  async getOrganizationById(organizationId: string): Promise<ApiResponse<EnhancedOrganization | null>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getOrganizationById', { organizationId });
      const startTime = Date.now();

      const organization = await this.repository.getEnhancedOrganization(organizationId);
      
      this.logOperationComplete('getOrganizationById', Date.now() - startTime, { organizationId });
      return organization;
    }, 'get organization by ID');
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: string): Promise<ApiResponse<OrganizationStats>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getOrganizationStats', { organizationId });
      const startTime = Date.now();

      const stats = await this.repository.getOrganizationStats(organizationId);
      
      this.logOperationComplete('getOrganizationStats', Date.now() - startTime, { organizationId });
      return stats.data;
    }, 'get organization statistics');
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId: string, data: UpdateOrganizationData): Promise<ApiResponse<Organization>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('updateOrganization', { organizationId });
      const startTime = Date.now();

      const organization = await this.repository.update(organizationId, data);
      
      this.logOperationComplete('updateOrganization', Date.now() - startTime, { organizationId });
      return organization;
    }, 'update organization');
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string): Promise<ApiResponse<OrganizationMember[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getOrganizationMembers', { organizationId });
      const startTime = Date.now();

      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          *,
          profiles:user_id (
            name,
            email
          ),
          invited_by_profile:profiles!organization_members_invited_by_fkey (
            name
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const members = (data || []).map(member => ({
        ...member,
        user_name: member.profiles?.name,
        user_email: member.profiles?.email,
        invited_by_name: member.invited_by_profile?.name,
        is_online: false, // This would be determined by checking active sessions
        days_since_last_active: member.last_active_at ? 
          Math.ceil((Date.now() - new Date(member.last_active_at).getTime()) / (1000 * 60 * 60 * 24)) : 
          undefined
      }));
      
      this.logOperationComplete('getOrganizationMembers', Date.now() - startTime, { 
        organizationId, 
        count: members.length 
      });
      return members;
    }, 'get organization members');
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string, 
    memberId: string, 
    role: string, 
    updatedBy: string
  ): Promise<ApiResponse<OrganizationMember>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('updateMemberRole', { organizationId, memberId, role });
      const startTime = Date.now();

      const { data, error } = await this.supabase
        .from('organization_members')
        .update({ 
          role, 
          updated_at: new Date().toISOString(),
          updated_by: updatedBy
        })
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .single();

      if (error) throw error;

      const member = {
        ...data,
        user_name: data.profiles?.name,
        user_email: data.profiles?.email
      };
      
      this.logOperationComplete('updateMemberRole', Date.now() - startTime, { 
        organizationId, 
        memberId, 
        role 
      });
      return member;
    }, 'update member role');
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, memberId: string, removedBy: string): Promise<ApiResponse<void>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('removeMember', { organizationId, memberId });
      const startTime = Date.now();

      const { error } = await this.supabase
        .from('organization_members')
        .update({ 
          status: 'left',
          updated_at: new Date().toISOString(),
          updated_by: removedBy
        })
        .eq('id', memberId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      
      this.logOperationComplete('removeMember', Date.now() - startTime, { 
        organizationId, 
        memberId 
      });
    }, 'remove member');
  }

  /**
   * Get organization invitations
   */
  async getOrganizationInvitations(organizationId: string): Promise<ApiResponse<OrganizationInvitation[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getOrganizationInvitations', { organizationId });
      const startTime = Date.now();

      const { data, error } = await this.supabase
        .from('organization_invitations')
        .select(`
          *,
          profiles:invited_by (
            name
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const invitations = (data || []).map(invitation => {
        const isExpired = new Date(invitation.expires_at) < new Date();
        const daysUntilExpiry = Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        return {
          ...invitation,
          invited_by_name: invitation.profiles?.name,
          is_expired: isExpired,
          days_until_expiry: daysUntilExpiry
        };
      });
      
      this.logOperationComplete('getOrganizationInvitations', Date.now() - startTime, { 
        organizationId, 
        count: invitations.length 
      });
      return invitations;
    }, 'get organization invitations');
  }

  /**
   * Create organization invitation
   */
  async createInvitation(
    organizationId: string, 
    data: CreateInvitationData, 
    invitedBy: string
  ): Promise<ApiResponse<OrganizationInvitation>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('createInvitation', { organizationId, email: data.email });
      const startTime = Date.now();

      // Check if user already exists
      const { data: existingUser } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        // Check if user is already a member
        const { data: existingMember } = await this.supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('user_id', existingUser.id)
          .single();

        if (existingMember) {
          throw new Error('User is already a member of this organization');
        }
      }

      // Generate invitation token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (data.expires_in_days || 7));

      const invitationData = {
        organization_id: organizationId,
        email: data.email,
        role: data.role,
        status: 'pending',
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString(),
        token,
        message: data.message,
        ...this.getOrganizationContext()
      };

      const { data: invitation, error } = await this.supabase
        .from('organization_invitations')
        .insert(invitationData)
        .select(`
          *,
          profiles:invited_by (
            name
          )
        `)
        .single();

      if (error) throw error;

      const result = {
        ...invitation,
        invited_by_name: invitation.profiles?.name,
        is_expired: false,
        days_until_expiry: data.expires_in_days || 7
      };
      
      this.logOperationComplete('createInvitation', Date.now() - startTime, { 
        organizationId, 
        email: data.email 
      });
      return result;
    }, 'create invitation');
  }

  /**
   * Cancel organization invitation
   */
  async cancelInvitation(organizationId: string, invitationId: string): Promise<ApiResponse<void>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('cancelInvitation', { organizationId, invitationId });
      const startTime = Date.now();

      const { error } = await this.supabase
        .from('organization_invitations')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      
      this.logOperationComplete('cancelInvitation', Date.now() - startTime, { 
        organizationId, 
        invitationId 
      });
    }, 'cancel invitation');
  }

  /**
   * Search organizations
   */
  async searchOrganizations(searchTerm: string): Promise<ApiResponse<OrganizationSearchResult[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('searchOrganizations', { searchTerm });
      const startTime = Date.now();

      const results = await this.repository.searchOrganizations(searchTerm);
      
      this.logOperationComplete('searchOrganizations', Date.now() - startTime, { 
        searchTerm, 
        count: results.length 
      });
      return results;
    }, 'search organizations');
  }
}

// Export singleton instance factory
export const createOrganizationService = (organizationId: string) => new OrganizationService(organizationId);
