import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { logStep, normalizeDomain } from "./gw-oauth-validation.ts";

export async function resolveEffectiveOrganizationId(
  supabaseClient: SupabaseClient,
  params: {
    organizationId: string | null;
    userDomain: string;
    userId: string;
  },
): Promise<string> {
  const domain = normalizeDomain(params.userDomain);
  let effectiveOrgId = params.organizationId;

  // Check if this domain already has an organization
  const { data: existingDomainData } = await supabaseClient
    .from("workspace_domains")
    .select("organization_id, domain")
    .eq("domain", domain)
    .maybeSingle();

  if (existingDomainData?.organization_id) {
    // Domain already claimed - use existing organization
    effectiveOrgId = existingDomainData.organization_id;
    logStep("Using existing organization for domain", { 
      domain, 
      organizationId: effectiveOrgId,
    });
  } else if (!params.organizationId) {
    // First-time setup: auto-provision new organization
    // Generate organization name from domain (e.g., "acme.com" -> "Acme")
    const domainParts = domain.split(".");
    const primaryPart = domainParts.find((part) => part.length > 0) ?? "Workspace";
    const orgNameBase = primaryPart.charAt(0).toUpperCase() + primaryPart.slice(1);
    const orgName = `${orgNameBase} Organization`;

    logStep("Auto-provisioning new organization", { domain, orgName });

    const { data: provisionData, error: provisionError } = await supabaseClient
      .rpc("auto_provision_workspace_organization", {
        p_user_id: params.userId,
        p_domain: domain,
        p_organization_name: orgName,
      });

    if (provisionError) {
      logStep("Failed to provision organization", { error: provisionError.message });
      throw new Error("Failed to create organization. Please try again.");
    }

    if (!provisionData || provisionData.length === 0) {
      throw new Error("Failed to create organization. Please try again.");
    }

    effectiveOrgId = provisionData[0].organization_id;
    logStep("Organization provisioned", {
      organizationId: effectiveOrgId,
      alreadyExisted: provisionData[0].already_existed,
    });
  }

  if (!effectiveOrgId) {
    throw new Error("No organization available for this domain. Please try again.");
  }

  return effectiveOrgId;
}
