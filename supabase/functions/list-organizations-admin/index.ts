import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { verifySuperAdminAccess } from "../_shared/admin-validation.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIST-ORGANIZATIONS-ADMIN] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role key for unrestricted access
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

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

    // Fetch all organizations with member count
    const { data, error } = await supabaseClient
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        organization_members(count)
      `)
      .order('name', { ascending: true });
    
    if (error) {
      logStep("Error fetching organizations", { error });
      throw error;
    }

    // Transform data to include member_count
    const organizations = data?.map(org => ({
      id: org.id,
      name: org.name,
      created_at: org.created_at,
      member_count: org.organization_members?.[0]?.count || 0,
    })) || [];
    
    logStep("Organizations fetched", { count: organizations.length });
    
    return new Response(JSON.stringify({ organizations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { message: errorMessage, stack: errorStack });
    
    // Return generic error to user, don't expose internal details
    return new Response(
      JSON.stringify({ error: "An error occurred while fetching organizations. Please try again later." }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

