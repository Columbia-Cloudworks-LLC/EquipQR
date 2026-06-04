import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "./cors.ts";
import { requireSecret } from "./require-secret.ts";

export type QuickBooksFunctionSecrets = {
  clientId: string;
  clientSecret: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
};

/** Load Intuit + Supabase secrets before auth checks (missing-secret contract). */
export function loadQuickBooksFunctionSecrets(functionName: string): QuickBooksFunctionSecrets {
  return {
    clientId: requireSecret("INTUIT_CLIENT_ID", { functionName }),
    clientSecret: requireSecret("INTUIT_CLIENT_SECRET", { functionName }),
    supabaseUrl: requireSecret("SUPABASE_URL", { functionName }),
    supabaseServiceKey: requireSecret("SUPABASE_SERVICE_ROLE_KEY", { functionName }),
  };
}

export function createQuickBooksServiceSupabaseClient(
  supabaseUrl: string,
  supabaseServiceKey: string,
): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export function handleQuickBooksCorsPreflight(req: Request): {
  corsHeaders: Record<string, string>;
  preflightResponse: Response | null;
} {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return {
      corsHeaders,
      preflightResponse: new Response(null, { headers: corsHeaders }),
    };
  }
  return { corsHeaders, preflightResponse: null };
}
