
import { logger } from '@/utils/logger';

const SESSION_STORAGE_KEY = 'equipqr_session_data';
const ORGANIZATION_PREFERENCE_KEY = 'equipqr_current_org';
const SESSION_VERSION = 2;

export interface SessionPersistenceData {
  currentOrganizationId: string | null;
  lastSessionRefresh: string;
  userPreference: {
    selectedOrgId: string | null;
    selectionTimestamp: string;
  };
}

export const saveOrganizationPreference = (organizationId: string | null) => {
  try {
    const preference = {
      selectedOrgId: organizationId,
      selectionTimestamp: new Date().toISOString()
    };
    localStorage.setItem(ORGANIZATION_PREFERENCE_KEY, JSON.stringify(preference));
    logger.debug('Organization preference saved', { organizationId });
  } catch (error) {
    logger.warn('Failed to save organization preference', error);
  }
};

export const getOrganizationPreference = (): { selectedOrgId: string | null; selectionTimestamp: string } | null => {
  try {
    const stored = localStorage.getItem(ORGANIZATION_PREFERENCE_KEY);
    if (!stored) return null;
    
    const preference = JSON.parse(stored);
    
    // Check if preference is recent (within 24 hours)
    const timestamp = new Date(preference.selectionTimestamp);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    if (timestamp < twentyFourHoursAgo) {
      logger.info('Organization preference expired, clearing');
      localStorage.removeItem(ORGANIZATION_PREFERENCE_KEY);
      return null;
    }
    
    return preference;
  } catch (error) {
    logger.warn('Failed to get organization preference', error);
    localStorage.removeItem(ORGANIZATION_PREFERENCE_KEY);
    return null;
  }
};

export const clearOrganizationPreference = () => {
  try {
    localStorage.removeItem(ORGANIZATION_PREFERENCE_KEY);
  } catch (error) {
    logger.warn('Failed to clear organization preference', error);
  }
};

export const shouldRefreshSession = (lastRefresh?: string): boolean => {
  if (!lastRefresh) return true;
  
  try {
    const lastRefreshTime = new Date(lastRefresh);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Only refresh if it's been more than 15 minutes
    return lastRefreshTime < fifteenMinutesAgo;
  } catch (error) {
    logger.warn('Error checking session refresh time', error);
    return true;
  }
};

export const getSessionStorageKey = () => SESSION_STORAGE_KEY;
export const getSessionVersion = () => SESSION_VERSION;
