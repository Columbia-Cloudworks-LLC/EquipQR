/**
 * Admin validation utilities for super admin organization access control
 */

/**
 * Check if an organization ID matches the super admin organization
 */
export function isSuperAdminOrg(orgId: string): boolean {
  const superAdminOrgId = Deno.env.get("SUPER_ADMIN_ORG_ID");
  
  if (!superAdminOrgId) {
    console.error("[ADMIN-VALIDATION] SUPER_ADMIN_ORG_ID not configured");
    return false;
  }
  
  return orgId === superAdminOrgId;
}

/**
 * Verify that a user has super admin access
 * Checks if the user is an owner or admin in the super admin organization
 */
export async function verifySuperAdminAccess(
  supabaseClient: any,
  userId: string
): Promise<boolean> {
  const superAdminOrgId = Deno.env.get("SUPER_ADMIN_ORG_ID");
  
  if (!superAdminOrgId) {
    console.error("[ADMIN-VALIDATION] SUPER_ADMIN_ORG_ID not configured");
    return false;
  }
  
  try {
    // Check if user is an admin in the super admin organization
    const { data, error } = await supabaseClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', superAdminOrgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .single();
    
    if (error) {
      console.error("[ADMIN-VALIDATION] Error checking super admin access:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("[ADMIN-VALIDATION] Exception checking super admin access:", error);
    return false;
  }
}

