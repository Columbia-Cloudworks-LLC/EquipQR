export interface BillingExemption {
  id: string;
  organization_id: string;
  exemption_type: string;
  exemption_value: number;
  reason: string | null;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingExemptionWithDetails extends BillingExemption {
  organizations?: {
    name: string;
  };
}

export interface ExemptionFormData {
  organization_id: string;
  exemption_type: string;
  exemption_value: number;
  reason?: string;
  expires_at?: string;
}

export interface AdminOrganization {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
}

