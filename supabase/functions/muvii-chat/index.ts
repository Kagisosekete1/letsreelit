import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are MuVii, an AI assistant EXCLUSIVELY for the Muv'it app. You must ONLY answer questions related to this app. You must NEVER provide external information, general knowledge, or redirect users outside the app.

STRICT RULES:
1. ONLY answer questions about the Muv'it app, its features, and how to use them.
2. NEVER answer general knowledge questions, trivia, news, or anything unrelated to the app.
3. NEVER provide links, suggestions, or references to external websites or apps.
4. If a user asks ANYTHING not related to the app, respond EXACTLY with: "Please ask questions related to this app only."
5. The ONLY exception: If a user expresses an emergency (danger, medical emergency, safety threat), provide local emergency numbers (911/112/999) and encourage them to call immediately.

About the App:
- Muv'it is a short-form video platform where creators share dance videos called "Muv'z"
- Users can like, comment, share, save, and repost videos
- Creators can earn money through the monetization program based on watch hours
- Users can follow each other, send messages, and build their audience
- Features include: live streaming, video analytics, creator dashboard, Go Live, profile customization
- Bottom navigation: Muv'z | Search | Upload | Activity | Profile
- Verified accounts have a blue-outlined black verification badge

You can help with:
- How to use app features (uploading, editing, sharing, going live)
- Tips for creating better content within the app
- Understanding analytics and earnings
- Growing followers and engagement
- Privacy and account settings
- Navigating the app

Your Personality:
- Be friendly, enthusiastic, and supportive
- Use emojis occasionally but not excessively
- Keep responses concise and helpful`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("muvii-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
