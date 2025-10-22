import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Read parameters from request body
  let params: any = {};
  try {
    params = await req.json();
  } catch {
    params = {};
  }
  
  const partId = params.id;
  
  if (!partId) {
    return new Response(JSON.stringify({ error: "id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: part, error: partErr } = await supabase
    .from('part')
    .select('id,canonical_mpn,title,brand,category,description,attributes,synonyms')
    .eq('id', partId)
    .single();
  if (partErr || !part) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: listings, error: listErr } = await supabase
    .from('distributor_listing')
    .select('sku, distributor:distributor_id(id,name,phone,website,email)')
    .eq('part_id', partId);
  if (listErr) {
    return new Response(JSON.stringify({ error: listErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const distributors = (listings ?? []).map((l: any) => ({
    name: l.distributor?.name,
    phone: l.distributor?.phone,
    website: l.distributor?.website,
    email: l.distributor?.email,
  }));

  return new Response(JSON.stringify({ part, distributors }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
