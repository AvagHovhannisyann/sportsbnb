import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, HttpError } from "../_shared/auth.ts";
import { AI_MODELS, chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user } = await requireUser(req);

    const { prompt, type, bucket } = await req.json();

    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only known public buckets; path is always server-generated and scoped to the caller.
    const ALLOWED_BUCKETS = ["team-logos", "avatars", "blog-images"];
    const targetBucket = ALLOWED_BUCKETS.includes(bucket) ? bucket : "team-logos";
    const targetPath = `${user.id}/${crypto.randomUUID()}.png`;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Build the prompt based on type
    let imagePrompt: string;
    if (type === "team-logo") {
      imagePrompt = `Create a modern, clean sports team logo/emblem for a team described as: "${prompt}". The logo should be circular or shield-shaped, professional quality, vibrant colors, suitable for a sports team. No text in the image. Simple, iconic design.`;
    } else if (type === "avatar") {
      imagePrompt = `Create a stylish, modern avatar/profile picture based on this description: "${prompt}". The avatar should be a unique, artistic representation suitable for a sports platform profile picture. Clean design, vibrant colors, no real human faces. Abstract or character-style.`;
    } else if (type === "blog-cover") {
      imagePrompt = prompt;
    } else {
      imagePrompt = prompt;
    }

    const aiResponse = await chatCompletion({
      model: AI_MODELS.image,
      messages: [{ role: "user", content: imagePrompt }],
      modalities: ["image", "text"],
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await aiResponse.text();
      console.error("AI error:", aiResponse.status, text);
      throw new Error("Failed to generate image");
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    // Extract base64 data and upload to storage
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(targetPath, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload image");
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from(targetBucket)
      .getPublicUrl(targetPath);

    return new Response(JSON.stringify({ url: publicUrl.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("generate-ai-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
