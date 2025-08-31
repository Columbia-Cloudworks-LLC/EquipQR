import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REFRESH-FLEETMAP-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    logStep("Function started");

    // Initialize Supabase client with service role key for database writes
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get Stripe secret key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    // Authenticate user with the anon key client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get organization ID from request body
    const { organizationId } = await req.json();
    if (!organizationId) {
      throw new Error("Organization ID is required");
    }

    logStep("Processing organization", { organizationId });

    // Verify user is a member of this organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      throw new Error("User is not a member of this organization");
    }

    logStep("Organization membership verified", { role: membership.role });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found for user");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No Stripe customer found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get all active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 100, // Get all active subscriptions
    });

    logStep("Retrieved active subscriptions", { count: subscriptions.data.length });

    // Look for Fleet Map subscriptions using multiple identification methods
    const fleetMapPriceId = Deno.env.get("STRIPE_FLEETMAP_PRICE_ID");
    let fleetMapSubscription = null;

    for (const subscription of subscriptions.data) {
      const lineItem = subscription.items.data[0];
      const price = lineItem.price;
      
      // Method 1: Check price ID
      if (fleetMapPriceId && price.id === fleetMapPriceId) {
        fleetMapSubscription = subscription;
        logStep("Found Fleet Map subscription by price ID", { subscriptionId: subscription.id });
        break;
      }

      // Method 2: Check product metadata or lookup key
      if (price.product && typeof price.product === 'object') {
        const product = price.product as any;
        if (product.metadata?.feature_type === 'fleet_map' || 
            product.name?.toLowerCase().includes('fleet map')) {
          fleetMapSubscription = subscription;
          logStep("Found Fleet Map subscription by product metadata/name", { subscriptionId: subscription.id });
          break;
        }
      }

      // Method 3: Check subscription metadata
      if (subscription.metadata?.feature_type === 'fleet_map' ||
          subscription.metadata?.organization_id === organizationId) {
        fleetMapSubscription = subscription;
        logStep("Found Fleet Map subscription by subscription metadata", { subscriptionId: subscription.id });
        break;
      }
    }

    if (!fleetMapSubscription) {
      logStep("No Fleet Map subscription found");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No active Fleet Map subscription found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Update organization_subscriptions table
    const subscriptionData = {
      organization_id: organizationId,
      feature_type: 'fleet_map',
      status: 'active',
      stripe_subscription_id: fleetMapSubscription.id,
      current_period_start: new Date(fleetMapSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(fleetMapSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: fleetMapSubscription.cancel_at_period_end,
      quantity: fleetMapSubscription.items.data[0].quantity,
      unit_price_cents: fleetMapSubscription.items.data[0].price.unit_amount || 1000,
      billing_cycle: fleetMapSubscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
    };

    const { error: upsertError } = await supabaseClient
      .from('organization_subscriptions')
      .upsert(subscriptionData, { 
        onConflict: 'organization_id,feature_type',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      logStep("Error upserting subscription", { error: upsertError.message });
      throw new Error(`Failed to update subscription: ${upsertError.message}`);
    }

    logStep("Successfully updated organization_subscriptions", subscriptionData);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Fleet Map subscription activated successfully",
      subscription: {
        status: 'active',
        current_period_end: subscriptionData.current_period_end,
        billing_cycle: subscriptionData.billing_cycle
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});