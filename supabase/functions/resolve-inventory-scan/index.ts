import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESOLVE-INVENTORY-SCAN] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR", { message: "No authorization header provided" });
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header provided" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Extract and validate JWT token
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      logStep("ERROR", { message: "Empty token" });
      return new Response(
        JSON.stringify({ error: "Unauthorized: Empty token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      logStep("ERROR", { message: "Invalid token", error: userError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const body = await req.json();
    const { scanned_value, current_organization_id } = body;

    if (!scanned_value) {
      return new Response(
        JSON.stringify({ error: "scanned_value is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logStep("Processing scan", { scanned_value: scanned_value.substring(0, 20) + '...', current_org: current_organization_id });

    // Try to parse as UUID first (for inventory item ID)
    let isUUID = false;
    try {
      // Simple UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      isUUID = uuidRegex.test(scanned_value);
    } catch {
      // Not a UUID
    }

    // Step 1: Check current organization
    if (current_organization_id) {
      logStep("Checking current organization", { orgId: current_organization_id });

      let currentOrgMatch = null;
      let currentOrgError = null;

      if (isUUID) {
        const result = await supabaseClient
          .from('inventory_items')
          .select('id, name, organization_id')
          .eq('organization_id', current_organization_id)
          .eq('id', scanned_value)
          .maybeSingle();
        currentOrgMatch = result.data;
        currentOrgError = result.error;
      } else {
        // Search by external_id or sku - query both separately to avoid SQL injection
        const { data: externalIdMatch, error: externalIdErr } = await supabaseClient
          .from('inventory_items')
          .select('id, name, organization_id')
          .eq('organization_id', current_organization_id)
          .eq('external_id', scanned_value)
          .maybeSingle();

        const { data: skuMatch, error: skuErr } = await supabaseClient
          .from('inventory_items')
          .select('id, name, organization_id')
          .eq('organization_id', current_organization_id)
          .eq('sku', scanned_value)
          .maybeSingle();

        // Use external_id match if found, otherwise use sku match (OR semantics)
        currentOrgMatch = externalIdMatch || skuMatch;
        
        // Improved error handling: only propagate error if both queries failed
        if (!externalIdMatch && !skuMatch) {
          // Both queries failed or returned no results, propagate errors
          currentOrgError = externalIdErr || skuErr;
        } else {
          // At least one query succeeded, log any errors but do not propagate
          if (externalIdErr) {
            logStep("external_id query error (ignored due to sku success)", { error: externalIdErr.message || externalIdErr });
          }
          if (skuErr) {
            logStep("sku query error (ignored due to external_id success)", { error: skuErr.message || skuErr });
          }
          currentOrgError = null;
        }
      }

      if (!currentOrgError && currentOrgMatch) {
        logStep("Found in current organization", { itemId: currentOrgMatch.id });
        return new Response(
          JSON.stringify({
            type: 'inventory',
            id: currentOrgMatch.id,
            orgId: current_organization_id,
            action: 'view',
            name: currentOrgMatch.name
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Step 2: Check other organizations user is member of
    logStep("Checking other organizations");

    // Get all organizations user is a member of
    const { data: memberships, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('organization_id, organizations!inner(id, name)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (membershipError) {
      logStep("ERROR", { message: "Failed to fetch memberships", error: membershipError.message });
      throw membershipError;
    }

    if (!memberships || memberships.length === 0) {
      logStep("No organization memberships found");
      // Fall through to equipment check
    } else {
      // Filter out current organization if provided
      const otherOrgs = current_organization_id
        ? memberships.filter(m => m.organization_id !== current_organization_id)
        : memberships;

      if (otherOrgs.length > 0) {
        const orgIds = otherOrgs.map(m => m.organization_id);

        let otherOrgsMatches: Array<{ id: string; name: string; organization_id: string }> = [];
        let otherOrgsError = null;

        if (isUUID) {
          const result = await supabaseClient
            .from('inventory_items')
            .select('id, name, organization_id')
            .in('organization_id', orgIds)
            .eq('id', scanned_value);
          otherOrgsMatches = result.data || [];
          otherOrgsError = result.error;
        } else {
          // Search by external_id or sku - query both separately to avoid SQL injection
          const { data: externalIdMatches, error: externalIdErr } = await supabaseClient
            .from('inventory_items')
            .select('id, name, organization_id')
            .in('organization_id', orgIds)
            .eq('external_id', scanned_value);

          const { data: skuMatches, error: skuErr } = await supabaseClient
            .from('inventory_items')
            .select('id, name, organization_id')
            .in('organization_id', orgIds)
            .eq('sku', scanned_value);

          // Combine results, removing duplicates by id
          const combinedMatches = new Map<string, { id: string; name: string; organization_id: string }>();
          if (externalIdMatches) {
            externalIdMatches.forEach(item => combinedMatches.set(item.id, item));
          }
          if (skuMatches) {
            skuMatches.forEach(item => combinedMatches.set(item.id, item));
          }
          otherOrgsMatches = Array.from(combinedMatches.values());
          
          // Improved error handling: only propagate error if both queries failed
          if ((!externalIdMatches || externalIdMatches.length === 0) && (!skuMatches || skuMatches.length === 0)) {
            // Both queries failed or returned no results, propagate errors
            otherOrgsError = externalIdErr || skuErr;
          } else {
            // At least one query succeeded, log any errors but do not propagate
            if (externalIdErr) {
              logStep("external_id query error (ignored due to sku success)", { error: externalIdErr.message || externalIdErr });
            }
            if (skuErr) {
              logStep("sku query error (ignored due to external_id success)", { error: skuErr.message || skuErr });
            }
            otherOrgsError = null;
          }
        }

        if (!otherOrgsError && otherOrgsMatches && otherOrgsMatches.length > 0) {
          if (otherOrgsMatches.length === 1) {
            const match = otherOrgsMatches[0];
            const orgInfo = otherOrgs.find(m => m.organization_id === match.organization_id);
            logStep("Found in single other organization", { itemId: match.id, orgId: match.organization_id });
            return new Response(
              JSON.stringify({
                type: 'inventory',
                id: match.id,
                orgId: match.organization_id,
                orgName: (orgInfo?.organizations as { name: string })?.name || 'Unknown',
                action: 'switch_prompt',
                name: match.name
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } else {
            // Multiple matches - return list for user to select
            const matches = otherOrgsMatches.map(match => {
              const orgInfo = otherOrgs.find(m => m.organization_id === match.organization_id);
              return {
                id: match.id,
                orgId: match.organization_id,
                orgName: (orgInfo?.organizations as { name: string })?.name || 'Unknown',
                name: match.name
              };
            });
            logStep("Found in multiple organizations", { count: matches.length });
            return new Response(
              JSON.stringify({
                type: 'inventory',
                matches,
                action: 'select_org_prompt'
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
      }
    }

    // Step 3: Fallback to equipment check (return null to indicate no inventory match)
    logStep("No inventory match found, falling back to equipment");
    return new Response(
      JSON.stringify({
        type: 'not_found',
        action: 'equipment_fallback'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

