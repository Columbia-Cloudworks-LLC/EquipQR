/**
 * Resolve Inventory Scan Edge Function
 *
 * Resolves a scanned value (ID, SKU, external_id) to an inventory item.
 * Searches the user's current organization first, then other orgs they belong to.
 * Uses user-scoped client so RLS policies apply.
 */

import {
  createUserSupabaseClient,
  requireUser,
  verifyOrgMembership,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RESOLVE-INVENTORY-SCAN] ${step}${detailsStr}`);
};

interface ScanRequest {
  scanned_value: string;
  current_organization_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    // Create user-scoped client (RLS enforced)
    const supabase = createUserSupabaseClient(req);

    // Validate user authentication
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const body: ScanRequest = await req.json();
    const { scanned_value, current_organization_id } = body;

    if (!scanned_value) {
      return createErrorResponse("scanned_value is required", 400);
    }

    logStep("Processing scan", {
      scanned_value: scanned_value.substring(0, 20) + "...",
      current_org: current_organization_id,
    });

    // Try to parse as UUID first (for inventory item ID)
    let isUUID = false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    isUUID = uuidRegex.test(scanned_value);

    // Step 1: Check current organization (if provided)
    if (current_organization_id) {
      logStep("Checking current organization", { orgId: current_organization_id });

      // Verify user is a member of the organization via RLS-protected query
      const membership = await verifyOrgMembership(
        supabase,
        user.id,
        current_organization_id
      );

      if (!membership.isMember) {
        logStep("User is not a member of the organization", {
          orgId: current_organization_id,
          userId: user.id,
        });
        return createErrorResponse(
          "Forbidden: You are not a member of the specified organization",
          403
        );
      }

      // Search for inventory item in current org (RLS will apply)
      let currentOrgMatch = null;

      if (isUUID) {
        const { data } = await supabase
          .from("inventory_items")
          .select("id, name, organization_id")
          .eq("organization_id", current_organization_id)
          .eq("id", scanned_value)
          .maybeSingle();
        currentOrgMatch = data;
      } else {
        // Search by external_id or sku
        const { data: externalIdMatch } = await supabase
          .from("inventory_items")
          .select("id, name, organization_id")
          .eq("organization_id", current_organization_id)
          .eq("external_id", scanned_value)
          .maybeSingle();

        const { data: skuMatch } = await supabase
          .from("inventory_items")
          .select("id, name, organization_id")
          .eq("organization_id", current_organization_id)
          .eq("sku", scanned_value)
          .maybeSingle();

        currentOrgMatch = externalIdMatch || skuMatch;
      }

      if (currentOrgMatch) {
        logStep("Found in current organization", { itemId: currentOrgMatch.id });
        return createJsonResponse({
          type: "inventory",
          id: currentOrgMatch.id,
          orgId: current_organization_id,
          action: "view",
          name: currentOrgMatch.name,
        });
      }
    }

    // Step 2: Check other organizations user is member of
    logStep("Checking other organizations");

    // Get all organizations user is a member of (RLS will restrict)
    const { data: memberships, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, organizations!inner(id, name)")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (membershipError) {
      logStep("ERROR", {
        message: "Failed to fetch memberships",
        error: membershipError.message,
      });
      throw membershipError;
    }

    if (!memberships || memberships.length === 0) {
      logStep("No organization memberships found");
      return createJsonResponse({
        type: "not_found",
        action: "equipment_fallback",
      });
    }

    // Filter out current organization if provided
    const otherOrgs = current_organization_id
      ? memberships.filter((m) => m.organization_id !== current_organization_id)
      : memberships;

    if (otherOrgs.length > 0) {
      const orgIds = otherOrgs.map((m) => m.organization_id);

      let otherOrgsMatches: Array<{
        id: string;
        name: string;
        organization_id: string;
      }> = [];

      if (isUUID) {
        const { data } = await supabase
          .from("inventory_items")
          .select("id, name, organization_id")
          .in("organization_id", orgIds)
          .eq("id", scanned_value);
        otherOrgsMatches = data || [];
      } else {
        // Search by external_id or sku
        const { data: externalIdMatches } = await supabase
          .from("inventory_items")
          .select("id, name, organization_id")
          .in("organization_id", orgIds)
          .eq("external_id", scanned_value);

        const { data: skuMatches } = await supabase
          .from("inventory_items")
          .select("id, name, organization_id")
          .in("organization_id", orgIds)
          .eq("sku", scanned_value);

        // Combine results, removing duplicates by id
        const combinedMatches = new Map<
          string,
          { id: string; name: string; organization_id: string }
        >();
        if (externalIdMatches) {
          externalIdMatches.forEach((item) =>
            combinedMatches.set(item.id, item)
          );
        }
        if (skuMatches) {
          skuMatches.forEach((item) => combinedMatches.set(item.id, item));
        }
        otherOrgsMatches = Array.from(combinedMatches.values());
      }

      if (otherOrgsMatches && otherOrgsMatches.length > 0) {
        if (otherOrgsMatches.length === 1) {
          const match = otherOrgsMatches[0];
          const orgInfo = otherOrgs.find(
            (m) => m.organization_id === match.organization_id
          );
          logStep("Found in single other organization", {
            itemId: match.id,
            orgId: match.organization_id,
          });
          return createJsonResponse({
            type: "inventory",
            id: match.id,
            orgId: match.organization_id,
            orgName:
              (orgInfo?.organizations as { name: string })?.name || "Unknown",
            action: "switch_prompt",
            name: match.name,
          });
        } else {
          // Multiple matches - return list for user to select
          const matches = otherOrgsMatches.map((match) => {
            const orgInfo = otherOrgs.find(
              (m) => m.organization_id === match.organization_id
            );
            return {
              id: match.id,
              orgId: match.organization_id,
              orgName:
                (orgInfo?.organizations as { name: string })?.name || "Unknown",
              name: match.name,
            };
          });
          logStep("Found in multiple organizations", { count: matches.length });
          return createJsonResponse({
            type: "inventory",
            matches,
            action: "select_org_prompt",
          });
        }
      }
    }

    // Step 3: Fallback to equipment check (return null to indicate no inventory match)
    logStep("No inventory match found, falling back to equipment");
    return createJsonResponse({
      type: "not_found",
      action: "equipment_fallback",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
