import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { verifySuperAdminAccess } from "../_shared/admin-validation.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-BILLING-EXEMPTIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role key to bypass RLS policies
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started", { method: req.method });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Verify super admin access
    const isSuperAdmin = await verifySuperAdminAccess(supabaseClient, userId);
    if (!isSuperAdmin) {
      logStep("Access denied - not a super admin", { userId });
      return new Response(JSON.stringify({ error: "Access denied. Super admin privileges required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Super admin access verified");

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // LIST exemptions
    if (req.method === "GET" && path === "list") {
      const organizationId = url.searchParams.get("organization_id");
      
      let query = supabaseClient
        .from('billing_exemptions')
        .select(`
          *,
          organizations!inner(name)
        `)
        .order('created_at', { ascending: false });
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logStep("Error listing exemptions", { error });
        throw error;
      }
      
      logStep("Exemptions listed", { count: data?.length });
      return new Response(JSON.stringify({ exemptions: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE exemption
    if (req.method === "POST" && path === "create") {
      const body = await req.json();
      const { organization_id, exemption_type, exemption_value, reason, expires_at } = body;
      
      if (!organization_id || !exemption_type || exemption_value === undefined) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { data, error } = await supabaseClient
        .from('billing_exemptions')
        .insert({
          organization_id,
          exemption_type,
          exemption_value: parseInt(exemption_value),
          reason,
          expires_at: expires_at || null,
          granted_by: userId,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) {
        logStep("Error creating exemption", { error });
        throw error;
      }
      
      logStep("Exemption created", { id: data.id });
      return new Response(JSON.stringify({ exemption: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE exemption
    if (req.method === "PUT" && path === "update") {
      const body = await req.json();
      const { id, exemption_type, exemption_value, reason, expires_at, is_active } = body;
      
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing exemption ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const updateData: any = { updated_at: new Date().toISOString() };
      if (exemption_type !== undefined) updateData.exemption_type = exemption_type;
      if (exemption_value !== undefined) updateData.exemption_value = parseInt(exemption_value);
      if (reason !== undefined) updateData.reason = reason;
      if (expires_at !== undefined) updateData.expires_at = expires_at;
      if (is_active !== undefined) updateData.is_active = is_active;
      
      const { data, error } = await supabaseClient
        .from('billing_exemptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logStep("Error updating exemption", { error });
        throw error;
      }
      
      logStep("Exemption updated", { id });
      return new Response(JSON.stringify({ exemption: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE exemption
    if (req.method === "DELETE" && path === "delete") {
      const exemptionId = url.searchParams.get("id");
      
      if (!exemptionId) {
        return new Response(JSON.stringify({ error: "Missing exemption ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { error } = await supabaseClient
        .from('billing_exemptions')
        .delete()
        .eq('id', exemptionId);
      
      if (error) {
        logStep("Error deleting exemption", { error });
        throw error;
      }
      
      logStep("Exemption deleted", { id: exemptionId });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid operation" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { message: errorMessage, stack: errorStack });
    
    // Return generic error to user, don't expose internal details
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request. Please try again later." }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

