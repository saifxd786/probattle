import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const userId = claimsData.claims.sub as string
    const body = await req.json()
    const { code } = body

    if (!code || typeof code !== 'string' || code.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid code format' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Use service role for secure operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`[validate-redeem-code] User: ${userId}, Code: ${code}`)

    // Check if user has bank card linked (requirement)
    const { data: bankCard } = await supabaseAdmin
      .from('user_bank_cards')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (!bankCard) {
      return new Response(JSON.stringify({ 
        error: 'You must link your bank card before redeeming codes',
        errorCode: 'BANK_CARD_REQUIRED'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Find the code (server-side only - client never sees code list)
    const { data: redeemCode, error: codeError } = await supabaseAdmin
      .from('redeem_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single()

    if (codeError || !redeemCode) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Check if expired
    if (redeemCode.expires_at && new Date(redeemCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This code has expired' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Check usage limits
    if (redeemCode.current_uses >= redeemCode.max_uses) {
      return new Response(JSON.stringify({ error: 'This code has reached its usage limit' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Check if user already used this code
    const { data: existingUse } = await supabaseAdmin
      .from('redeem_code_uses')
      .select('id')
      .eq('code_id', redeemCode.id)
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (existingUse) {
      return new Response(JSON.stringify({ error: 'You have already used this code' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // All validations passed - redeem the code
    const rewardAmount = Number(redeemCode.amount)

    // Record usage
    await supabaseAdmin
      .from('redeem_code_uses')
      .insert({
        code_id: redeemCode.id,
        user_id: userId,
        amount: rewardAmount
      })

    // Update usage count
    await supabaseAdmin
      .from('redeem_codes')
      .update({ current_uses: redeemCode.current_uses + 1 })
      .eq('id', redeemCode.id)

    // Credit to wallet
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single()

    if (profile) {
      await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: Number(profile.wallet_balance) + rewardAmount })
        .eq('id', userId)
    }

    // Create transaction record
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: 'prize',
      amount: rewardAmount,
      status: 'completed',
      description: `Redeemed code: ${code.toUpperCase()}`
    })

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: '🎁 Code Redeemed!',
      message: `₹${rewardAmount} added to your wallet!`,
      type: 'success'
    })

    console.log(`[validate-redeem-code] Success! User: ${userId}, Amount: ${rewardAmount}`)

    return new Response(JSON.stringify({
      success: true,
      amount: rewardAmount,
      message: `₹${rewardAmount} added to your wallet!`
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[validate-redeem-code] Error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
