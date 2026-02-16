/**
 * @deprecated Billing system has been removed. These hooks are kept for backward compatibility
 * but return unlimited/free values since billing is permanently disabled.
 */

import { useQuery } from '@tanstack/react-query';

export interface OrganizationSlot {
  id: string;
  organization_id: string;
  slot_type: string;
  purchased_slots: number;
  used_slots: number;
  billing_period_start: string;
  billing_period_end: string;
  stripe_payment_intent_id?: string;
  amount_paid_cents: number;
  created_at: string;
  updated_at: string;
}

export interface SlotPurchase {
  id: string;
  organization_id: string;
  purchased_by: string;
  slot_type: string;
  quantity: number;
  unit_price_cents: number;
  total_amount_cents: number;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  billing_period_start: string;
  billing_period_end: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface SlotAvailability {
  total_purchased: number;
  used_slots: number;
  available_slots: number;
  exempted_slots: number;
  current_period_start: string;
  current_period_end: string;
}

/**
 * @deprecated Billing is disabled. Returns empty array.
 */
export const useOrganizationSlots = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization-slots', organizationId],
    queryFn: async (): Promise<OrganizationSlot[]> => {
      return [];
    },
    enabled: !!organizationId,
    staleTime: Infinity, // Never refetch since billing is disabled
  });
};

/**
 * @deprecated Billing is disabled. Returns unlimited slots.
 */
export const useSlotAvailability = (organizationId: string) => {
  return useQuery({
    queryKey: ['slot-availability', organizationId],
    queryFn: async (): Promise<SlotAvailability> => {
      // Billing is disabled - return unlimited slots
      return {
        total_purchased: Infinity,
        used_slots: 0,
        available_slots: Infinity,
        exempted_slots: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString()
      };
    },
    enabled: !!organizationId,
    staleTime: Infinity, // Never refetch since billing is disabled
  });
};

/**
 * @deprecated Billing is disabled. Returns empty array.
 */
export const useSlotPurchases = (organizationId: string) => {
  return useQuery({
    queryKey: ['slot-purchases', organizationId],
    queryFn: async (): Promise<SlotPurchase[]> => {
      return [];
    },
    enabled: !!organizationId,
    staleTime: Infinity, // Never refetch since billing is disabled
  });
};
