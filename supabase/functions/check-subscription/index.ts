import {
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

const BILLING_RETIRED_RESPONSE = {
  code: "billing_retired",
  message: "Subscription billing runtime is retired and no longer available.",
};

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  return createJsonResponse(BILLING_RETIRED_RESPONSE, 410);
});
