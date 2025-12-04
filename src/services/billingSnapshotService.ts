/**
 * @deprecated Billing system has been removed. This service is kept for backward compatibility
 * but will always return empty/default values since billing is disabled.
 */

export interface BillingSnapshot {
  organization: {
    id: string;
    name: string;
    plan: string;
    billing_cycle?: string;
    member_count: number;
    billable_members: number;
    storage_used_mb: number;
    fleet_map_enabled: boolean;
    next_billing_date?: string;
    features: string[];
  };
  slots: {
    total_purchased: number;
    used_slots: number;
    available_slots: number;
    exempted_slots: number;
    current_period_start?: string;
    current_period_end?: string;
    slot_type: string;
  }[];
  subscriptions: {
    id: string;
    feature_type: string;
    status: string;
    quantity: number;
    unit_price_cents: number;
    billing_cycle: string;
    current_period_start?: string;
    current_period_end?: string;
    stripe_subscription_id?: string;
  }[];
  usage: {
    usage_type: string;
    usage_value: number;
    billing_period_start: string;
    billing_period_end: string;
  }[];
  exemptions: {
    exemption_type: string;
    exemption_value: number;
    reason?: string;
    expires_at?: string;
  }[];
  events: {
    event_type: string;
    amount_change: number;
    effective_date: string;
    event_data: Record<string, unknown>;
  }[];
}

/**
 * @deprecated Billing is disabled. Returns empty snapshot.
 */
export const getBillingSnapshot = async (organizationId: string): Promise<BillingSnapshot> => {
  // Billing is disabled - return empty snapshot
  return {
    organization: {
      id: organizationId,
      name: '',
      plan: 'free',
      member_count: 0,
      billable_members: 0,
      storage_used_mb: 0,
      fleet_map_enabled: false,
      features: []
    },
    slots: [],
    subscriptions: [],
    usage: [],
    exemptions: [],
    events: []
  };
};
