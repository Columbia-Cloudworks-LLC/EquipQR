import { supabase } from '@/integrations/supabase/client';
import { SessionOrganization, SessionTeamMembership } from '@/contexts/SessionContext';

import { logger } from '@/utils/logger';

export interface FetchSessionDataResult {
  organizations: SessionOrganization[];
  currentOrganizationId: string | null;
  teamMemberships: SessionTeamMembership[];
}

export class SessionDataService {
  static async fetchUserOrganizations(userId: string): Promise<SessionOrganization[]> {
    // Fetch user's organization memberships
    const { data: orgMemberData, error: orgMemberError } = await supabase
      .from('organization_members')
      .select('organization_id, role, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (orgMemberError) {
      logger.error('Error fetching organization memberships:', orgMemberError);
      throw new Error(`Failed to fetch memberships: ${orgMemberError.message}`);
    }

    if (!orgMemberData || orgMemberData.length === 0) {
      return [];
    }

    // Get organization IDs and fetch details
    const orgIds = orgMemberData.map(om => om.organization_id);

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds);

    if (orgError) {
      logger.error('Error fetching organizations:', orgError);
      throw new Error(`Failed to fetch organizations: ${orgError.message}`);
    }

    // Combine organization data with user roles
    return (orgData || []).map(org => {
      const membership = orgMemberData.find(om => om.organization_id === org.id);
      return {
        id: org.id,
        name: org.name,
        plan: org.plan as 'free' | 'premium',
        memberCount: org.member_count,
        maxMembers: org.max_members,
        features: org.features,
        billingCycle: org.billing_cycle as 'monthly' | 'yearly' | undefined,
        nextBillingDate: org.next_billing_date || undefined,
        logo: org.logo || undefined,
        backgroundColor: org.background_color || undefined,
        scanLocationCollectionEnabled: org.scan_location_collection_enabled ?? true,
        userRole: membership?.role as 'owner' | 'admin' | 'member' || 'member',
        userStatus: membership?.status as 'active' | 'pending' | 'inactive' || 'active'
      };
    });
  }

  static async fetchTeamMemberships(
    userId: string, 
    organizationId: string
  ): Promise<SessionTeamMembership[]> {
    try {
      const { data: teamData, error: teamError } = await supabase
        .rpc('get_user_team_memberships', {
          user_uuid: userId,
          org_id: organizationId
        });

      if (teamError) {
        logger.warn('Error fetching team memberships:', teamError);
        return [];
      }

      return (teamData || []).map(item => ({
        teamId: item.team_id,
        teamName: item.team_name,
        role: item.role as 'manager' | 'technician' | 'requestor' | 'viewer',
        joinedDate: item.joined_date
      }));
    } catch (teamFetchError) {
      logger.error('Failed to fetch team memberships:', teamFetchError);
      return [];
    }
  }

  static async fetchSessionData(
    userId: string,
    preferredOrgId?: string,
    storedOrgId?: string
  ): Promise<FetchSessionDataResult> {
    const organizations = await this.fetchUserOrganizations(userId);
    
    if (organizations.length === 0) {
      return {
        organizations: [],
        currentOrganizationId: null,
        teamMemberships: []
      };
    }

    // Helper function to prioritize organizations by user role (same as SimpleOrganizationProvider)
    const getPrioritizedOrganization = (orgs: SessionOrganization[]): string => {
      if (orgs.length === 0) return '';
      
      // Sort by role priority: owner > admin > member
      const prioritized = [...orgs].sort((a, b) => {
        const roleWeight = { owner: 3, admin: 2, member: 1 };
        return (roleWeight[b.userRole] || 0) - (roleWeight[a.userRole] || 0);
      });
      
      return prioritized[0].id;
    };

    // Determine current organization with role-based prioritization
    let currentOrganizationId = getPrioritizedOrganization(organizations);
    
    // Check user preference first
    if (preferredOrgId && organizations.find(org => org.id === preferredOrgId)) {
      currentOrganizationId = preferredOrgId;
    } else if (storedOrgId && organizations.find(org => org.id === storedOrgId)) {
      currentOrganizationId = storedOrgId;
    }

    // Fetch team memberships for the current organization
    const teamMemberships = await this.fetchTeamMemberships(userId, currentOrganizationId);

    return {
      organizations,
      currentOrganizationId,
      teamMemberships
    };
  }
}