/**
 * Admin validation utilities for super admin organization access control
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
 * Verify that a user has super admin access.
 * 
 * Security Model:
 * - Super admin access is determined by membership in a designated "super admin organization"
 * - The organization ID is configured via SUPER_ADMIN_ORG_ID environment variable
 * - This is a DATABASE-level check (not app_metadata) - membership is verified against
 *   the organization_members table, ensuring the flag cannot be spoofed client-side
 * - Only users with owner/admin role in this specific org are granted super admin access
 * 
 * NOTE: This function must be called with a service role client to bypass RLS
 * and ensure the check cannot be circumvented by client-side manipulation.
 */
export async function verifySuperAdminAccess(
  supabaseClient: SupabaseClient,
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
