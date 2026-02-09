import Stripe from "https://esm.sh/stripe@14.21.0";
import {
  createUserSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import { getValidatedOrigin } from "../_shared/origin-validation.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate user via shared utility
    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;
    if (!user.email) {
      return createErrorResponse("User email not available", 400);
    }
    logStep("User authenticated", { userId: user.id });

    const { priceId, organizationId } = await req.json();
    if (!priceId) {
      return createErrorResponse("Missing required field: priceId", 400);
    }

    // Validate priceId against server-side allowlist (if configured)
    const ALLOWED_PRICE_IDS = (Deno.env.get("ALLOWED_STRIPE_PRICE_IDS") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ALLOWED_PRICE_IDS.length > 0 && !ALLOWED_PRICE_IDS.includes(priceId)) {
      logStep("Rejected priceId not in allowlist", { priceId });
      return createErrorResponse("Invalid price selected", 400);
    }

    logStep("Request data", { priceId, organizationId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer");
    }

    const origin = getValidatedOrigin(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?cancelled=true`,
      metadata: {
        user_id: user.id,
        organization_id: organizationId || '',
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return createJsonResponse({ url: session.url });
  } catch (error) {
    // Log the full error server-side for debugging
    logStep("ERROR in create-checkout", { 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return generic message to client - never expose error.message directly
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
