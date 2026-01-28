import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportMessage {
  role: "user" | "assistant";
  content: string;
  image?: string; // base64 image
}

interface RequestBody {
  messages: SupportMessage[];
  category: string;
  subCategory: string;
  language: string;
  hasImage: boolean;
}

const SYSTEM_PROMPT = `You are ProBattle's advanced AI Support Assistant. You provide professional, friendly, and helpful support in multiple languages including Hindi, English, and Hinglish (mixed Hindi-English).

## Your Personality:
- Professional yet friendly and approachable
- Patient and understanding
- Quick to resolve issues
- Empathetic towards user frustrations

## Language Guidelines:
- Always respond in the SAME language the user writes in
- If user writes in Hindi, respond in Hindi
- If user writes in English, respond in English  
- If user writes in Hinglish (mixed), respond in Hinglish
- Use simple, easy-to-understand language

## Knowledge Base:

### Games Available:
1. **Ludo** - Classic board game with online multiplayer, play vs bots or friends
2. **Mines** - Grid-based game where players reveal safe tiles while avoiding mines
3. **Thimble** - Guess which cup has the ball after shuffling
4. **BGMI Tournaments** - Battle Grounds Mobile India tournament registrations

### Common Issues & Solutions:

**DEPOSIT ISSUES:**
- Minimum deposit: ₹50
- Supported methods: UPI (GPay, PhonePe, Paytm)
- Processing time: Usually instant, max 15 minutes
- If deposit not credited: Check UTR number, wait 15 mins, then contact with screenshot

**WITHDRAWAL ISSUES:**
- Minimum withdrawal: ₹100
- Processing time: 24-48 hours (usually faster)
- Requires KYC verification for large amounts
- Check UPI ID is correct

**LUDO GAME ISSUES:**
- Matchmaking timeout: Check internet connection, try again
- Sync issues in friend match: Both players refresh, use sync button
- Entry fee deducted but match cancelled: Refund processed within 30 mins

**MINES GAME ISSUES:**
- Game stuck: Refresh page, balance will be safe
- Payout not credited: Wait 2 minutes, check transaction history

**THIMBLE GAME ISSUES:**
- Animation lag: Clear browser cache, use stable internet
- Result dispute: All results are provably fair and recorded

**BGMI TOURNAMENT ISSUES:**
- Room ID/Password: Shared 15 mins before match time
- Registration payment: Use wallet balance
- Slot full: Wait for next tournament

**ACCOUNT ISSUES:**
- Login problems: Use forgot password feature
- Account banned: Contact admin with appeal
- Profile update: Go to Profile page

## Response Format:
- Be concise but helpful
- Use bullet points for steps
- Provide specific solutions
- Ask clarifying questions if needed
- Always end with "Kuch aur help chahiye?" or equivalent in user's language

## Image Analysis:
- If user sends screenshots of errors, analyze them carefully
- Look for error messages, transaction IDs, amounts
- Provide specific guidance based on what you see in the image`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, category, subCategory, language } = await req.json() as RequestBody;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context based on category
    let contextPrompt = SYSTEM_PROMPT;
    contextPrompt += `\n\n## Current User Context:\n`;
    contextPrompt += `- Category: ${category}\n`;
    contextPrompt += `- Specific Issue: ${subCategory}\n`;
    contextPrompt += `- Preferred Language: ${language}\n`;

    // Build messages for AI
    const aiMessages: any[] = [
      { role: "system", content: contextPrompt }
    ];

    // Add conversation history with image support
    for (const msg of messages) {
      if (msg.image) {
        // Multimodal message with image
        aiMessages.push({
          role: msg.role,
          content: [
            { type: "text", text: msg.content || "Please analyze this image and help me." },
            {
              type: "image_url",
              image_url: { url: msg.image }
            }
          ]
        });
      } else {
        aiMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Use gemini-2.5-flash for multimodal support
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process your request. Please try again.";

    return new Response(
      JSON.stringify({ reply: aiReply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Support Chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
