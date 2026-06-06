import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

/**
 * Extracts the client IP address from request headers.
 * Checks x-forwarded-for (first IP in comma-separated list) and x-real-ip.
 * Returns null if no IP address is found.
 */
export const getClientIpAddress = (req: Request): string | null => {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         null;
};

export async function loadAdminOrganizationIds(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<{ orgIds: string[]; error: string | null }> {
  const { data: userMemberships, error: membershipQueryError } = await supabaseClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin']);

  if (membershipQueryError) {
    return { orgIds: [], error: membershipQueryError.message };
  }

  return { orgIds: (userMemberships || []).map(m => m.organization_id), error: null };
}

export async function loadWorkOrderForExport(
  supabaseClient: SupabaseClient,
  workOrderId: string,
  userOrgIds: string[],
): Promise<{ workOrder: Record<string, unknown> | null; error: string | null }> {
  const { data: workOrder, error: woError } = await supabaseClient
    .from('work_orders')
    .select(`
      *,
      equipment:equipment_id (
        name, 
        manufacturer, 
        model, 
        serial_number,
        team_id,
        team:team_id (name)
      )
    `)
    .eq('id', workOrderId)
    .in('organization_id', userOrgIds)
    .single();

  if (woError || !workOrder) {
    return { workOrder: null, error: woError?.message ?? "not found" };
  }

  return { workOrder, error: null };
}

export async function verifyQuickBooksManagePermission(
  supabaseClient: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<{ allowed: boolean; error: string | null }> {
  const { data: qbPermission, error: qbPermError } = await supabaseClient
    .rpc('can_user_manage_quickbooks', {
      p_user_id: userId,
      p_organization_id: organizationId
    });

  if (qbPermError) {
    return { allowed: false, error: qbPermError.message };
  }

  return { allowed: !!qbPermission, error: null };
}
