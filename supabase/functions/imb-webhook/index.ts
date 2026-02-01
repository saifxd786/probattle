import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-imb-signature',
};

// Verify IMB webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Initialize Supabase admin client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-imb-signature') || '';
    const IMB_API_TOKEN = Deno.env.get('IMB_API_TOKEN');

    console.log('Webhook received, signature present:', !!signature);

    // Parse payload
    let payload: {
      order_id: string;
      status: string;
      amount: number;
      transaction_id?: string;
    };
    
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error('Invalid JSON payload');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log webhook for audit
    await supabaseAdmin
      .from('payment_webhook_logs')
      .insert({
        order_id: payload.order_id || 'unknown',
        payload: payload,
        signature: signature,
        is_valid: null // Will update after verification
      });

    // Verify signature (if token is configured)
    let isValidSignature = true;
    if (IMB_API_TOKEN && signature) {
      isValidSignature = verifySignature(rawBody, signature, IMB_API_TOKEN);
      if (!isValidSignature) {
        console.error('Invalid webhook signature');
        
        // Update log with validation result
        await supabaseAdmin
          .from('payment_webhook_logs')
          .update({ is_valid: false })
          .eq('order_id', payload.order_id);
        
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate required fields
    if (!payload.order_id || !payload.status || !payload.amount) {
      console.error('Missing required fields:', payload);
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing webhook for order: ${payload.order_id}, status: ${payload.status}`);

    // Get existing payment record
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', payload.order_id)
      .single();

    if (fetchError || !payment) {
      console.error('Payment not found:', payload.order_id);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IDEMPOTENCY CHECK: If already SUCCESS, ignore duplicate webhook
    if (payment.status === 'SUCCESS') {
      console.log('Payment already successful, ignoring duplicate webhook');
      return new Response(
        JSON.stringify({ message: 'Already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ANTI-FRAUD: Verify amount matches
    if (Number(payment.amount) !== Number(payload.amount)) {
      console.error('Amount mismatch! DB:', payment.amount, 'Webhook:', payload.amount);
      
      // Update payment with fraud flag
      await supabaseAdmin
        .from('payments')
        .update({ 
          status: 'FAILED',
          webhook_payload: payload,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', payload.order_id);
      
      return new Response(
        JSON.stringify({ error: 'Amount mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process based on status
    if (payload.status === 'SUCCESS' || payload.status === 'success' || payload.status === 'COMPLETED') {
      // Update payment status
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'SUCCESS',
          imb_transaction_id: payload.transaction_id,
          webhook_payload: payload,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', payload.order_id);

      // Credit user wallet (ATOMIC OPERATION)
      const { data: walletResult, error: walletError } = await supabaseAdmin
        .rpc('atomic_wallet_update', {
          p_user_id: payment.user_id,
          p_amount: payment.amount,
          p_reason: `IMB Deposit: ${payload.order_id}`
        });

      if (walletError) {
        console.error('Wallet update failed:', walletError);
        // Payment is successful but wallet failed - needs manual intervention
        // Log this critical error
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            action_type: 'WALLET_CREDIT_FAILED',
            entity_type: 'payment',
            entity_id: payment.id,
            user_id: payment.user_id,
            details: {
              order_id: payload.order_id,
              amount: payment.amount,
              error: walletError.message
            },
            performed_by: 'imb-webhook'
          });
      } else {
        console.log('Wallet credited successfully:', walletResult);
        
        // Create transaction record
        await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: payment.user_id,
            type: 'deposit',
            amount: payment.amount,
            status: 'completed',
            description: `IMB Gateway Deposit (${payload.order_id})`
          });

        // Create notification for user
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: payment.user_id,
            type: 'success',
            title: '✅ Deposit Successful',
            message: `₹${payment.amount} has been added to your wallet.`
          });
      }

      console.log(`Payment ${payload.order_id} processed successfully`);
      
    } else if (payload.status === 'FAILED' || payload.status === 'failed' || payload.status === 'CANCELLED') {
      // Update payment status to failed
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'FAILED',
          webhook_payload: payload,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', payload.order_id);

      // Notify user
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: payment.user_id,
          type: 'error',
          title: '❌ Deposit Failed',
          message: `Your deposit of ₹${payment.amount} could not be processed.`
        });

      console.log(`Payment ${payload.order_id} marked as failed`);
    }

    // Update webhook log with validation result
    await supabaseAdmin
      .from('payment_webhook_logs')
      .update({ is_valid: true })
      .eq('order_id', payload.order_id);

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
