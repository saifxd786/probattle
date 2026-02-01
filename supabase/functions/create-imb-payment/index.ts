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
  return `PB${timestamp}${random}`;
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

    // Get user profile for customer details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, email, phone')
      .eq('id', user.id)
      .single();

    // Build callback/redirect URLs
    const redirectUrl = `${supabaseUrl}/functions/v1/imb-payment-redirect?order_id=${orderId}`;

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

    // Call IMB API to create order (using formdata as per their API docs)
    // Endpoint: POST /api/create-order
    const imbApiUrl = IMB_API_URL.endsWith('/') ? IMB_API_URL : `${IMB_API_URL}/`;
    
    // Build FormData as per IMB API documentation
    const formData = new FormData();
    formData.append('user_token', IMB_API_TOKEN);
    formData.append('order_id', orderId);
    formData.append('amount', amount.toString());
    formData.append('redirect_url', redirectUrl);
    formData.append('customer_mobile', profile?.phone || '9999999999');

    console.log('Calling IMB API:', `${imbApiUrl}api/create-order`);
    console.log('FormData params: order_id:', orderId, 'amount:', amount);

    const imbResponse = await fetch(`${imbApiUrl}api/create-order`, {
      method: 'POST',
      body: formData
    });

    const imbText = await imbResponse.text();
    console.log('IMB API raw response:', imbText);

    let imbData: any;
    try {
      imbData = JSON.parse(imbText);
    } catch {
      console.error('IMB API returned invalid JSON:', imbText);
      await supabaseAdmin
        .from('payments')
        .update({ status: 'FAILED', updated_at: new Date().toISOString() })
        .eq('order_id', orderId);
      
      return new Response(
        JSON.stringify({ error: 'Payment gateway returned invalid response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check IMB response status
    if (!imbData.status || imbData.status === false || imbData.status === 'false') {
      console.error('IMB API error:', imbData);
      
      await supabaseAdmin
        .from('payments')
        .update({ 
          status: 'FAILED', 
          webhook_payload: imbData,
          updated_at: new Date().toISOString() 
        })
        .eq('order_id', orderId);
      
      return new Response(
        JSON.stringify({ error: imbData.message || 'Payment gateway error. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract payment URL from response
    const paymentUrl = imbData.payment_url || imbData.data?.payment_url || imbData.url;
    
    if (!paymentUrl) {
      console.error('No payment URL in IMB response:', imbData);
      
      await supabaseAdmin
        .from('payments')
        .update({ 
          status: 'FAILED', 
          webhook_payload: imbData,
          updated_at: new Date().toISOString() 
        })
        .eq('order_id', orderId);
      
      return new Response(
        JSON.stringify({ error: 'Payment gateway did not return payment URL' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment URL received:', paymentUrl);

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
    console.error('Payment creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
