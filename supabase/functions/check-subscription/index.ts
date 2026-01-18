/**
 * Check Subscription Edge Function
 *
 * Checks the user's Stripe subscription status and updates the local cache.
 * Uses user-scoped client for auth, admin client for subscriber table upsert.
 * The subscriber table upsert uses admin because it's a self-referential update
 * for the authenticated user only.
 */

import Stripe from "https://esm.sh/stripe@14.21.0";
import {
  createUserSupabaseClient,
  createAdminSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Create user-scoped client for authentication
    const supabase = createUserSupabaseClient(req);

    // Validate user authentication
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;
    if (!user.email) {
      return createErrorResponse("User email not available", 400);
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    // Use admin client for subscriber table updates
    // This is a controlled operation: we're only updating the authenticated user's own record
    const adminClient = createAdminSupabaseClient();

    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await adminClient.from("subscribers").upsert(
        {
          email: user.email,
          user_id: user.id,
          stripe_customer_id: null,
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );
      return createJsonResponse({ subscribed: false });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier: string | null = null;
    let subscriptionEnd: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(
        subscription.current_period_end * 1000
      ).toISOString();
      logStep("Active subscription found", {
        subscriptionId: subscription.id,
        endDate: subscriptionEnd,
      });

      // Determine subscription tier from price
      let totalAmount = 0;
      for (const item of subscription.items.data) {
        const price = await stripe.prices.retrieve(item.price.id);
        totalAmount += (price.unit_amount || 0) * (item.quantity || 1);
      }

      if (totalAmount <= 999) {
        subscriptionTier = "Basic";
      } else if (totalAmount <= 2999) {
        subscriptionTier = "Premium";
      } else {
        subscriptionTier = "Enterprise";
      }
      logStep("Determined subscription tier", { totalAmount, subscriptionTier });
    } else {
      logStep("No active subscription found");
    }

    await adminClient.from("subscribers").upsert(
      {
        email: user.email,
        user_id: user.id,
        stripe_customer_id: customerId,
        subscribed: hasActiveSub,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    logStep("Updated database with subscription info", {
      subscribed: hasActiveSub,
      subscriptionTier,
    });

    return createJsonResponse({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return createErrorResponse(errorMessage, 500);
  }
});
