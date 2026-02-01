import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-imb-signature, x-signature',
};

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Timing-safe comparison
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// Verify IMB webhook signature using timing-safe comparison
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    if (!signature || !secret) return false;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Use timing-safe comparison
    const expectedBytes = hexToBytes(expectedSignature);
    const signatureHexBytes = hexToBytes(signature);
    
    return timingSafeEqual(expectedBytes, signatureHexBytes);
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
    // Support multiple signature header names
    const signature = req.headers.get('x-imb-signature') || 
                      req.headers.get('x-signature') || 
                      req.headers.get('signature') || '';
    const IMB_API_TOKEN = Deno.env.get('IMB_API_TOKEN');

    console.log('=== IMB WEBHOOK RECEIVED ===');
    console.log('Signature header present:', !!signature);
    console.log('Raw body:', rawBody);

    // Parse payload - support both JSON and form-urlencoded
    let payload: {
      order_id?: string;
      orderId?: string;
      status?: string;
      amount?: number | string;
      utr?: string;
      transaction_id?: string;
      txn_id?: string;
      message?: string;
    };
    
    try {
      // Try JSON first
      payload = JSON.parse(rawBody);
    } catch {
      // Try form-urlencoded
      try {
        const params = new URLSearchParams(rawBody);
        payload = Object.fromEntries(params.entries());
      } catch {
        console.error('Invalid payload format');
        return new Response(
          JSON.stringify({ error: 'Invalid payload format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Parsed payload:', payload);

    // Normalize field names (IMB might use different field names)
    const normalizedPayload = {
      order_id: payload.order_id || payload.orderId || '',
      status: (payload.status || '').toString().toUpperCase(),
      amount: Number(payload.amount) || 0,
      utr: payload.utr || payload.transaction_id || payload.txn_id || '',
      message: payload.message || ''
    };

    console.log('Normalized payload:', normalizedPayload);

    // Log webhook for audit (before any validation)
    await supabaseAdmin
      .from('payment_webhook_logs')
      .insert({
        order_id: normalizedPayload.order_id || 'unknown',
        payload: payload,
        signature: signature || null,
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

    // Verify signature (if token is configured and signature is present)
    if (IMB_API_TOKEN && signature) {
      const isValidSignature = await verifySignature(rawBody, signature, IMB_API_TOKEN);
      if (!isValidSignature) {
        console.error('Invalid webhook signature');
        
        await supabaseAdmin
          .from('payment_webhook_logs')
          .update({ is_valid: false })
          .eq('order_id', normalizedPayload.order_id);
        
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Signature verified successfully');
    } else {
      console.log('Skipping signature verification (no signature provided or token not configured)');
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

    // ANTI-FRAUD: Verify amount matches (if amount provided in webhook)
    if (normalizedPayload.amount > 0 && Number(payment.amount) !== normalizedPayload.amount) {
      console.error('Amount mismatch! DB:', payment.amount, 'Webhook:', normalizedPayload.amount);
      
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
            received_amount: normalizedPayload.amount
          },
          performed_by: 'imb-webhook'
        });
      
      return new Response(
        JSON.stringify({ error: 'Amount mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process based on status
    const isSuccess = ['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID', 'TXN_SUCCESS'].includes(normalizedPayload.status);
    const isFailed = ['FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'TXN_FAILURE', 'EXPIRED'].includes(normalizedPayload.status);

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
      console.log(`Unknown status "${normalizedPayload.status}" for order: ${normalizedPayload.order_id}`);
      
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
