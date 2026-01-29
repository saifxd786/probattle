import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  userId?: string;
}

// Keywords that indicate serious issues requiring admin attention
const SERIOUS_ISSUE_KEYWORDS = [
  // Payment issues
  'paisa nahi aaya', 'money not credited', 'payment stuck', 'withdrawal pending',
  'deposit failed', 'amount deducted', 'refund', 'paise nahi mile',
  'utr', 'transaction failed', 'payment issue', 'paisa kat gaya',
  
  // Technical issues
  'app crash', 'game stuck', 'not working', 'error', 'bug', 'glitch',
  'kaam nahi kar raha', 'band ho gaya', 'freeze', 'hang',
  
  // Account issues
  'account banned', 'login nahi ho raha', 'account hacked', 'password reset failed',
  'verification failed', 'kyc rejected',
  
  // Fraud/Security
  'fraud', 'scam', 'cheating', 'hack', 'stolen', 'chori',
  
  // Urgent markers
  'urgent', 'emergency', 'help me please', 'bahut zaruri', 'jaldi karo',
  'serious problem', 'big issue', 'major problem'
];

// Phrases that indicate AI cannot resolve the issue
const ESCALATION_PHRASES = [
  'main is issue ko resolve nahi kar sakta',
  'admin se contact karna hoga',
  'aapko support ticket create karna chahiye',
  'manual verification required',
  'please contact admin',
  'yeh mujhse solve nahi hoga',
  'human support chahiye',
  'team se baat karni hogi'
];

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

## IMPORTANT: Issue Escalation Rules
When you encounter these SERIOUS issues that you CANNOT resolve, you MUST add "[ESCALATE_TO_ADMIN]" at the END of your response:

1. **Payment Issues**: Money not credited, withdrawal stuck for days, refund needed, large amount issues
2. **Account Security**: Account hacked, suspicious activity, ban appeals
3. **Technical Bugs**: Repeated crashes, game-breaking bugs, data loss
4. **Fraud Reports**: Cheating, scam, unfair gameplay
5. **Urgent Issues**: When user says urgent/emergency/bahut zaruri

When escalating, always:
- Acknowledge the user's problem
- Explain you're forwarding to admin team
- Assure them someone will look into it

Example escalation response:
"Main samajh sakta hoon yeh serious issue hai. Aapki problem admin team ko forward kar raha hoon - woh jaldi se jaldi aapko contact karenge. [ESCALATE_TO_ADMIN]"

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
- For serious unresolvable issues, add [ESCALATE_TO_ADMIN] at the end

## Image Analysis:
- If user sends screenshots of errors, analyze them carefully
- Look for error messages, transaction IDs, amounts
- Provide specific guidance based on what you see in the image`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, category, subCategory, language, userId } = await req.json() as RequestBody;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check if user message contains serious issue keywords
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userContent = lastUserMessage?.content?.toLowerCase() || '';
    const hasSeriousKeywords = SERIOUS_ISSUE_KEYWORDS.some(keyword => 
      userContent.includes(keyword.toLowerCase())
    );

    // Build context based on category
    let contextPrompt = SYSTEM_PROMPT;
    contextPrompt += `\n\n## Current User Context:\n`;
    contextPrompt += `- Category: ${category}\n`;
    contextPrompt += `- Specific Issue: ${subCategory}\n`;
    contextPrompt += `- Preferred Language: ${language}\n`;
    if (hasSeriousKeywords) {
      contextPrompt += `- ⚠️ SERIOUS ISSUE DETECTED - Consider escalation if needed\n`;
    }

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
    let aiReply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process your request. Please try again.";

    // Check if AI wants to escalate
    const shouldEscalate = aiReply.includes('[ESCALATE_TO_ADMIN]');
    
    // Remove the escalation marker from the visible reply
    aiReply = aiReply.replace('[ESCALATE_TO_ADMIN]', '').trim();

    // If escalation is needed and we have userId, create support ticket
    if (shouldEscalate && userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Build conversation summary for admin
        const conversationSummary = messages
          .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
          .join('\n\n');

        // Create support ticket
        const { data: ticket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert({
            user_id: userId,
            subject: `[AI Escalated] ${category} - ${subCategory}`,
            status: 'open',
            priority: 'high',
          })
          .select()
          .single();

        if (!ticketError && ticket) {
          // Add the conversation as initial message
          await supabase
            .from('support_messages')
            .insert({
              ticket_id: ticket.id,
              sender_id: userId,
              sender_type: 'user',
              message: `🤖 **AI Support Escalation**\n\n**Category:** ${category}\n**Issue:** ${subCategory}\n\n---\n\n**Conversation:**\n${conversationSummary}\n\n---\n\n*This ticket was automatically created by AI Support after detecting a serious issue that requires admin attention.*`,
            });

          console.log('Created escalation ticket:', ticket.id);
        }
      } catch (escalationError) {
        console.error('Failed to create escalation ticket:', escalationError);
      }
    }

    return new Response(
      JSON.stringify({ 
        reply: aiReply,
        escalated: shouldEscalate,
      }),
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