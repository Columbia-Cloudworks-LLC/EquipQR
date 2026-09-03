import { logger } from '@/utils/logger';
import type { SessionData, SessionOrganization } from '@/types/session';
import { 
  getSessionStorageKey, 
  getSessionVersion,
  clearOrganizationPreference 
} from '@/utils/sessionPersistence';
import { DASHBOARD_CURRENT_ORG_STORAGE_KEY } from '@/utils/organizationSelection';

const SESSION_STORAGE_KEY = getSessionStorageKey();
const SESSION_VERSION = getSessionVersion();
const SELECTED_TEAM_STORAGE_KEY_PREFIX = 'equipqr:selectedTeamId:';

type PersistedSessionData = SessionData & {
  authUserId?: string;
};

/**
 * Strip inventory default location fields before writing SessionData to
 * localStorage — those address/lat-lng values are sensitive and must stay
 * in-memory / server-sourced only (Qodo rule: no PII in Web Storage).
 */
function toPersistedSessionOrganization(org: SessionOrganization): SessionOrganization {
  return {
    id: org.id,
    name: org.name,
    plan: org.plan,
    memberCount: org.memberCount,
    maxMembers: org.maxMembers,
    features: org.features,
    billingCycle: org.billingCycle,
    nextBillingDate: org.nextBillingDate,
    logo: org.logo,
    backgroundColor: org.backgroundColor,
    scanLocationCollectionEnabled: org.scanLocationCollectionEnabled,
    // Keep the human-readable location *name* for UX; omit street/city/coords (PII).
    inventoryDefaultLocationName: org.inventoryDefaultLocationName,
    userRole: org.userRole,
    userStatus: org.userStatus,
  };
}

function toPersistedSessionData(data: SessionData): SessionData {
  return {
    organizations: data.organizations.map(toPersistedSessionOrganization),
    currentOrganizationId: data.currentOrganizationId,
    teamMemberships: data.teamMemberships,
    lastUpdated: data.lastUpdated,
    version: data.version,
  };
}

function clearScopedSelectionStorage(): void {
  clearOrganizationPreference();
  localStorage.removeItem(DASHBOARD_CURRENT_ORG_STORAGE_KEY);

  const selectedTeamKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(SELECTED_TEAM_STORAGE_KEY_PREFIX)) {
      selectedTeamKeys.push(key);
    }
  }
  for (const key of selectedTeamKeys) {
    localStorage.removeItem(key);
  }
}

export class SessionStorageService {
  static loadSessionFromStorage(expectedUserId?: string): SessionData | null {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored) as PersistedSessionData;
      
      // Check version compatibility - force refresh due to RLS changes
      if (parsed.version !== SESSION_VERSION) {
        logger.info('🔄 Session version updated, clearing stored data');
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      if (expectedUserId && parsed.authUserId !== expectedUserId) {
        logger.info('🔄 Session user changed, clearing stored data');
        this.clearSessionStorage();
        return null;
      }
      
      // Use extended cache time for better performance and stability
      const lastUpdated = new Date(parsed.lastUpdated);
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      
      if (lastUpdated < fourHoursAgo) {
        logger.info('⏰ Session data is older than 4 hours, will refresh on next fetch');
        // Don't clear immediately, but mark for refresh
        const { authUserId: _authUserId, ...sessionData } = parsed;
        return sessionData;
      }
      
      const { authUserId: _authUserId, ...sessionData } = parsed;
      return sessionData;
    } catch (error) {
      logger.error('💥 Error loading session from storage:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  static saveSessionToStorage(data: SessionData, authUserId?: string): void {
    try {
      // Strictly necessary session cache (not preference-gated). Never persist
      // inventory default location / address fields.
      const persisted: PersistedSessionData = {
        ...toPersistedSessionData(data),
        authUserId,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(persisted));
    } catch (error) {
      logger.error('💾 Error saving session to storage:', error);
    }
  }

  static clearSessionStorage(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    clearScopedSelectionStorage();
  }

  static isSessionVersionValid(sessionData: SessionData): boolean {
    return sessionData.version === SESSION_VERSION;
  }
}
