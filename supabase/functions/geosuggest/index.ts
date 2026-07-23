import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const YANDEX_GEOSUGGEST_API_KEY = Deno.env.get("YANDEX_GEOSUGGEST_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const urlParams = new URL(req.url).searchParams;

    const text = String(payload.text ?? urlParams.get("text") ?? "").trim();
    if (text.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      apikey: YANDEX_GEOSUGGEST_API_KEY,
      text,
      lang: String(payload.lang ?? urlParams.get("lang") ?? "en"),
      results: String(payload.results ?? urlParams.get("results") ?? 7),
      ll: String(payload.ll ?? urlParams.get("ll") ?? "44.5152,40.1872"),
      spn: String(payload.spn ?? urlParams.get("spn") ?? "2,2"),
      ull: String(payload.ull ?? urlParams.get("ull") ?? "44.5152,40.1872"),
      print_address: "1",
      attrs: "uri",
    });

    const response = await fetch(`https://suggest-maps.yandex.ru/v1/suggest?${params}`);
    const raw = await response.text();

    let data: { results?: unknown[] } = { results: [] };
    try {
      data = raw ? JSON.parse(raw) : { results: [] };
    } catch {
      data = { results: [] };
    }

    return new Response(JSON.stringify({
      results: Array.isArray(data.results) ? data.results : [],
      upstreamStatus: response.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Geosuggest proxy error:", message);
    return new Response(JSON.stringify({ error: message, results: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
