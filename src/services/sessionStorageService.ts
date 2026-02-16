import { logger } from '@/utils/logger';
import { SessionData } from '@/contexts/SessionContext';
import { 
  getSessionStorageKey, 
  getSessionVersion,
  clearOrganizationPreference 
} from '@/utils/sessionPersistence';

const SESSION_STORAGE_KEY = getSessionStorageKey();
const SESSION_VERSION = getSessionVersion();

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
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error('💾 Error saving session to storage:', error);
    }
  }

  static clearSessionStorage(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    clearOrganizationPreference();
  }

  static isSessionExpired(sessionData: SessionData): boolean {
    const lastUpdated = new Date(sessionData.lastUpdated);
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    return lastUpdated < fourHoursAgo;
  }

  static isSessionVersionValid(sessionData: SessionData): boolean {
    return sessionData.version === SESSION_VERSION;
  }
}