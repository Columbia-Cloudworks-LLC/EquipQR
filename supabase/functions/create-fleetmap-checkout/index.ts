
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-FLEETMAP-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { organizationId } = await req.json();
    if (!organizationId) throw new Error("organizationId is required");
    logStep("Request data", { organizationId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Get Fleet Map price ID from environment
    const fleetMapPriceId = Deno.env.get("STRIPE_FLEETMAP_PRICE_ID");
    if (!fleetMapPriceId) {
      throw new Error("STRIPE_FLEETMAP_PRICE_ID environment variable is not configured");
    }
    logStep("Using Fleet Map price ID", { priceId: fleetMapPriceId });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: fleetMapPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard/fleet-map?success=true`,
      cancel_url: `${origin}/dashboard/fleet-map?cancelled=true`,
      metadata: {
        user_id: user.id,
        organization_id: organizationId,
        feature_type: 'fleet_map'
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          organization_id: organizationId,
          feature_type: 'fleet_map'
        }
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-fleetmap-checkout", { message: errorMessage });
    
    // Return specific error messages for better UX
    let userMessage = "An internal error occurred";
    if (errorMessage.includes("STRIPE_FLEETMAP_PRICE_ID")) {
      userMessage = "Fleet Map pricing is not configured. Please contact support.";
    } else if (errorMessage.includes("STRIPE_SECRET_KEY")) {
      userMessage = "Payment system is not configured. Please contact support.";
    } else if (errorMessage.includes("User not authenticated")) {
      userMessage = "Please log in to continue.";
    } else if (errorMessage.includes("organizationId is required")) {
      userMessage = "Organization information is missing. Please refresh and try again.";
    }
    
    return new Response(JSON.stringify({ error: userMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
