import { withCorrelationId, type RequestContext } from "./supabase-clients.ts";
import {
  createQuickBooksServiceSupabaseClient,
  handleQuickBooksCorsPreflight,
  loadQuickBooksFunctionSecrets,
  type QuickBooksFunctionSecrets,
} from "./quickbooks-function-bootstrap.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export type QuickBooksHandlerContext = {
  req: Request;
  ctx: RequestContext;
  corsHeaders: Record<string, string>;
  secrets: QuickBooksFunctionSecrets;
  supabaseClient: SupabaseClient;
};

export type QuickBooksHandler = (context: QuickBooksHandlerContext) => Promise<Response>;

/**
 * Shared Deno.serve wrapper for QuickBooks edge functions: CORS preflight,
 * secret load, and service-role Supabase client creation.
 */
export function serveQuickBooksFunction(
  functionName: string,
  logStep: (step: string, details?: Record<string, unknown>) => void,
  handler: QuickBooksHandler,
): void {
  Deno.serve(
    withCorrelationId(async (req, ctx) => {
      const { corsHeaders, preflightResponse } = handleQuickBooksCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }

      logStep("Function started", { correlation_id: ctx.correlationId });

      const secrets = loadQuickBooksFunctionSecrets(functionName);
      const supabaseClient = createQuickBooksServiceSupabaseClient(
        secrets.supabaseUrl,
        secrets.supabaseServiceKey,
      );

      return await handler({
        req,
        ctx,
        corsHeaders,
        secrets,
        supabaseClient,
      });
    }),
  );
}
