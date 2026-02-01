import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface ThimbleGame {
  id: string;
  user_id: string;
  entry_amount: number;
  reward_amount: number;
  ball_position: number; // SECRET - server only
  selected_position: number | null;
  is_win: boolean | null;
  difficulty: string;
  status: string;
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
    const { action, gameId, entryAmount, difficulty, selectedPosition } = body

    // Use service role for secure operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`[thimble-game-server] Action: ${action}, User: ${userId}`)

    switch (action) {
      // ===== START GAME =====
      case 'start': {
        // === AUTO-CLOSE ORPHANED GAMES ===
        // Close any stale in_progress games as LOST (user abandoned/disconnected)
        const { data: orphanedMines } = await supabaseAdmin
          .from('mines_games')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'in_progress')

        if (orphanedMines && orphanedMines.length > 0) {
          console.log(`[thimble-game-server] Auto-closing ${orphanedMines.length} orphaned Mines games as LOST`)
          for (const game of orphanedMines) {
            await supabaseAdmin
              .from('mines_games')
              .update({
                status: 'lost',
                is_mine_hit: true,
                is_cashed_out: false,
                final_amount: 0,
                completed_at: new Date().toISOString()
              })
              .eq('id', game.id)
          }
        }

        const { data: orphanedThimble } = await supabaseAdmin
          .from('thimble_games')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'in_progress')

        if (orphanedThimble && orphanedThimble.length > 0) {
          console.log(`[thimble-game-server] Auto-closing ${orphanedThimble.length} orphaned Thimble games as LOST`)
          for (const game of orphanedThimble) {
            await supabaseAdmin
              .from('thimble_games')
              .update({
                status: 'completed',
                is_win: false,
                completed_at: new Date().toISOString()
              })
              .eq('id', game.id)
          }
        }
        // === END AUTO-CLOSE ===

        // Validate inputs
        if (!entryAmount || entryAmount < 10) {
          return new Response(JSON.stringify({ error: 'Minimum entry is ₹10' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        const validDifficulties = ['easy', 'hard', 'impossible']
        if (!difficulty || !validDifficulties.includes(difficulty)) {
          return new Response(JSON.stringify({ error: 'Invalid difficulty' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Check wallet balance and get wager requirement
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('wallet_balance, wager_requirement')
          .eq('id', userId)
          .single()

        if (profileError || !profile) {
          return new Response(JSON.stringify({ error: 'Failed to get profile' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        if (Number(profile.wallet_balance) < entryAmount) {
          return new Response(JSON.stringify({ error: 'Insufficient balance' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Get reward multiplier from settings
        const { data: settings } = await supabaseAdmin
          .from('thimble_settings')
          .select('*')
          .limit(1)
          .single()

        let rewardMultiplier = 1.5
        if (settings) {
          if (difficulty === 'easy') rewardMultiplier = Number(settings.reward_multiplier_easy) || 1.5
          else if (difficulty === 'hard') rewardMultiplier = Number(settings.reward_multiplier_hard) || 2
          else if (difficulty === 'impossible') rewardMultiplier = Number(settings.reward_multiplier_impossible) || 3
        }

        // Deduct entry fee AND reduce wager requirement
        const currentWager = Number(profile.wager_requirement || 0);
        const newWager = Math.max(0, currentWager - entryAmount);
        
        const { error: deductError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            wallet_balance: Number(profile.wallet_balance) - entryAmount,
            wager_requirement: newWager
          })
          .eq('id', userId)

        if (deductError) {
          return new Response(JSON.stringify({ error: 'Failed to deduct entry fee' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
        
        console.log(`[thimble-game-server] Wager reduced: ${currentWager} -> ${newWager} (bet: ${entryAmount})`)

        // Generate ball position SERVER-SIDE (secret, never sent to client)
        const ballPosition = Math.floor(Math.random() * 3)
        const rewardAmount = Math.floor(entryAmount * rewardMultiplier)

        // Create game record
        const { data: game, error: gameError } = await supabaseAdmin
          .from('thimble_games')
          .insert({
            user_id: userId,
            entry_amount: entryAmount,
            reward_amount: rewardAmount,
            ball_position: ballPosition, // Stored securely on server
            difficulty: difficulty,
            status: 'in_progress'
          })
          .select('id, entry_amount, reward_amount, difficulty, status')
          .single()

        if (gameError || !game) {
          // Refund on error
          await supabaseAdmin
            .from('profiles')
            .update({ wallet_balance: Number(profile.wallet_balance) })
            .eq('id', userId)
          
          return new Response(JSON.stringify({ error: 'Failed to start game' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        console.log(`[thimble-game-server] Game started: ${game.id}, Ball at: ${ballPosition}`)

        // Return game info WITHOUT ball_position
        return new Response(JSON.stringify({
          success: true,
          game: {
            id: game.id,
            entryAmount: game.entry_amount,
            rewardAmount: game.reward_amount,
            difficulty: game.difficulty,
            status: game.status
          }
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      case 'select': {
        // selectedPosition:
        // - 0..2 = user selected a cup
        // - -1   = timeout (user did not select)
        const isTimeout = selectedPosition === -1
        const isValidSelection = selectedPosition !== undefined && (isTimeout || (selectedPosition >= 0 && selectedPosition <= 2))

        if (!gameId || !isValidSelection) {
          return new Response(JSON.stringify({ error: 'Invalid selection' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Get game (including secret ball_position)
        const { data: game, error: gameError } = await supabaseAdmin
          .from('thimble_games')
          .select('*')
          .eq('id', gameId)
          .eq('user_id', userId)
          .eq('status', 'in_progress')
          .single()

        if (gameError || !game) {
          return new Response(JSON.stringify({ error: 'Game not found or already completed' }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        const typedGame = game as ThimbleGame
        const isWin = !isTimeout && selectedPosition === typedGame.ball_position

        // Update game with result
        await supabaseAdmin
          .from('thimble_games')
          .update({
            selected_position: isTimeout ? null : selectedPosition,
            is_win: isWin,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (isWin) {
          // Credit reward
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('wallet_balance')
            .eq('id', userId)
            .single()

          if (profile) {
            await supabaseAdmin
              .from('profiles')
              .update({ wallet_balance: Number(profile.wallet_balance) + typedGame.reward_amount })
              .eq('id', userId)

            // Create notification
            await supabaseAdmin.from('notifications').insert({
              user_id: userId,
              title: '🎉 Thimble Victory!',
              message: `You won ₹${typedGame.reward_amount} in Thimble Game!`,
              type: 'success'
            })
          }

          console.log(`[thimble-game-server] Win in game: ${gameId}, Amount: ${typedGame.reward_amount}`)
        } else {
          console.log(`[thimble-game-server] Loss in game: ${gameId}`)
        }

        return new Response(JSON.stringify({
          success: true,
          isWin,
          ballPosition: typedGame.ball_position, // Reveal after game ends
          selectedPosition: isTimeout ? null : selectedPosition,
          timedOut: isTimeout,
          rewardAmount: isWin ? typedGame.reward_amount : 0
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
    console.error('[thimble-game-server] Error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
