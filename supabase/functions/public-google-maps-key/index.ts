
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[public-google-maps-key] Function invoked", {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    const browserKey = Deno.env.get("VITE_GOOGLE_MAPS_BROWSER_KEY");
    console.log("[public-google-maps-key] Environment check", {
      hasKey: !!browserKey,
      keyLength: browserKey?.length || 0
    });

    if (!browserKey) {
      console.error("[public-google-maps-key] Missing API key in environment");
      return new Response(JSON.stringify({ 
        error: "VITE_GOOGLE_MAPS_BROWSER_KEY is not configured in Supabase Edge Function secrets" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("[public-google-maps-key] Successfully returning API key");
    return new Response(JSON.stringify({ key: browserKey }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
      status: 200,
    });
  } catch (error) {
    console.error("[public-google-maps-key] Function error:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
