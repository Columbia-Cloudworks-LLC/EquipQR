/**
 * @deprecated Billing system has been removed. These hooks are kept for backward compatibility
 * but return unlimited/free values since billing is permanently disabled.
 */

import { useEffect } from 'react';
import { 
  useOrganizationSlots, 
  useSlotAvailability, 
  useSlotPurchases, 
  type OrganizationSlot,
  type SlotAvailability,
  type SlotPurchase 
} from './useOrganizationSlots';
import { useBackgroundSync } from './useCacheInvalidation';
import { performanceMonitor } from '@/utils/performanceMonitoring';

/**
 * @deprecated Billing is disabled. Returns empty array.
 */
export const useEnhancedOrganizationSlots = (organizationId?: string) => {
  const query = useOrganizationSlots(organizationId || '');
  const { subscribeToOrganization } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('enhanced-query-slots-init', 1);
    }
  }, [organizationId, subscribeToOrganization]);

  return query;
};

/**
 * @deprecated Billing is disabled. Returns unlimited slots.
 */
export const useEnhancedSlotAvailability = (organizationId?: string) => {
  const query = useSlotAvailability(organizationId || '');
  const { subscribeToOrganization } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('enhanced-query-slot-availability-init', 1);
    }
  }, [organizationId, subscribeToOrganization]);

  return query;
};

/**
 * @deprecated Billing is disabled. Returns empty array.
 */
export const useEnhancedSlotPurchases = (organizationId?: string) => {
  const query = useSlotPurchases(organizationId || '');
  const { subscribeToOrganization } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('enhanced-query-slot-purchases-init', 1);
    }
  }, [organizationId, subscribeToOrganization]);

  return query;
};

// Re-export types for convenience
export type { OrganizationSlot, SlotAvailability, SlotPurchase };