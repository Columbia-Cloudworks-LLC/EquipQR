import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-LICENSE-WEBHOOK] ${step}${detailsStr}`);
};

// Check if event has already been processed using webhook_events table
const isEventProcessed = async (supabaseClient: any, eventId: string): Promise<boolean> => {
  try {
    const { error } = await supabaseClient
      .from("webhook_events")
      .insert({ event_id: eventId });
    
    if (error) {
      if (error.code === '23505') { // Unique violation - event already processed
        logStep("Event already processed", { eventId });
        return true;
      }
      // Other errors should be thrown
      logStep("Error checking event processing status", { eventId, error: error.message });
      throw error;
    }
    
    // Successfully inserted - event is new
    logStep("New event recorded", { eventId });
    return false;
  } catch (error) {
    logStep("Error in event processing check", { eventId, error });
    throw error;
  }
};

// Log processed event for audit trail (keeping existing functionality)
const logProcessedEvent = async (supabaseClient: any, event: any) => {
  const { error } = await supabaseClient
    .from("stripe_event_logs")
    .insert({
      event_id: event.id,
      type: event.type,
      subscription_id: event.data.object.subscription || event.data.object.id,
      payload: event,
    });
  
  if (error) {
    logStep("Error logging processed event", { eventId: event.id, error: error.message });
    throw error;
  }
};

// Handle subscription status updates
const updateSubscriptionStatus = async (supabaseClient: any, subscription: any, status?: string) => {
  const updateData: any = {
    status: status || subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Handle quantity changes
  if (subscription.items?.data?.[0]?.quantity) {
    updateData.quantity = subscription.items.data[0].quantity;
  }

  const { error } = await supabaseClient
    .from("user_license_subscriptions")
    .update(updateData)
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    logStep("Error updating subscription status", { subscriptionId: subscription.id, error: error.message });
    throw error;
  }
};

// Handle member cleanup when subscription changes
const handleMemberCleanup = async (supabaseClient: any, subscriptionId: string, newQuantity: number) => {
  // Get organization ID from subscription record
  const { data: subscriptionRecord } = await supabaseClient
    .from("user_license_subscriptions")
    .select("organization_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!subscriptionRecord) {
    logStep("No subscription record found for member cleanup", { subscriptionId });
    return;
  }

  const organizationId = subscriptionRecord.organization_id;

  // Get current active members (excluding owners)
  const { data: members } = await supabaseClient
    .from("organization_members")
    .select("user_id, role, joined_date")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("joined_date", { ascending: false }); // Most recent first

  if (members) {
    const billableMembers = members.filter((m: any) => m.role !== "owner");
    const excessMembers = billableMembers.length - newQuantity;

    if (excessMembers > 0) {
      // Remove the most recently added members first
      const membersToRemove = billableMembers.slice(0, excessMembers);
      
      for (const member of membersToRemove) {
        await supabaseClient
          .from("organization_members")
          .update({ status: "inactive" })
          .eq("user_id", member.user_id)
          .eq("organization_id", organizationId);
        
        logStep("Deactivated member due to license reduction", { 
          userId: member.user_id, 
          organizationId 
        });
      }
    }
  }
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    logStep("Constructing webhook event", { hasSignature: !!signature, bodyLength: body.length });

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    logStep("Event type", { type: event.type, eventId: event.id });

    // Check idempotency using webhook_events table
    if (await isEventProcessed(supabaseClient, event.id)) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response("Event already processed", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Process event based on type
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout session", { sessionId: session.id });

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const organizationId = session.metadata?.organization_id;
          const licenseQuantity = parseInt(session.metadata?.license_quantity || "0");

          if (!organizationId || !licenseQuantity) {
            logStep("Missing metadata", { organizationId, licenseQuantity });
            return new Response("Missing required metadata", { 
              status: 400,
              headers: corsHeaders 
            });
          }

          logStep("Creating license subscription record", { 
            organizationId, 
            licenseQuantity,
            subscriptionId: subscription.id 
          });

          // Create user license subscription record
          await supabaseClient.from("user_license_subscriptions").insert({
            organization_id: organizationId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            stripe_price_id: subscription.items.data[0].price.id,
            quantity: licenseQuantity,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });

          logStep("Synchronizing organization slots");

          // Sync organization slots
          await supabaseClient.rpc("sync_stripe_subscription_slots", {
            org_id: organizationId,
            subscription_id: subscription.id,
            quantity: licenseQuantity,
            period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });

          logStep("License purchase processed successfully");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          logStep("Processing subscription renewal", { subscriptionId: invoice.subscription });
          
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          // Update subscription record
          await updateSubscriptionStatus(supabaseClient, subscription);

          logStep("Subscription renewal processed");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          logStep("Processing failed payment", { subscriptionId: invoice.subscription });
          
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          // Update subscription status to past_due
          await updateSubscriptionStatus(supabaseClient, subscription, "past_due");

          logStep("Payment failure processed");
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription update", { subscriptionId: subscription.id });

        // Get the previous subscription data to detect quantity changes
        const { data: existingRecord } = await supabaseClient
          .from("user_license_subscriptions")
          .select("*")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (existingRecord) {
          const newQuantity = subscription.items.data[0].quantity || 1;
          const oldQuantity = existingRecord.quantity;

          // Update subscription record
          await updateSubscriptionStatus(supabaseClient, subscription);

          // If quantity was reduced, handle member cleanup
          if (newQuantity < oldQuantity) {
            logStep("Handling license quantity reduction", { oldQuantity, newQuantity });
            await handleMemberCleanup(supabaseClient, subscription.id, newQuantity);
          }

          // Update organization slots
          await supabaseClient.rpc("sync_stripe_subscription_slots", {
            org_id: existingRecord.organization_id,
            subscription_id: subscription.id,
            quantity: newQuantity,
            period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });

          logStep("Subscription update processed");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription cancellation", { subscriptionId: subscription.id });

        // Update subscription status
        await updateSubscriptionStatus(supabaseClient, subscription, "cancelled");

        // Get organization ID to handle member cleanup
        const { data: subscriptionRecord } = await supabaseClient
          .from("user_license_subscriptions")
          .select("organization_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (subscriptionRecord) {
          // Deactivate all non-owner members when subscription is cancelled
          await supabaseClient
            .from("organization_members")
            .update({ status: "inactive" })
            .eq("organization_id", subscriptionRecord.organization_id)
            .neq("role", "owner");

          logStep("Deactivated all non-owner members due to subscription cancellation", {
            organizationId: subscriptionRecord.organization_id
          });
        }

        logStep("Subscription cancelled");
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing trial ending warning", { subscriptionId: subscription.id });

        // Get organization ID from subscription
        const { data: subscriptionRecord } = await supabaseClient
          .from("user_license_subscriptions")
          .select("organization_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (subscriptionRecord) {
          // Get organization owner to notify
          const { data: owner } = await supabaseClient
            .from("organization_members")
            .select("user_id")
            .eq("organization_id", subscriptionRecord.organization_id)
            .eq("role", "owner")
            .eq("status", "active")
            .single();

          if (owner) {
            // Create notification for trial ending
            await supabaseClient.from("notifications").insert({
              organization_id: subscriptionRecord.organization_id,
              user_id: owner.user_id,
              type: "billing",
              title: "Trial Ending Soon",
              message: "Your subscription trial will end in 3 days. Please add a payment method to continue service.",
              data: {
                subscription_id: subscription.id,
                trial_end: new Date(subscription.trial_end! * 1000).toISOString(),
                event_type: "trial_will_end"
              }
            });
          }
        }

        logStep("Trial ending warning processed");
        break;
      }

      case "customer.subscription.paused": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription pause", { subscriptionId: subscription.id });

        // Update subscription status to paused
        await updateSubscriptionStatus(supabaseClient, subscription, "paused");

        // Get organization ID to handle member cleanup
        const { data: subscriptionRecord } = await supabaseClient
          .from("user_license_subscriptions")
          .select("organization_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (subscriptionRecord) {
          // Deactivate all non-owner members when subscription is paused
          await supabaseClient
            .from("organization_members")
            .update({ status: "inactive" })
            .eq("organization_id", subscriptionRecord.organization_id)
            .neq("role", "owner");

          logStep("Deactivated all non-owner members due to subscription pause", {
            organizationId: subscriptionRecord.organization_id
          });
        }

        logStep("Subscription pause processed");
        break;
      }

      case "customer.subscription.resumed": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription resume", { subscriptionId: subscription.id });

        // Update subscription status back to active
        await updateSubscriptionStatus(supabaseClient, subscription, "active");

        // Get organization ID to reactivate members within license limits
        const { data: subscriptionRecord } = await supabaseClient
          .from("user_license_subscriptions")
          .select("organization_id, quantity")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (subscriptionRecord) {
          // Get inactive members (excluding owners) ordered by most recent first
          const { data: inactiveMembers } = await supabaseClient
            .from("organization_members")
            .select("user_id, joined_date")
            .eq("organization_id", subscriptionRecord.organization_id)
            .eq("status", "inactive")
            .neq("role", "owner")
            .order("joined_date", { ascending: false })
            .limit(subscriptionRecord.quantity);

          if (inactiveMembers && inactiveMembers.length > 0) {
            // Reactivate members up to subscription quantity limit
            for (const member of inactiveMembers) {
              await supabaseClient
                .from("organization_members")
                .update({ status: "active" })
                .eq("user_id", member.user_id)
                .eq("organization_id", subscriptionRecord.organization_id);
            }

            logStep("Reactivated members after subscription resume", {
              organizationId: subscriptionRecord.organization_id,
              reactivatedCount: inactiveMembers.length
            });
          }
        }

        logStep("Subscription resume processed");
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    // Log the processed event for audit trail (keeping existing functionality)
    await logProcessedEvent(supabaseClient, event);

    return new Response("Webhook processed", { 
      status: 200,
      headers: corsHeaders 
    });
  } catch (error) {
    // Log the full error server-side for debugging
    logStep("ERROR in webhook", { 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return generic message to client - never expose error.message directly
    return new Response("Webhook processing failed", { 
      status: 400,
      headers: corsHeaders 
    });
  }
});
