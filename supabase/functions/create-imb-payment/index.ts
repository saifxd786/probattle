import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit tracking (in-memory, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `PB_${timestamp}_${random}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again in a minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { amount } = await req.json();
    
    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Must be greater than 0.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IMB credentials from secrets
    const IMB_API_URL = Deno.env.get('IMB_API_URL');
    const IMB_API_TOKEN = Deno.env.get('IMB_API_TOKEN');

    if (!IMB_API_URL || !IMB_API_TOKEN) {
      console.error('IMB credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique order ID
    const orderId = generateOrderId();

    // Get callback URL (webhook URL)
    const callbackUrl = `${supabaseUrl}/functions/v1/imb-webhook`;

    // Insert payment record with PENDING status
    const { error: insertError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        order_id: orderId,
        amount: amount,
        status: 'PENDING',
        gateway: 'IMB'
      });

    if (insertError) {
      console.error('Failed to create payment record:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to initiate payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Payment initiated: ${orderId} for user ${user.id}, amount: ${amount}`);

    // Call IMB API to initiate payment
    const imbResponse = await fetch(`${IMB_API_URL}/api/v1/payment/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${IMB_API_TOKEN}`
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: amount,
        currency: 'INR',
        callback_url: callbackUrl,
        customer_email: user.email,
        customer_id: user.id
      })
    });

    if (!imbResponse.ok) {
      const errorText = await imbResponse.text();
      console.error('IMB API error:', errorText);
      
      // Update payment status to FAILED
      await supabaseAdmin
        .from('payments')
        .update({ status: 'FAILED', updated_at: new Date().toISOString() })
        .eq('order_id', orderId);
      
      return new Response(
        JSON.stringify({ error: 'Payment gateway error. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imbData = await imbResponse.json();

    // Return only the payment URL (never expose tokens)
    return new Response(
      JSON.stringify({
        success: true,
        payment_url: imbData.payment_url,
        order_id: orderId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
