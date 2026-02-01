import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  sender_type: 'user' | 'admin';
  message: string;
  attachments?: any[];
  created_at: string;
}

interface SupportReport {
  ticketId: string;
  userId: string;
  username: string;
  phone: string;
  email: string;
  issueCategory: string;
  issueSummary: string;
  proofAttached: {
    images: number;
    videos: number;
    hasScreenshot: boolean;
    hasUTR: boolean;
    attachmentUrls: string[];
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  aiRecommendation: string;
  extractedDetails: {
    transactionAmount?: string;
    utr?: string;
    gameType?: string;
    hackerName?: string;
    errorMessage?: string;
    deviceInfo?: string;
  };
  createdAt: string;
  lastMessageAt: string;
}

// Issue category detection patterns
const CATEGORY_PATTERNS = {
  deposit: [
    'deposit', 'paisa nahi aaya', 'money not credited', 'payment stuck',
    'amount deducted', 'paise nahi mile', 'credited nahi hua', 'utr',
    'transaction failed', 'paisa kat gaya', 'balance nahi aaya', 'add money'
  ],
  withdrawal: [
    'withdrawal', 'withdraw', 'pending', 'nahi aaya bank mein', 'paise nahi mile',
    'withdrawal rejected', 'cashout', 'paisa nahi mila', 'bank mein nahi aaya'
  ],
  hacker_report: [
    'hacker', 'cheater', 'hack', 'cheat', 'speed hack', 'wall hack', 
    'aimbot', 'unfair', 'cheating', 'hacker mara', 'hacks use', 'killed by hacker'
  ],
  bug_glitch: [
    'bug', 'glitch', 'error', 'crash', 'freeze', 'stuck', 'not working',
    'kaam nahi kar raha', 'hang', 'load nahi', 'white screen', 'blank',
    'game freeze', 'app crash'
  ],
  game_issue: [
    'game', 'ludo', 'mines', 'thimble', 'bgmi', 'match', 'room',
    'sync', 'connection', 'tournament', 'entry fee', 'result'
  ],
  account: [
    'account', 'login', 'password', 'banned', 'suspended', 'access',
    'verification', 'profile', 'kyc', 'locked'
  ],
  refund: [
    'refund', 'money back', 'paisa wapas', 'return', 'reversed'
  ]
};

// Extract specific details from messages
const extractDetails = (messages: Message[]): SupportReport['extractedDetails'] => {
  const allText = messages.map(m => m.message).join(' ').toLowerCase();
  const details: SupportReport['extractedDetails'] = {};

  // Extract UTR (12-digit transaction reference)
  const utrMatch = allText.match(/\b\d{12}\b/);
  if (utrMatch) {
    details.utr = utrMatch[0];
  }

  // Extract amount (₹ followed by number)
  const amountMatch = allText.match(/₹?\s?(\d{1,6})/);
  if (amountMatch) {
    details.transactionAmount = `₹${amountMatch[1]}`;
  }

  // Extract game type
  if (allText.includes('ludo')) details.gameType = 'Ludo';
  else if (allText.includes('mines')) details.gameType = 'Mines';
  else if (allText.includes('thimble')) details.gameType = 'Thimble';
  else if (allText.includes('bgmi') || allText.includes('pubg')) details.gameType = 'BGMI';

  // Extract hacker name (look for "hacker name: X" or similar patterns)
  const hackerMatch = allText.match(/(?:hacker|cheater|player)\s*(?:name|id)?[:\s]+([a-z0-9_]+)/i);
  if (hackerMatch) {
    details.hackerName = hackerMatch[1];
  }

  return details;
};

// Determine issue category from messages
const detectCategory = (messages: Message[], subject: string): string => {
  const allText = (subject + ' ' + messages.map(m => m.message).join(' ')).toLowerCase();
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (allText.includes(pattern.toLowerCase())) {
        return category;
      }
    }
  }
  return 'other';
};

// Determine severity based on keywords and context
const determineSeverity = (messages: Message[], category: string): SupportReport['severity'] => {
  const allText = messages.map(m => m.message).join(' ').toLowerCase();
  
  // Critical severity patterns
  const criticalPatterns = ['fraud', 'scam', 'stolen', 'hacked', 'dhoka', 'chori', 'loot'];
  if (criticalPatterns.some(p => allText.includes(p))) return 'critical';
  
  // High severity patterns
  const highPatterns = ['urgent', 'emergency', 'please help', 'bahut zaruri', 'jaldi'];
  if (highPatterns.some(p => allText.includes(p))) return 'high';
  if (category === 'hacker_report') return 'high';
  if (category === 'refund') return 'high';
  
  // Medium severity
  if (category === 'deposit' || category === 'withdrawal') return 'medium';
  if (category === 'bug_glitch') return 'medium';
  
  return 'low';
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ticket with user info
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error('Ticket not found');
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, phone, email, id')
      .eq('id', ticket.user_id)
      .single();

    // Fetch all messages
    const { data: messages, error: msgError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    const typedMessages = (messages || []) as Message[];

    // Count attachments
    let imageCount = 0;
    let videoCount = 0;
    const attachmentUrls: string[] = [];
    
    typedMessages.forEach(msg => {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        msg.attachments.forEach((att: any) => {
          if (att.type === 'image') {
            imageCount++;
            if (att.url) attachmentUrls.push(att.url);
          } else if (att.type === 'video') {
            videoCount++;
            if (att.url) attachmentUrls.push(att.url);
          }
        });
      }
    });

    // Detect category and extract details
    const category = detectCategory(typedMessages, ticket.subject);
    const extractedDetails = extractDetails(typedMessages);
    const severity = determineSeverity(typedMessages, category);

    // Generate AI summary using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiSummary = '';
    let aiRecommendation = '';

    if (LOVABLE_API_KEY && typedMessages.length > 0) {
      try {
        const conversationText = typedMessages
          .map(m => `${m.sender_type === 'user' ? 'User' : 'Admin'}: ${m.message}`)
          .join('\n');

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are analyzing a customer support conversation for ProBattle gaming platform. 
                
Generate a brief JSON response with exactly this structure:
{
  "summary": "2-3 sentence summary of user's problem in Hindi/Hinglish",
  "recommendation": "Clear action admin should take (1-2 sentences)"
}

Be direct and actionable. Focus on:
- What is the exact problem?
- What proof did user provide?
- What should admin do next?`
              },
              {
                role: "user",
                content: `Ticket Subject: ${ticket.subject}
Category: ${category}
Attachments: ${imageCount} images, ${videoCount} videos
Extracted UTR: ${extractedDetails.utr || 'None'}
Extracted Amount: ${extractedDetails.transactionAmount || 'None'}

Conversation:
${conversationText}`
              }
            ],
            max_tokens: 300,
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          const aiContent = aiData.choices?.[0]?.message?.content || '';
          
          // Try to parse JSON from response
          try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              aiSummary = parsed.summary || '';
              aiRecommendation = parsed.recommendation || '';
            }
          } catch {
            // Use full response as summary if JSON parsing fails
            aiSummary = aiContent;
          }
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
    }

    // Fallback summaries if AI didn't work
    if (!aiSummary) {
      const userMessages = typedMessages.filter(m => m.sender_type === 'user');
      aiSummary = userMessages.slice(0, 2).map(m => m.message.slice(0, 100)).join(' | ');
    }
    
    if (!aiRecommendation) {
      const recommendations: Record<string, string> = {
        deposit: 'Check transaction status and UTR with payment gateway',
        withdrawal: 'Verify bank details and wager requirement completion',
        hacker_report: 'Review proof and check player ID in game logs',
        bug_glitch: 'Collect device info and try to reproduce issue',
        refund: 'Calculate refund amount and process if valid',
        account: 'Verify identity and reset credentials if needed',
        game_issue: 'Check game logs and sync server status',
        other: 'Review conversation and respond appropriately'
      };
      aiRecommendation = recommendations[category] || recommendations.other;
    }

    const report: SupportReport = {
      ticketId: ticket.id,
      userId: profile?.id || ticket.user_id,
      username: profile?.username || 'Unknown',
      phone: profile?.phone || 'N/A',
      email: profile?.email || 'N/A',
      issueCategory: category,
      issueSummary: aiSummary,
      proofAttached: {
        images: imageCount,
        videos: videoCount,
        hasScreenshot: imageCount > 0,
        hasUTR: !!extractedDetails.utr,
        attachmentUrls
      },
      severity,
      status: ticket.status,
      aiRecommendation,
      extractedDetails,
      createdAt: ticket.created_at,
      lastMessageAt: typedMessages[typedMessages.length - 1]?.created_at || ticket.updated_at
    };

    return new Response(
      JSON.stringify({ report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate report error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate report" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
