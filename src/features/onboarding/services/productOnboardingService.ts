import { supabase } from '@/integrations/supabase/client';

export interface ProductOnboardingStatus {
  needs_onboarding: boolean;
  teams_count: number;
  equipment_count: number;
  completed_at: string | null;
  is_org_admin: boolean;
}

export async function getProductOnboardingStatus(
  organizationId: string,
): Promise<ProductOnboardingStatus | null> {
  const { data, error } = await supabase.rpc('get_product_onboarding_status', {
    p_organization_id: organizationId,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return null;
  }

  return {
    needs_onboarding: row.needs_onboarding,
    teams_count: Number(row.teams_count),
    equipment_count: Number(row.equipment_count),
    completed_at: row.completed_at,
    is_org_admin: row.is_org_admin,
  };
}

export async function completeProductOnboarding(organizationId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_product_onboarding', {
    p_organization_id: organizationId,
  });

  if (error) {
    throw error;
  }
}
