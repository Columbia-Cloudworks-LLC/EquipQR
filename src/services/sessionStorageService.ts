import { logger } from '@/utils/logger';
import type { SessionData, SessionOrganization } from '@/types/session';
import { 
  getSessionStorageKey, 
  getSessionVersion,
  clearOrganizationPreference 
} from '@/utils/sessionPersistence';

const SESSION_STORAGE_KEY = getSessionStorageKey();
const SESSION_VERSION = getSessionVersion();

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

export class SessionStorageService {
  static loadSessionFromStorage(): SessionData | null {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      
      // Check version compatibility - force refresh due to RLS changes
      if (parsed.version !== SESSION_VERSION) {
        logger.info('🔄 Session version updated, clearing stored data');
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      
      // Use extended cache time for better performance and stability
      const lastUpdated = new Date(parsed.lastUpdated);
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      
      if (lastUpdated < fourHoursAgo) {
        logger.info('⏰ Session data is older than 4 hours, will refresh on next fetch');
        // Don't clear immediately, but mark for refresh
        return parsed;
      }
      
      return parsed;
    } catch (error) {
      logger.error('💥 Error loading session from storage:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  static saveSessionToStorage(data: SessionData): void {
    try {
      // Strictly necessary session cache (not preference-gated). Never persist
      // inventory default location / address fields.
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toPersistedSessionData(data)));
    } catch (error) {
      logger.error('💾 Error saving session to storage:', error);
    }
  }

  static clearSessionStorage(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    clearOrganizationPreference();
  }

  static isSessionVersionValid(sessionData: SessionData): boolean {
    return sessionData.version === SESSION_VERSION;
  }
}
