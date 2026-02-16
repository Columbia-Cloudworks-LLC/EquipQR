/**
 * Purchase User Licenses Edge Function
 *
 * Creates a Stripe checkout session for purchasing user licenses.
 * Requires authenticated user who is the organization owner.
 * Uses user-scoped client so RLS policies apply.
 */

import Stripe from "https://esm.sh/stripe@14.21.0";
import { getValidatedOrigin } from "../_shared/origin-validation.ts";
import {
  createUserSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PURCHASE-USER-LICENSES] ${step}${detailsStr}`);
};

interface PurchaseRequest {
  quantity: number;
  organizationId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Create user-scoped client (RLS enforced)
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
    logStep("User authenticated", { userId: user.id });

    const body: PurchaseRequest = await req.json();
    const { quantity, organizationId } = body;

    if (!quantity || !organizationId) {
      return createErrorResponse("Quantity and organizationId are required", 400);
    }
    logStep("Request data", { quantity, organizationId });

    // Verify user has owner role in the organization (RLS will apply)
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError) {
      logStep("Membership query error", { error: membershipError });
      return createErrorResponse("Failed to verify organization membership", 500);
    }

    if (!membership || membership.role !== "owner") {
      logStep("Authorization failed", { membership });
      return createErrorResponse(
        "Only organization owners can purchase licenses",
        403
      );
    }
    logStep("Authorization verified", { role: membership.role });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer");
    }

    // Use existing product and price IDs for user licenses
    // Can be overridden via STRIPE_USER_LICENSE_PRICE_ID environment variable
    const DEFAULT_PRICE_ID = "price_1RU6PMF7dmK1pWnR58UJKOPh"; // $10/month per license
    const envPriceId = Deno.env.get("STRIPE_USER_LICENSE_PRICE_ID");
    if (!envPriceId) {
      logStep("Configuration warning: STRIPE_USER_LICENSE_PRICE_ID is not set, falling back to DEFAULT_PRICE_ID", {
        defaultPriceId: DEFAULT_PRICE_ID,
      });
    }
    const PRICE_ID = envPriceId ?? DEFAULT_PRICE_ID;

    // Verify the price exists in Stripe
    try {
      await stripe.prices.retrieve(PRICE_ID);
      logStep("Using existing price", { priceId: PRICE_ID });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logStep("ERROR: Price not found", { priceId: PRICE_ID, error: errorMsg });
      return createErrorResponse(
        `Stripe price ${PRICE_ID} not found. Please verify the price ID.`,
        500
      );
    }

    const origin = getValidatedOrigin(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: PRICE_ID,
          quantity: quantity,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?cancelled=true`,
      metadata: {
        user_id: user.id,
        organization_id: organizationId,
        license_quantity: quantity.toString(),
      },
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          license_quantity: quantity.toString(),
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return createJsonResponse({ url: session.url, sessionId: session.id });
  } catch (error) {
    // Log the full error server-side for debugging
    logStep("ERROR in purchase-user-licenses", { 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return generic message to client - never expose error.message directly
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
