import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Try JSON body first, then fall back to URL query
  let params: any = {};
  try { params = await req.json(); } catch {}
  const url = new URL(req.url);
  const q = params.q ?? url.searchParams.get("q");
  const brand = params.brand ?? url.searchParams.get("brand");
  const category = params.category ?? url.searchParams.get("category");
  const limit = Number(params.limit ?? url.searchParams.get("limit") ?? 10);

  if (!q) {
    return new Response(JSON.stringify({ error: "q required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const host = Deno.env.get("TYPESENSE_HOST") ?? "localhost";
  const port = Deno.env.get("TYPESENSE_PORT") ?? "8108";
  const protocol = Deno.env.get("TYPESENSE_PROTOCOL") ?? "http";
  const apiKey = Deno.env.get("TYPESENSE_API_KEY") ?? "";

  const filters: string[] = [];
  if (brand) filters.push(`brand:='${String(brand).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`);
  if (category) filters.push(`category:='${String(category).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`);

  const searchParams: Record<string, unknown> = {
    q,
    query_by: "canonical_mpn,normalized_tokens,title,brand,synonyms",
    query_by_weights: "5,5,3,2,2",
    prefix: true,
    num_typos: 2,
    per_page: limit,
    filter_by: filters.length ? filters.join(" && ") : undefined,
    sort_by: "popularity:desc",
  };

  const omitPort = (protocol === 'https' && String(port) === '443') || (protocol === 'http' && String(port) === '80');
  const baseUrl = `${protocol}://${host}${omitPort ? '' : `:${port}`}`;

  try {
    // Try POST first
    let res = await fetch(`${baseUrl}/collections/parts/documents/search`, {
      method: "POST",
      headers: { "X-TYPESENSE-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(searchParams),
    });

    // If POST returns 404, fall back to GET (some Typesense clusters require GET)
    if (res.status === 404) {
      const qs = new URLSearchParams({
        q: String(q),
        query_by: "canonical_mpn,normalized_tokens,title,brand,synonyms",
        prefix: "true",
        num_typos: "2",
        per_page: String(limit),
      });
      if (filters.length) qs.append("filter_by", filters.join(" && "));
      const getUrl = `${baseUrl}/collections/parts/documents/search?${qs.toString()}`;
      res = await fetch(getUrl, {
        method: "GET",
        headers: { "X-TYPESENSE-API-KEY": apiKey },
      });
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("[parts-search] Typesense error:", { status: res.status, text, searchParams, baseUrl });
      return new Response(JSON.stringify({ error: text, status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const data = await res.json();
    const hits = (data.hits ?? []).map((h: any) => h.document);
    const cards = hits.map((d: any) => ({
      id: d.id,
      canonical_mpn: d.canonical_mpn,
      title: d.title,
      brand: d.brand,
      category: d.category,
      distributor_count: d.distributor_count,
      has_distributors: d.has_distributors,
    }));
    return new Response(JSON.stringify({ results: cards }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[parts-search] Fetch failed", { message: (err as Error).message, baseUrl, searchParams });
    return new Response(JSON.stringify({ error: "typesense_unreachable", details: (err as Error).message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
