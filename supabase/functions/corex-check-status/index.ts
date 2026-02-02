import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Parse request
    const { order_id } = await req.json();
    
    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment from database (must belong to this user)
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', order_id)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already processed, return from DB
    if (payment.status !== 'PENDING') {
      return new Response(
        JSON.stringify({
          success: true,
          order_id: payment.order_id,
          status: payment.status,
          amount: payment.amount,
          transaction_id: payment.imb_transaction_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If still pending, check with CoreX API
    const COREX_API_URL = Deno.env.get('COREX_API_URL');
    const COREX_API_TOKEN = Deno.env.get('COREX_API_TOKEN');

    if (!COREX_API_URL || !COREX_API_TOKEN) {
      return new Response(
        JSON.stringify({
          success: true,
          order_id: payment.order_id,
          status: payment.status,
          amount: payment.amount,
          message: 'Payment is pending'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call CoreX check-status API
    const corexApiUrl = COREX_API_URL.endsWith('/') ? COREX_API_URL : `${COREX_API_URL}/`;
    
    console.log('[CoreX] Checking payment status:', order_id);
    
    const statusResponse = await fetch(`${corexApiUrl}api/check-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        user_token: COREX_API_TOKEN,
        order_id: order_id
      })
    });

    const statusText = await statusResponse.text();
    console.log('[CoreX] Status response:', statusText);

    let statusData: any;
    try {
      statusData = JSON.parse(statusText);
    } catch {
      console.error('[CoreX] Invalid JSON from status API');
      return new Response(
        JSON.stringify({
          success: true,
          order_id: payment.order_id,
          status: payment.status,
          amount: payment.amount,
          message: 'Payment status check unavailable'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If CoreX returns a definitive status, update our record
    const corexStatus = (statusData.result?.status || statusData.status || statusData.txn_status || '').toString().toUpperCase();
    
    if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID'].includes(corexStatus)) {
      // Credit wallet if not already credited
      const utr = statusData.result?.utr || statusData.utr || statusData.transaction_id || '';
      
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'SUCCESS',
          imb_transaction_id: utr,
          webhook_payload: statusData,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', order_id);

      // Credit wallet
      await supabaseAdmin.rpc('atomic_wallet_update', {
        p_user_id: user.id,
        p_amount: Number(payment.amount),
        p_reason: `CoreX Deposit: ${order_id}${utr ? ` (UTR: ${utr})` : ''}`
      });

      // Create transaction
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'deposit',
          amount: Number(payment.amount),
          status: 'completed',
          utr_id: utr,
          description: `CoreX Gateway Deposit (${order_id})`
        });

      // Notify user
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'success',
          title: '✅ Deposit Successful',
          message: `₹${payment.amount} has been added to your wallet.`
        });

      return new Response(
        JSON.stringify({
          success: true,
          order_id: order_id,
          status: 'SUCCESS',
          amount: payment.amount,
          transaction_id: utr
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (['FAILED', 'FAILURE', 'CANCELLED', 'EXPIRED'].includes(corexStatus)) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'FAILED',
          webhook_payload: statusData,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', order_id);

      return new Response(
        JSON.stringify({
          success: true,
          order_id: order_id,
          status: 'FAILED',
          amount: payment.amount,
          message: statusData.message || 'Payment failed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Still pending
    return new Response(
      JSON.stringify({
        success: true,
        order_id: payment.order_id,
        status: 'PENDING',
        amount: payment.amount,
        message: 'Payment is being processed'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CoreX] Status check error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
