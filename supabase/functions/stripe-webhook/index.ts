
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    console.log("[STRIPE-WEBHOOK] DEPRECATED: Redirecting to stripe-license-webhook");

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Get the base URL from the request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Forward the request to the new webhook
    const targetUrl = `${baseUrl}/functions/v1/stripe-license-webhook`;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': req.headers.get('Content-Type') || '',
        'stripe-signature': req.headers.get('stripe-signature') || '',
      },
      body: req.method !== 'GET' ? await req.text() : undefined,
    });

    const responseText = await response.text();
    
    return new Response(responseText, {
      status: response.status,
      headers: corsHeaders
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[STRIPE-WEBHOOK] Redirect error:", errorMessage);
    
    return new Response(`Webhook redirect error: ${errorMessage}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
