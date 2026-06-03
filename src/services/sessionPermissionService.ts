import type { SessionData, SessionOrganization } from '@/types/session';

export class SessionPermissionService {
  static hasTeamRole(
    sessionData: SessionData | null, 
    teamId: string, 
    role: string
  ): boolean {
    if (!sessionData) return false;
    const membership = sessionData.teamMemberships.find(tm => tm.teamId === teamId);
    return membership?.role === role;
  }

  static hasTeamAccess(sessionData: SessionData | null, teamId: string): boolean {
    if (!sessionData) return false;
    return sessionData.teamMemberships.some(tm => tm.teamId === teamId);
  }

  static canManageTeam(
    sessionData: SessionData | null, 
    currentOrg: SessionOrganization | null, 
    teamId: string
  ): boolean {
    if (!currentOrg) {
      return false;
    }
    
    const isOrgAdmin = ['owner', 'admin'].includes(currentOrg.userRole);
    const isTeamManager = sessionData?.teamMemberships.find(tm => tm.teamId === teamId)?.role === 'manager';
    
    return isOrgAdmin || !!isTeamManager;
  }

  static getUserTeamIds(sessionData: SessionData | null): string[] {
    if (!sessionData) return [];
    return sessionData.teamMemberships.map(tm => tm.teamId);
  }

  static getCurrentOrganization(sessionData: SessionData | null): SessionOrganization | null {
    if (!sessionData?.currentOrganizationId) return null;
    return sessionData.organizations.find(org => org.id === sessionData.currentOrganizationId) || null;
  }
}