import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // DEPRECATED: Parts picker feature is not being implemented at this time
  return new Response(JSON.stringify({ 
    error: "This function is deprecated. Parts picker feature is not currently available.",
    deprecated: true 
  }), {
    status: 410, // Gone - indicates the resource is no longer available
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  // Original implementation preserved for reference (commented out)
  // See git history for the full Typesense integration code
});
