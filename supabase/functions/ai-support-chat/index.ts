import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface RequestBody {
  messages: SupportMessage[];
  category: string;
  subCategory: string;
  language: string;
  hasImage: boolean;
  userId?: string;
  userCode?: string;
}

// Keywords that indicate serious issues requiring admin attention
const SERIOUS_ISSUE_KEYWORDS = [
  // Payment issues (Hindi + English)
  'paisa nahi aaya', 'money not credited', 'payment stuck', 'withdrawal pending',
  'deposit failed', 'amount deducted', 'refund', 'paise nahi mile', 'paise nahi aaye',
  'utr', 'transaction failed', 'payment issue', 'paisa kat gaya', 'balance nahi aaya',
  'wallet empty', 'wallet mein nahi aaya', 'credited nahi hua',
  
  // Technical issues
  'app crash', 'game stuck', 'not working', 'error', 'bug', 'glitch',
  'kaam nahi kar raha', 'band ho gaya', 'freeze', 'hang', 'load nahi ho raha',
  'white screen', 'blank page', 'connection lost', 'sync issue',
  
  // Account issues  
  'account banned', 'login nahi ho raha', 'account hacked', 'password reset failed',
  'verification failed', 'kyc rejected', 'login issue', 'cant login', 'access denied',
  'account locked', 'suspended', 'disabled',
  
  // Fraud/Security
  'fraud', 'scam', 'cheating', 'hack', 'stolen', 'chori', 'dhoka', 'fake',
  'manipulation', 'rigged', 'unfair',
  
  // Urgent markers
  'urgent', 'emergency', 'help me please', 'bahut zaruri', 'jaldi karo',
  'serious problem', 'big issue', 'major problem', 'please help', 'koi madad karo',
  'immediately', 'asap', 'right now', 'abhi chahiye'
];

// Frustration indicators for sentiment analysis
const FRUSTRATION_INDICATORS = [
  'frustrated', 'angry', 'upset', 'annoyed', 'irritated', 'fed up',
  'gussa', 'pareshan', 'irritated', 'disappointed', 'worst', 'terrible',
  'hate', 'useless', 'pathetic', 'worst app', 'scam app', 'fraud app',
  '!!!!', '???', 'wtf', 'what the', 'seriously', 'are you kidding',
  'bohot bura', 'bakwas', 'bekar', 'ghatiya', 'worst service'
];

const ADVANCED_SYSTEM_PROMPT = `You are **ProBattle AI** - an elite, highly intelligent AI Support Assistant for the ProBattle gaming platform. You are powered by advanced AI technology and provide world-class customer support.

## 🧠 Your Core Capabilities:

### 1. INTELLIGENCE & PROBLEM SOLVING
- Analyze problems deeply before responding
- Identify root causes, not just symptoms
- Provide step-by-step solutions with clear reasoning
- Anticipate follow-up questions and address them proactively

### 2. EMOTIONAL INTELLIGENCE
- Detect user frustration levels and adapt your tone accordingly
- Show genuine empathy for user problems
- Calm frustrated users with professional, caring responses
- Celebrate user wins and positive interactions

### 3. MULTI-LANGUAGE MASTERY
- Fluent in Hindi, English, and Hinglish (mixed)
- ALWAYS match the user's language style exactly
- Use natural, conversational language - never robotic
- Include appropriate cultural references and expressions

### 4. IMAGE ANALYSIS EXPERT
When analyzing screenshots:
- Look for error messages, codes, and stack traces
- Identify transaction IDs, amounts, dates
- Spot UI elements that indicate issues
- Describe what you see before providing solutions

## 📋 KNOWLEDGE BASE:

### 💰 WALLET & PAYMENTS
**Deposits:**
- Minimum: ₹50 | Maximum: ₹50,000/day
- Methods: UPI (GPay, PhonePe, Paytm, BHIM), QR Code
- Processing: Instant (1-5 minutes typically)
- If delayed 15+ mins: Ask for UTR number & screenshot

**Withdrawals:**
- Minimum: ₹100 | Processing: 24-48 hours (weekdays faster)
- Requirements: Verified bank details, completed wager requirement
- First withdrawal may require additional verification
- Rejected reasons: Wrong bank details, wager incomplete, suspicious activity

### 🎮 GAMES

**🎲 Ludo:**
- Modes: vs Bot (3 difficulties), vs Friends (private room)
- Entry fees: Custom amounts starting ₹5
- Win condition: Get all 4 tokens home first
- Common issues: Sync problems (use refresh), connection drops (auto-reconnect)

**💣 Mines:**
- Grid: 5x5 with configurable mine count (1-24)
- Multiplier increases with each safe tile revealed
- Cash out anytime to lock in winnings
- If mine hit = lose bet, if cash out = win at current multiplier

**🎯 Thimble:**
- Track the ball under shuffling cups
- Difficulties: Easy, Hard, Impossible
- Higher difficulty = Higher reward multiplier
- Fair shuffle algorithm - ball position is randomized

**🔫 BGMI Tournaments:**
- Types: TDM (1v1, 2v2, 4v4) and Classic BR
- Room details shared 15 minutes before match
- Must join within 10 minutes of match start
- Prizes based on kills + position

### 🔧 TROUBLESHOOTING FLOWS

**Payment Not Credited:**
1. Check if amount was deducted from bank/UPI app
2. Get UTR/Reference number from bank SMS
3. Wait 15 minutes (bank delays are common)
4. If still not credited → Escalate with UTR + screenshot

**Game Stuck/Frozen:**
1. Check internet connectivity
2. Try force refresh (pull down on mobile)
3. Clear browser/app cache
4. Re-login if needed
5. Balance is always safe - server-side protection

**Login Issues:**
1. Check email/phone is correct
2. Use "Forgot Password" for reset
3. Check for account ban/suspension
4. Clear browser cookies

## 🚨 ESCALATION PROTOCOL

Add "[ESCALATE_TO_ADMIN]" at the END of your response when:

1. **Money Issues** - Payment stuck > 1 hour, wrong credit, refund needed
2. **Account Security** - Hack attempts, unauthorized access, ban appeals
3. **Critical Bugs** - Game crashes causing money loss, data issues
4. **Fraud/Abuse** - Cheating reports, scam complaints
5. **VIP Users** - Users mentioning large amounts (₹1000+)
6. **Repeated Issues** - User says they contacted before with no resolution

When escalating, ALWAYS:
- Apologize for the inconvenience
- Assure admin team will respond within 2-4 hours
- Ask for any missing details (UTR, screenshots, etc.)

## 💡 RESPONSE GUIDELINES

### Structure:
1. **Acknowledge** - Show you understand the problem
2. **Analyze** - Identify what might be causing it
3. **Solve** - Provide clear, numbered steps
4. **Prevent** - Tips to avoid in future (if applicable)
5. **Follow-up** - Ask if more help needed

### Format:
- Use **bold** for important info
- Use bullet points for steps
- Include relevant emojis for visual appeal
- Keep responses focused but comprehensive
- Max 3-4 short paragraphs

### Tone Examples:
- Frustrated user → Extra empathetic, apologetic, solution-focused
- New user → Welcoming, explanatory, patient
- Technical user → Direct, detailed, no hand-holding
- Happy user → Enthusiastic, celebratory

## ⚡ QUICK ACTIONS

Suggest these when relevant:
- "Wallet check karo" → Profile > Wallet
- "Transaction history" → Profile > Transaction History  
- "Game history" → Profile > Game History
- "Support ticket" → Header > Support icon
- "Rules padho" → Specific game page > Rules

## 🎯 SUCCESS METRICS

Your goal is to:
1. Resolve 90%+ issues in first response
2. Reduce user frustration
3. Provide accurate information
4. Escalate only when truly necessary
5. Make users feel valued and heard

Remember: You represent ProBattle. Every interaction shapes user perception of the platform.`;

// Analyze sentiment and frustration level
const analyzeSentiment = (messages: SupportMessage[]): { frustrationLevel: 'low' | 'medium' | 'high', indicators: string[] } => {
  const allText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');
  
  const foundIndicators = FRUSTRATION_INDICATORS.filter(ind => allText.includes(ind.toLowerCase()));
  const exclamationCount = (allText.match(/!/g) || []).length;
  const questionMarkCount = (allText.match(/\?/g) || []).length;
  const capsRatio = (allText.match(/[A-Z]/g) || []).length / (allText.length || 1);
  
  let score = foundIndicators.length * 2;
  score += Math.min(exclamationCount, 5);
  score += Math.min(questionMarkCount / 2, 3);
  score += capsRatio > 0.3 ? 3 : 0;
  
  let frustrationLevel: 'low' | 'medium' | 'high' = 'low';
  if (score >= 8) frustrationLevel = 'high';
  else if (score >= 4) frustrationLevel = 'medium';
  
  return { frustrationLevel, indicators: foundIndicators };
};

// Generate smart quick reply suggestions
const generateSuggestions = (category: string, subCategory: string): string[] => {
  const suggestions: Record<string, string[]> = {
    deposit: [
      "UTR number share karo",
      "Payment screenshot dikhao",
      "Kitna amount tha?",
      "Kaunsa UPI app use kiya?"
    ],
    withdrawal: [
      "Bank details verify karo",
      "Wager requirement check karo", 
      "Request date batao",
      "Rejection reason kya hai?"
    ],
    ludo: [
      "Match ID share karo",
      "Entry fee kitna tha?",
      "Friend match ya random?",
      "Error screenshot bhejo"
    ],
    mines: [
      "Bet amount kya tha?",
      "Kitne tiles reveal kiye?",
      "Game freeze hua ya crash?",
      "Balance check karo"
    ],
    thimble: [
      "Difficulty level kya tha?",
      "Bet amount batao",
      "Result kya dikha?",
      "Screenshot bhejo"
    ],
    bgmi: [
      "Tournament name/ID batao",
      "Room details mile?",
      "Match time kya tha?",
      "Registration screenshot bhejo"
    ],
    account: [
      "Email/Phone verify karo",
      "Forgot Password try karo",
      "Error message kya hai?",
      "Kab se issue hai?"
    ],
    default: [
      "Thoda detail mein batao",
      "Screenshot bhej sakte ho?",
      "Kab se problem hai?",
      "Kya error aa raha hai?"
    ]
  };
  
  return suggestions[category] || suggestions[subCategory] || suggestions.default;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, category, subCategory, language, userId, userCode } = await req.json() as RequestBody;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Analyze conversation
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userContent = lastUserMessage?.content?.toLowerCase() || '';
    const hasSeriousKeywords = SERIOUS_ISSUE_KEYWORDS.some(keyword => 
      userContent.includes(keyword.toLowerCase())
    );
    
    // Sentiment analysis
    const sentiment = analyzeSentiment(messages);
    
    // Smart suggestions
    const suggestions = generateSuggestions(category, subCategory);

    // Build enhanced context
    let contextPrompt = ADVANCED_SYSTEM_PROMPT;
    contextPrompt += `\n\n## 📊 CURRENT SESSION CONTEXT:\n`;
    contextPrompt += `- **Category:** ${category}\n`;
    contextPrompt += `- **Specific Issue:** ${subCategory}\n`;
    contextPrompt += `- **Preferred Language:** ${language}\n`;
    contextPrompt += `- **Conversation Length:** ${messages.length} messages\n`;
    contextPrompt += `- **User Frustration Level:** ${sentiment.frustrationLevel.toUpperCase()}\n`;
    
    if (sentiment.frustrationLevel !== 'low') {
      contextPrompt += `- ⚠️ **Frustration Indicators Found:** ${sentiment.indicators.join(', ')}\n`;
      contextPrompt += `- 💡 **Approach:** Be extra empathetic, apologetic, and solution-focused\n`;
    }
    
    if (hasSeriousKeywords) {
      contextPrompt += `- 🚨 **SERIOUS ISSUE DETECTED** - High priority, consider escalation\n`;
    }
    
    contextPrompt += `\n## 💬 Suggested Follow-up Questions (use if needed):\n`;
    suggestions.forEach((s, i) => {
      contextPrompt += `${i + 1}. ${s}\n`;
    });

    // Build messages for AI
    const aiMessages: any[] = [
      { role: "system", content: contextPrompt }
    ];

    // Add conversation history with enhanced image support
    for (const msg of messages) {
      if (msg.image) {
        aiMessages.push({
          role: msg.role,
          content: [
            { 
              type: "text", 
              text: msg.content || "Please analyze this screenshot carefully. Look for error messages, transaction details, amounts, and any issues visible in the image." 
            },
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

    // Use the latest and most capable model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment.",
            suggestions: ["Thodi der baad try karo", "2-3 minute ruko"]
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI service temporarily unavailable. Please try again later.",
            suggestions: ["Baad mein try karo", "Admin se contact karo"]
          }),
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
          .map(m => `${m.role === 'user' ? '👤 User' : '🤖 AI'}: ${m.content}`)
          .join('\n\n');

        // Create high-priority support ticket
        const { data: ticket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert({
            user_id: userId,
            subject: `🚨 [AI Escalated] ${category} - ${subCategory}`,
            status: 'open',
            priority: sentiment.frustrationLevel === 'high' ? 'urgent' : 'high',
          })
          .select()
          .single();

        if (!ticketError && ticket) {
          const ticketMessage = `🤖 **AI Support Escalation Report**

---

**👤 User Details:**
- **User ID:** ${userId}
${userCode ? `- **User Code:** ${userCode}` : ''}

**📋 Issue Details:**
- **Category:** ${category}
- **Sub-Category:** ${subCategory}
- **User Frustration Level:** ${sentiment.frustrationLevel.toUpperCase()}
${sentiment.indicators.length > 0 ? `- **Frustration Indicators:** ${sentiment.indicators.join(', ')}` : ''}

---

**💬 Conversation History:**

${conversationSummary}

---

**📝 AI Analysis:**
This ticket was automatically created because the AI detected a serious issue that requires human intervention. Please review and respond promptly.

${sentiment.frustrationLevel === 'high' ? '⚠️ **HIGH FRUSTRATION USER** - Handle with extra care!' : ''}`;

          await supabase
            .from('support_messages')
            .insert({
              ticket_id: ticket.id,
              sender_id: userId,
              sender_type: 'user',
              message: ticketMessage,
            });

          console.log('Created escalation ticket:', ticket.id, 'Priority:', sentiment.frustrationLevel);
        }
      } catch (escalationError) {
        console.error('Failed to create escalation ticket:', escalationError);
      }
    }

    return new Response(
      JSON.stringify({ 
        reply: aiReply,
        escalated: shouldEscalate,
        sentiment: sentiment.frustrationLevel,
        suggestions: suggestions.slice(0, 3), // Return top 3 suggestions
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Support Chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        suggestions: ["Refresh karke try karo", "Admin se contact karo"]
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
