const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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
    // Generate a unique error ID to correlate client response with server logs
    const errorId = crypto.randomUUID();

    // Log the full error server-side for debugging, including the error ID
    console.error("[STRIPE-WEBHOOK] Redirect error:", { errorId, error });

    // Return generic message to client with a reference ID - never expose error.message directly
    return new Response(`Webhook processing failed. Reference ID: ${errorId}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
