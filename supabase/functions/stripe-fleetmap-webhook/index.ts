import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-FLEETMAP-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Event validated", { type: event.type, id: event.id });

    // Handle subscription events for Fleet Map
    if (event.type === "checkout.session.completed" || 
        event.type === "invoice.payment_succeeded" ||
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted") {
      
      let subscription;
      let organizationId;
      let userId;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        organizationId = session.metadata?.organization_id;
        
        if (session.subscription && typeof session.subscription === 'string') {
          subscription = await stripe.subscriptions.retrieve(session.subscription);
        }
      } else {
        subscription = event.data.object as Stripe.Subscription;
        // Get organization info from subscription metadata
        organizationId = subscription.metadata?.organization_id;
        userId = subscription.metadata?.user_id;
      }

      if (!subscription || !organizationId) {
        logStep("Skipping non-Fleet Map event", { 
          hasSubscription: !!subscription, 
          hasOrgId: !!organizationId 
        });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check if this is a Fleet Map subscription by looking at the price
      const hasFleetMapPrice = subscription.items.data.some(item => 
        item.price.lookup_key === 'price_fleet_map_monthly'
      );

      if (!hasFleetMapPrice) {
        logStep("Skipping non-Fleet Map subscription");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const isActive = ['active', 'trialing'].includes(subscription.status);
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();

      logStep("Processing Fleet Map subscription", {
        subscriptionId: subscription.id,
        organizationId,
        status: subscription.status,
        isActive
      });

      // Upsert organization subscription
      const { error: upsertError } = await supabaseClient
        .from('organization_subscriptions')
        .upsert({
          organization_id: organizationId,
          feature_type: 'fleet_map',
          stripe_subscription_id: subscription.id,
          status: isActive ? 'active' : 'inactive',
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          quantity: 1,
          unit_price_cents: subscription.items.data[0]?.price.unit_amount || 1000,
          billing_cycle: subscription.items.data[0]?.price.recurring?.interval || 'month',
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,feature_type'
        });

      if (upsertError) {
        logStep("Error upserting subscription", { error: upsertError });
        throw upsertError;
      }

      logStep("Successfully processed Fleet Map subscription", {
        organizationId,
        status: isActive ? 'active' : 'inactive'
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-fleetmap-webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});