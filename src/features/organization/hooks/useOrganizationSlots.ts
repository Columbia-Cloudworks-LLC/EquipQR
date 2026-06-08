/**
 * Legacy billing compatibility hooks.
 *
 * Billing is fully retired, but these exports remain to preserve import
 * stability in older code paths and tests.
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

export const useOrganizationSlots = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization-slots', organizationId],
    queryFn: async (): Promise<OrganizationSlot[]> => [],
    enabled: !!organizationId,
    staleTime: Infinity,
  });
};

export const useSlotAvailability = (organizationId: string) => {
  return useQuery({
    queryKey: ['slot-availability', organizationId],
    queryFn: async (): Promise<SlotAvailability> => ({
      total_purchased: Infinity,
      used_slots: 0,
      available_slots: Infinity,
      exempted_slots: 0,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date().toISOString(),
    }),
    enabled: !!organizationId,
    staleTime: Infinity,
  });
};

export const useSlotPurchases = (organizationId: string) => {
  return useQuery({
    queryKey: ['slot-purchases', organizationId],
    queryFn: async (): Promise<SlotPurchase[]> => [],
    enabled: !!organizationId,
    staleTime: Infinity,
  });
};
