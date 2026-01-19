import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { verifySuperAdminAccess } from "../_shared/admin-validation.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[WORKSPACE-DOMAIN-CLAIMS-ADMIN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
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
    const isSuperAdmin = await verifySuperAdminAccess(supabaseClient, userId);
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Access denied. Super admin privileges required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    if (req.method === "GET" && path === "list") {
      const { data, error } = await supabaseClient
        .from("workspace_domain_claims")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) {
        logStep("Error listing claims", { error: error.message });
        throw error;
      }

      return new Response(JSON.stringify({ claims: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && path === "review") {
      const body = await req.json();
      const { claimId, approve, reviewNotes } = body || {};

      if (!claimId || typeof approve !== "boolean") {
        return new Response(JSON.stringify({ error: "claimId and approve are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const status = approve ? "approved" : "rejected";
      const { data, error } = await supabaseClient
        .from("workspace_domain_claims")
        .update({
          status,
          reviewed_by_user_id: userId,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", claimId)
        .select()
        .single();

      if (error) {
        logStep("Error reviewing claim", { error: error.message });
        throw error;
      }

      return new Response(JSON.stringify({ claim: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

