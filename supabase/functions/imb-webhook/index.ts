import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-imb-signature, x-signature',
};

// Verify payment via IMB CHECK STATUS API
async function verifyPaymentWithIMB(orderId: string, userToken: string, apiUrl: string): Promise<{ valid: boolean; status: string; amount?: number }> {
  try {
    const checkUrl = apiUrl.endsWith('/') ? `${apiUrl}api/check-status` : `${apiUrl}/api/check-status`;
    
    // Build FormData for CHECK STATUS API
    const formData = new FormData();
    formData.append('user_token', userToken);
    formData.append('order_id', orderId);

    console.log('Verifying with IMB CHECK STATUS API:', checkUrl);

    const response = await fetch(checkUrl, {
      method: 'POST',
      body: formData
    });

    const text = await response.text();
    console.log('CHECK STATUS raw response:', text);

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // Try URL encoded
      const params = new URLSearchParams(text);
      data = Object.fromEntries(params.entries());
    }

    console.log('CHECK STATUS parsed:', data);

    // Check if response indicates success
    if (data.status === true || data.status === 'true' || data.status === 'SUCCESS') {
      const transactionStatus = (data.result?.status || data.transaction_status || data.payment_status || '').toUpperCase();
      const amount = Number(data.result?.amount || data.amount || 0);
      return { 
        valid: true, 
        status: transactionStatus,
        amount: amount
      };
    }

    return { valid: false, status: 'UNKNOWN' };
  } catch (error) {
    console.error('CHECK STATUS API error:', error);
    return { valid: false, status: 'ERROR' };
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
    const IMB_API_TOKEN = Deno.env.get('IMB_API_TOKEN');
    const IMB_API_URL = Deno.env.get('IMB_API_URL');

    console.log('=== IMB WEBHOOK RECEIVED ===');
    console.log('Raw body:', rawBody);

    // Parse payload - IMB sends application/x-www-form-urlencoded
    let payload: {
      order_id?: string;
      orderId?: string;
      status?: string;
      amount?: number | string;
      utr?: string;
      transaction_id?: string;
      txn_id?: string;
      customer_mobile?: string;
      remark1?: string;
      message?: string;
    };
    
    try {
      // Try form-urlencoded first (IMB format)
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
      console.log('Parsed as form-urlencoded');
    } catch {
      try {
        // Fallback to JSON
        payload = JSON.parse(rawBody);
        console.log('Parsed as JSON');
      } catch {
        console.error('Invalid payload format');
        return new Response(
          JSON.stringify({ error: 'Invalid payload format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Parsed payload:', payload);

    // Normalize field names (IMB specific fields)
    const normalizedPayload = {
      order_id: payload.order_id || payload.orderId || '',
      status: (payload.status || '').toString().toUpperCase(),
      amount: Number(payload.amount) || 0,
      utr: payload.utr || payload.transaction_id || payload.txn_id || '',
      customer_mobile: payload.customer_mobile || '',
      remark1: payload.remark1 || '',
      message: payload.message || ''
    };

    console.log('Normalized payload:', normalizedPayload);

    // Log webhook for audit (before any validation)
    await supabaseAdmin
      .from('payment_webhook_logs')
      .insert({
        order_id: normalizedPayload.order_id || 'unknown',
        payload: payload,
        signature: null,
        is_valid: null
      });

    // Validate required fields
    if (!normalizedPayload.order_id) {
      console.error('Missing order_id in payload');
      return new Response(
        JSON.stringify({ error: 'Missing order_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing payment record
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', normalizedPayload.order_id)
      .single();

    if (fetchError || !payment) {
      console.error('Payment not found:', normalizedPayload.order_id, fetchError);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found payment record:', {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      status: payment.status,
      user_id: payment.user_id
    });

    // IDEMPOTENCY CHECK: If already SUCCESS, ignore duplicate webhook
    if (payment.status === 'SUCCESS') {
      console.log('Payment already successful, ignoring duplicate webhook');
      return new Response(
        JSON.stringify({ message: 'Already processed', status: 'success' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // VERIFY WITH IMB CHECK STATUS API (as per their docs - no signature, use API verification)
    let verifiedStatus = normalizedPayload.status;
    let verifiedAmount = normalizedPayload.amount;
    
    if (IMB_API_TOKEN && IMB_API_URL) {
      console.log('Verifying payment with IMB CHECK STATUS API...');
      const verification = await verifyPaymentWithIMB(normalizedPayload.order_id, IMB_API_TOKEN, IMB_API_URL);
      
      if (verification.valid) {
        verifiedStatus = verification.status || normalizedPayload.status;
        if (verification.amount && verification.amount > 0) {
          verifiedAmount = verification.amount;
        }
        console.log('IMB verification successful:', { verifiedStatus, verifiedAmount });
      } else {
        console.log('IMB verification failed, using webhook status');
      }
    }

    // ANTI-FRAUD: Verify amount matches (if amount provided)
    if (verifiedAmount > 0 && Number(payment.amount) !== verifiedAmount) {
      console.error('Amount mismatch! DB:', payment.amount, 'Verified:', verifiedAmount);
      
      await supabaseAdmin
        .from('payments')
        .update({ 
          status: 'FAILED',
          webhook_payload: payload,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', normalizedPayload.order_id);
      
      // Log fraud attempt
      await supabaseAdmin
        .from('admin_audit_logs')
        .insert({
          action_type: 'PAYMENT_FRAUD_ATTEMPT',
          entity_type: 'payment',
          entity_id: payment.id,
          user_id: payment.user_id,
          details: {
            order_id: normalizedPayload.order_id,
            expected_amount: payment.amount,
            received_amount: verifiedAmount
          },
          performed_by: 'imb-webhook'
        });
      
      return new Response(
        JSON.stringify({ error: 'Amount mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process based on status (use verified status if available)
    const finalStatus = verifiedStatus || normalizedPayload.status;
    const isSuccess = ['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID', 'TXN_SUCCESS'].includes(finalStatus);
    const isFailed = ['FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'TXN_FAILURE', 'EXPIRED'].includes(finalStatus);

    if (isSuccess) {
      console.log(`Processing SUCCESS for order: ${normalizedPayload.order_id}`);
      
      // Update payment status
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'SUCCESS',
          imb_transaction_id: normalizedPayload.utr || null,
          webhook_payload: payload,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', normalizedPayload.order_id);

      // Credit user wallet using ATOMIC operation
      const { data: walletResult, error: walletError } = await supabaseAdmin
        .rpc('atomic_wallet_update', {
          p_user_id: payment.user_id,
          p_amount: Number(payment.amount),
          p_reason: `IMB Deposit: ${normalizedPayload.order_id}${normalizedPayload.utr ? ` (UTR: ${normalizedPayload.utr})` : ''}`
        });

      if (walletError) {
        console.error('CRITICAL: Wallet update failed:', walletError);
        
        // Log critical error for manual intervention
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            action_type: 'WALLET_CREDIT_FAILED',
            entity_type: 'payment',
            entity_id: payment.id,
            user_id: payment.user_id,
            details: {
              order_id: normalizedPayload.order_id,
              amount: payment.amount,
              utr: normalizedPayload.utr,
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
            amount: Number(payment.amount),
            status: 'completed',
            utr_id: normalizedPayload.utr || null,
            description: `IMB Gateway Deposit (${normalizedPayload.order_id})`
          });

        // Create success notification for user
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: payment.user_id,
            type: 'success',
            title: '✅ Deposit Successful',
            message: `₹${payment.amount} has been added to your wallet.${normalizedPayload.utr ? ` UTR: ${normalizedPayload.utr}` : ''}`
          });
      }

      console.log(`Payment ${normalizedPayload.order_id} processed successfully`);
      
    } else if (isFailed) {
      console.log(`Processing FAILED for order: ${normalizedPayload.order_id}`);
      
      // Update payment status to failed
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'FAILED',
          webhook_payload: payload,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', normalizedPayload.order_id);

      // Notify user
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: payment.user_id,
          type: 'error',
          title: '❌ Deposit Failed',
          message: `Your deposit of ₹${payment.amount} could not be processed.${normalizedPayload.message ? ` Reason: ${normalizedPayload.message}` : ''}`
        });

      console.log(`Payment ${normalizedPayload.order_id} marked as failed`);
    } else {
      // Unknown/pending status - log but don't process
      console.log(`Unknown status "${finalStatus}" for order: ${normalizedPayload.order_id}`);
      
      await supabaseAdmin
        .from('payments')
        .update({
          webhook_payload: payload,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', normalizedPayload.order_id);
    }

    // Update webhook log with validation result
    await supabaseAdmin
      .from('payment_webhook_logs')
      .update({ is_valid: true })
      .eq('order_id', normalizedPayload.order_id);

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully', status: 'success' }),
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
