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
  return `CX${timestamp}${random}`;
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
    if (!amount || typeof amount !== 'number' || amount < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Must be at least ₹1.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get CoreX credentials from secrets
    const COREX_API_URL = Deno.env.get('COREX_API_URL');
    const COREX_API_TOKEN = Deno.env.get('COREX_API_TOKEN');

    if (!COREX_API_URL || !COREX_API_TOKEN) {
      console.error('CoreX credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique order ID
    const orderId = generateOrderId();

    // Get user profile for customer details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, email, phone')
      .eq('id', user.id)
      .single();

    // Build callback/redirect URLs
    const redirectUrl = `${supabaseUrl}/functions/v1/corex-payment-redirect?order_id=${orderId}`;

    // Insert payment record with PENDING status
    const { error: insertError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        order_id: orderId,
        amount: amount,
        status: 'PENDING',
        gateway: 'COREX'
      });

    if (insertError) {
      console.error('Failed to create payment record:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to initiate payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CoreX] Payment initiated: ${orderId} for user ${user.id}, amount: ${amount}`);

    // Call CoreX API to create order
    // CoreX API uses header-based authentication
    const corexApiUrl = COREX_API_URL.endsWith('/') ? COREX_API_URL : `${COREX_API_URL}/`;
    const COREX_USERNAME = Deno.env.get('COREX_USERNAME');
    
    if (!COREX_USERNAME) {
      console.error('CoreX username not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const requestBody = {
      amount: amount,
      customer_mobile: profile?.phone || '9999999999',
      customer_email: profile?.email || user.email || '',
      order_id: orderId,
      redirect_url: redirectUrl
    };

    console.log('[CoreX] Calling API:', `${corexApiUrl}create_order.php`);
    console.log('[CoreX] Request body:', requestBody);

    const corexResponse = await fetch(`${corexApiUrl}create_order.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-client-username': COREX_USERNAME,
        'x-client-apikey': COREX_API_TOKEN
      },
      body: JSON.stringify(requestBody)
    });

    const corexText = await corexResponse.text();
    console.log('[CoreX] API raw response:', corexText);

    let corexData: any;
    try {
      corexData = JSON.parse(corexText);
    } catch {
      console.error('[CoreX] API returned invalid JSON:', corexText);
      await supabaseAdmin
        .from('payments')
        .update({ status: 'FAILED', updated_at: new Date().toISOString() })
        .eq('order_id', orderId);
      
      return new Response(
        JSON.stringify({ error: 'Payment gateway returned invalid response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check CoreX response status - API returns status: "success" or "error"
    if (corexData.status !== 'success') {
      console.error('[CoreX] API error:', corexData);
      
      await supabaseAdmin
        .from('payments')
        .update({ 
          status: 'FAILED', 
          webhook_payload: corexData,
          updated_at: new Date().toISOString() 
        })
        .eq('order_id', orderId);
      
      return new Response(
        JSON.stringify({ error: corexData.message || 'Payment gateway error. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract payment URL from response - CoreX returns it in data.payment_url
    const paymentUrl = corexData.data?.payment_url || corexData.payment_url || corexData.result?.payment_url || corexData.url;
    
    if (!paymentUrl) {
      console.error('[CoreX] No payment URL in response:', corexData);
      
      await supabaseAdmin
        .from('payments')
        .update({ 
          status: 'FAILED', 
          webhook_payload: corexData,
          updated_at: new Date().toISOString() 
        })
        .eq('order_id', orderId);
      
      return new Response(
        JSON.stringify({ error: 'Payment gateway did not return payment URL' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CoreX] Payment URL received:', paymentUrl);

    // Return only the payment URL (never expose tokens)
    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentUrl,
        order_id: orderId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CoreX] Payment creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
