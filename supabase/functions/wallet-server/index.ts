import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface WalletAction {
  action: 'deposit' | 'withdraw' | 'admin_update' | 'redeem_code' | 'save_bank_card';
  amount?: number;
  reason?: string;
  utrId?: string;
  screenshotPath?: string;
  targetUserId?: string;
  code?: string;
  bankCard?: {
    accountHolderName: string;
    cardNumber: string;
    ifscCode: string;
    bankName: string;
  };
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
    const body: WalletAction = await req.json()
    const { action, amount, reason, utrId, screenshotPath, targetUserId, code, bankCard } = body

    // Use service role for secure operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`[wallet-server] Action: ${action}, User: ${userId}`)

    switch (action) {
      // ===== DEPOSIT REQUEST =====
      case 'deposit': {
        if (!amount || amount < 50) {
          return new Response(JSON.stringify({ error: 'Minimum deposit is ₹50' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        if (!utrId || utrId.trim().length < 6) {
          return new Response(JSON.stringify({ error: 'Invalid UTR ID' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Create deposit transaction (pending)
        const { data: tx, error: txError } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'deposit',
            amount: amount,
            status: 'pending',
            description: `Deposit request of ₹${amount}`,
            screenshot_url: screenshotPath || null,
            utr_id: utrId.trim(),
          })
          .select('id')
          .single()

        if (txError) {
          console.error('[wallet-server] Deposit error:', txError)
          return new Response(JSON.stringify({ error: 'Failed to create deposit request' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        console.log(`[wallet-server] Deposit request created: ${tx.id}`)

        return new Response(JSON.stringify({ 
          success: true, 
          transactionId: tx.id,
          message: 'Deposit request submitted. Waiting for admin approval.'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // ===== WITHDRAWAL REQUEST =====
      case 'withdraw': {
        const MIN_WITHDRAWAL = 110

        if (!amount || amount < MIN_WITHDRAWAL) {
          return new Response(JSON.stringify({ error: `Minimum withdrawal is ₹${MIN_WITHDRAWAL}` }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Get user profile with wallet balance and wager requirement
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('wallet_balance, wager_requirement')
          .eq('id', userId)
          .single()

        if (profileError || !profile) {
          return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        if (Number(profile.wallet_balance) < amount) {
          return new Response(JSON.stringify({ error: 'Insufficient balance' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        if (Number(profile.wager_requirement || 0) > 0) {
          return new Response(JSON.stringify({ 
            error: `Wager requirement not met. Use ₹${Number(profile.wager_requirement).toFixed(2)} more on matches.`
          }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Get bank card
        const { data: bankCardData, error: bankError } = await supabaseAdmin
          .from('user_bank_cards')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (bankError || !bankCardData) {
          return new Response(JSON.stringify({ error: 'Bank card not linked. Please add bank details first.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Deduct balance atomically
        const newBalance = Number(profile.wallet_balance) - amount
        const { error: deductError } = await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', userId)
          .eq('wallet_balance', profile.wallet_balance) // Optimistic lock

        if (deductError) {
          return new Response(JSON.stringify({ error: 'Failed to deduct balance. Please try again.' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Create withdrawal transaction
        const description = `Withdrawal of ₹${amount} | ${bankCardData.account_holder_name} | A/C: ****${bankCardData.card_number.slice(-4)} | ${bankCardData.bank_name} | IFSC: ${bankCardData.ifsc_code}`
        
        const { data: tx, error: txError } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'withdrawal',
            amount: amount,
            status: 'pending',
            description: description,
          })
          .select('id')
          .single()

        if (txError) {
          // Rollback balance
          await supabaseAdmin
            .from('profiles')
            .update({ wallet_balance: profile.wallet_balance })
            .eq('id', userId)

          return new Response(JSON.stringify({ error: 'Failed to create withdrawal request' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        console.log(`[wallet-server] Withdrawal created: ${tx.id}, Amount: ${amount}`)

        return new Response(JSON.stringify({ 
          success: true, 
          transactionId: tx.id,
          newBalance: newBalance,
          message: 'Withdrawal request submitted.'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // ===== ADMIN WALLET UPDATE =====
      case 'admin_update': {
        if (!amount || !reason || !targetUserId) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Check if user is admin
        const { data: adminRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single()

        if (!adminRole) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin only' }), { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Get target user's current balance
        const { data: targetProfile, error: targetError } = await supabaseAdmin
          .from('profiles')
          .select('wallet_balance, username')
          .eq('id', targetUserId)
          .single()

        if (targetError || !targetProfile) {
          return new Response(JSON.stringify({ error: 'Target user not found' }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        const currentBalance = Number(targetProfile.wallet_balance) || 0
        const newBalance = currentBalance + amount

        if (newBalance < 0) {
          return new Response(JSON.stringify({ error: 'Cannot debit more than current balance' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Update balance
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', targetUserId)

        if (updateError) {
          return new Response(JSON.stringify({ error: 'Failed to update wallet' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Create transaction record
        const txType = amount > 0 ? 'admin_credit' : 'admin_debit'
        await supabaseAdmin.from('transactions').insert({
          user_id: targetUserId,
          type: txType,
          amount: Math.abs(amount),
          status: 'completed',
          description: `${amount > 0 ? 'Credit' : 'Debit'} by Admin: ${reason}`,
        })

        // Audit log
        await supabaseAdmin.from('admin_audit_logs').insert({
          performed_by: userId,
          user_id: targetUserId,
          action_type: 'wallet_update',
          entity_type: 'wallet',
          entity_id: targetUserId,
          details: {
            amount,
            reason,
            old_balance: currentBalance,
            new_balance: newBalance,
          }
        })

        console.log(`[wallet-server] Admin update: ${targetUserId}, Amount: ${amount}, By: ${userId}`)

        return new Response(JSON.stringify({ 
          success: true, 
          newBalance: newBalance,
          message: `Wallet ${amount > 0 ? 'credited' : 'debited'} successfully`
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // ===== SAVE BANK CARD =====
      case 'save_bank_card': {
        if (!bankCard) {
          return new Response(JSON.stringify({ error: 'Bank card details required' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        const { accountHolderName, cardNumber, ifscCode, bankName } = bankCard

        if (!accountHolderName?.trim() || !cardNumber?.trim() || !ifscCode?.trim() || !bankName?.trim()) {
          return new Response(JSON.stringify({ error: 'All bank card fields are required' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Check if user already has a bank card
        const { data: existingCard } = await supabaseAdmin
          .from('user_bank_cards')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (existingCard) {
          return new Response(JSON.stringify({ error: 'Bank card already linked. Cannot modify.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Check if this bank account (card_number + ifsc_code) is already used by another user
        const { data: duplicateCard } = await supabaseAdmin
          .from('user_bank_cards')
          .select('id, user_id')
          .eq('card_number', cardNumber.trim())
          .eq('ifsc_code', ifscCode.trim().toUpperCase())
          .neq('user_id', userId)
          .maybeSingle()

        if (duplicateCard) {
          console.log(`[wallet-server] Duplicate bank card attempt: ${cardNumber.slice(-4)} by user ${userId}, original owner: ${duplicateCard.user_id}`)
          
          // Create multi-account alert for admin
          const alertIdentifier = `bank_${cardNumber.trim().slice(-4)}_${ifscCode.trim().toUpperCase()}`
          
          // Check if alert already exists for these users
          const { data: existingAlert } = await supabaseAdmin
            .from('multi_account_alerts')
            .select('id, user_ids')
            .eq('alert_type', 'bank_card_match')
            .eq('identifier_value', alertIdentifier)
            .eq('is_resolved', false)
            .maybeSingle()

          if (existingAlert) {
            // Update existing alert if this user is not already in the list
            const userIds = existingAlert.user_ids || []
            if (!userIds.includes(userId)) {
              userIds.push(userId)
              await supabaseAdmin
                .from('multi_account_alerts')
                .update({ 
                  user_ids: userIds, 
                  user_count: userIds.length,
                  updated_at: new Date().toISOString(),
                  notes: `Attempt by user ${userId} to bind bank ****${cardNumber.slice(-4)}. Original owner: ${duplicateCard.user_id}`
                })
                .eq('id', existingAlert.id)
            }
          } else {
            // Create new alert
            await supabaseAdmin
              .from('multi_account_alerts')
              .insert({
                alert_type: 'bank_card_match',
                severity: 'critical',
                identifier_value: alertIdentifier,
                user_ids: [duplicateCard.user_id, userId],
                user_count: 2,
                notes: `User ${userId} tried to bind bank account ****${cardNumber.slice(-4)} (IFSC: ${ifscCode.trim().toUpperCase()}) which is already linked to user ${duplicateCard.user_id}`
              })
          }

          return new Response(JSON.stringify({ error: 'This bank details already in use by someone else' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Save bank card
        const { data: newCard, error: cardError } = await supabaseAdmin
          .from('user_bank_cards')
          .insert({
            user_id: userId,
            account_holder_name: accountHolderName.trim(),
            card_number: cardNumber.trim(),
            ifsc_code: ifscCode.trim().toUpperCase(),
            bank_name: bankName.trim(),
          })
          .select('id, account_holder_name, card_number, ifsc_code, bank_name')
          .single()

        if (cardError) {
          console.error('[wallet-server] Save bank card error:', cardError)
          return new Response(JSON.stringify({ error: 'Failed to save bank details' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        console.log(`[wallet-server] Bank card saved for user: ${userId}`)

        return new Response(JSON.stringify({ 
          success: true, 
          bankCard: newCard,
          message: 'Bank details saved successfully'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // ===== REDEEM CODE =====
      case 'redeem_code': {
        if (!code?.trim()) {
          return new Response(JSON.stringify({ error: 'Redeem code required' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Check if user has bank card (required for redeem)
        const { data: bankCardExists } = await supabaseAdmin
          .from('user_bank_cards')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (!bankCardExists) {
          return new Response(JSON.stringify({ error: 'Bank card required. Please link bank details first.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Find the code
        const { data: codeData, error: codeError } = await supabaseAdmin
          .from('redeem_codes')
          .select('*')
          .eq('code', code.trim().toUpperCase())
          .eq('is_active', true)
          .single()

        if (codeError || !codeData) {
          return new Response(JSON.stringify({ error: 'Invalid or inactive code' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Check expiry
        if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: 'Code has expired' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Check max uses
        if (codeData.current_uses >= codeData.max_uses) {
          return new Response(JSON.stringify({ error: 'Code has reached maximum uses' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Check if user already used this code
        const { data: existingUse } = await supabaseAdmin
          .from('redeem_code_uses')
          .select('id')
          .eq('code_id', codeData.id)
          .eq('user_id', userId)
          .single()

        if (existingUse) {
          return new Response(JSON.stringify({ error: 'You have already used this code' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Record the use
        const { error: useError } = await supabaseAdmin
          .from('redeem_code_uses')
          .insert({
            code_id: codeData.id,
            user_id: userId,
            amount: codeData.amount,
          })

        if (useError) {
          return new Response(JSON.stringify({ error: 'Failed to redeem code' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Update code uses count
        await supabaseAdmin
          .from('redeem_codes')
          .update({ current_uses: codeData.current_uses + 1 })
          .eq('id', codeData.id)

        // Credit wallet
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single()

        const currentBalance = Number(profile?.wallet_balance) || 0
        const newBalance = currentBalance + codeData.amount

        await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', userId)

        // Create transaction
        await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          type: 'admin_credit',
          amount: codeData.amount,
          status: 'completed',
          description: `Redeemed code: ${codeData.code}`,
        })

        console.log(`[wallet-server] Code redeemed: ${codeData.code}, Amount: ${codeData.amount}, User: ${userId}`)

        return new Response(JSON.stringify({ 
          success: true, 
          amount: codeData.amount,
          newBalance: newBalance,
          message: `₹${codeData.amount} added to your wallet!`
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[wallet-server] Error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
