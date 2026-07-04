import { supabase } from '@/integrations/supabase/client';
import type { SessionOrganization, SessionTeamMembership } from '@/types/session';
import { mapOrganizationRowsToSessionOrganizations } from '@/utils/mapOrganizationToSession';
import {
  getPrioritizedOrganizationId,
  withPersonalOrgFlag,
} from '@/utils/prioritizeOrganizations';

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

    return mapOrganizationRowsToSessionOrganizations(orgData || [], orgMemberData);
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

    const { data: personalOrgData } = await supabase
      .from('personal_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    const personalOrgId = personalOrgData?.organization_id ?? null;
    const prioritizedOrgs = withPersonalOrgFlag(organizations, personalOrgId);

    // Determine current organization: explicit preference, then non-personal org priority.
    let currentOrganizationId = getPrioritizedOrganizationId(prioritizedOrgs);

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