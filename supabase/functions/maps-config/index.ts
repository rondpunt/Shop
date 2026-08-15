const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Public endpoint — Maps key may be referrer-restricted via Google Cloud Console.
  // PWA gebruikers (zonder login) moeten ook de kaart kunnen zien.
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing GOOGLE_MAPS_API_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ apiKey }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
