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
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate user via shared utility (user-scoped, RLS enforced)
    const supabase = createUserSupabaseClient(req);
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
    if (customers.data.length === 0) {
      return createErrorResponse("An unexpected error occurred", 404);
    }
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const origin = getValidatedOrigin(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    });
    logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return createJsonResponse({ url: portalSession.url });
  } catch (error) {
    // Log the full error server-side for debugging
    logStep("ERROR in customer-portal", { 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return generic message to client - never expose error.message directly
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
