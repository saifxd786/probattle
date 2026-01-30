import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface MinesGame {
  id: string;
  user_id: string;
  entry_amount: number;
  mines_count: number;
  mine_positions: number[];
  revealed_positions: number[];
  current_multiplier: number;
  potential_win: number;
  status: string;
}

// Calculate multiplier based on probability
function calculateMultiplier(minesCount: number, revealedCount: number, platformCommission: number): number {
  if (revealedCount === 0) return 1;
  
  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;
  
  let multiplier = 1;
  for (let i = 0; i < revealedCount; i++) {
    const remainingTiles = totalTiles - i;
    const remainingSafe = safeTiles - i;
    multiplier *= (remainingTiles / remainingSafe);
  }
  
  const houseEdge = 1 - platformCommission;
  const finalMultiplier = multiplier * houseEdge;
  
  return Math.max(1.01, Math.round(finalMultiplier * 100) / 100);
}

// Generate mine positions server-side (NEVER exposed to client)
function generateMinePositions(count: number): number[] {
  const positions: number[] = [];
  while (positions.length < count) {
    const pos = Math.floor(Math.random() * 25);
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }
  return positions;
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
    const { action, gameId, position, entryAmount, minesCount } = body

    // Use service role for secure operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`[mines-game-server] Action: ${action}, User: ${userId}, GameId: ${gameId}`)

    switch (action) {
      case 'start': {
        // Validate inputs
        if (!entryAmount || entryAmount < 10) {
          return new Response(JSON.stringify({ error: 'Minimum entry is ₹10' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
        
        if (!minesCount || minesCount < 1 || minesCount > 24) {
          return new Response(JSON.stringify({ error: 'Invalid mines count' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Check wallet balance
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('wallet_balance')
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

        // Deduct entry fee
        const { error: deductError } = await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance: Number(profile.wallet_balance) - entryAmount })
          .eq('id', userId)

        if (deductError) {
          return new Response(JSON.stringify({ error: 'Failed to deduct entry fee' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Generate mine positions SERVER-SIDE (secret, never sent to client)
        const minePositions = generateMinePositions(minesCount)

        // Create game record
        const { data: game, error: gameError } = await supabaseAdmin
          .from('mines_games')
          .insert({
            user_id: userId,
            entry_amount: entryAmount,
            mines_count: minesCount,
            mine_positions: minePositions, // Stored securely on server
            revealed_positions: [],
            current_multiplier: 1,
            potential_win: entryAmount,
            status: 'in_progress'
          })
          .select('id, entry_amount, mines_count, current_multiplier, potential_win, status, revealed_positions')
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

        console.log(`[mines-game-server] Game started: ${game.id}`)

        // Return game info WITHOUT mine_positions
        return new Response(JSON.stringify({
          success: true,
          game: {
            id: game.id,
            entryAmount: game.entry_amount,
            minesCount: game.mines_count,
            currentMultiplier: game.current_multiplier,
            potentialWin: game.potential_win,
            revealedPositions: game.revealed_positions,
            status: game.status
          }
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      case 'reveal': {
        if (!gameId || position === undefined || position < 0 || position > 24) {
          return new Response(JSON.stringify({ error: 'Invalid position' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Get game (including secret mine_positions)
        const { data: game, error: gameError } = await supabaseAdmin
          .from('mines_games')
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

        const typedGame = game as MinesGame

        // Check if already revealed
        if (typedGame.revealed_positions.includes(position)) {
          return new Response(JSON.stringify({ error: 'Position already revealed' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        const isMine = typedGame.mine_positions.includes(position)
        const newRevealed = [...typedGame.revealed_positions, position]

        if (isMine) {
          // Hit a mine - game over
          await supabaseAdmin
            .from('mines_games')
            .update({
              revealed_positions: newRevealed,
              is_mine_hit: true,
              status: 'lost',
              final_amount: 0,
              completed_at: new Date().toISOString()
            })
            .eq('id', gameId)

          console.log(`[mines-game-server] Mine hit in game: ${gameId}`)

          return new Response(JSON.stringify({
            success: true,
            isMine: true,
            revealedPositions: newRevealed,
            minePositions: typedGame.mine_positions, // Reveal all mines on game over
            finalAmount: 0
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        } else {
          // Safe tile
          const newMultiplier = calculateMultiplier(typedGame.mines_count, newRevealed.length, 0.1)
          const newPotentialWin = Math.floor(Number(typedGame.entry_amount) * newMultiplier)

          await supabaseAdmin
            .from('mines_games')
            .update({
              revealed_positions: newRevealed,
              current_multiplier: newMultiplier,
              potential_win: newPotentialWin
            })
            .eq('id', gameId)

          // Check if all safe tiles revealed
          const allSafeRevealed = newRevealed.length === 25 - typedGame.mines_count

          if (allSafeRevealed) {
            // Auto-cashout
            await supabaseAdmin
              .from('mines_games')
              .update({
                is_cashed_out: true,
                status: 'won',
                final_amount: newPotentialWin,
                completed_at: new Date().toISOString()
              })
              .eq('id', gameId)

            // Credit winnings
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('wallet_balance')
              .eq('id', userId)
              .single()

            if (profile) {
              await supabaseAdmin
                .from('profiles')
                .update({ wallet_balance: Number(profile.wallet_balance) + newPotentialWin })
                .eq('id', userId)
            }
          }

          return new Response(JSON.stringify({
            success: true,
            isMine: false,
            revealedPositions: newRevealed,
            currentMultiplier: newMultiplier,
            potentialWin: newPotentialWin,
            allSafeRevealed
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
      }

      case 'cashout': {
        if (!gameId) {
          return new Response(JSON.stringify({ error: 'Game ID required' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        // Get game
        const { data: game, error: gameError } = await supabaseAdmin
          .from('mines_games')
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

        const typedGame = game as MinesGame

        if (typedGame.revealed_positions.length === 0) {
          return new Response(JSON.stringify({ error: 'No gems revealed yet' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }

        const winAmount = typedGame.potential_win

        // Update game
        await supabaseAdmin
          .from('mines_games')
          .update({
            is_cashed_out: true,
            status: 'won',
            final_amount: winAmount,
            completed_at: new Date().toISOString()
          })
          .eq('id', gameId)

        // Credit winnings
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single()

        if (profile) {
          await supabaseAdmin
            .from('profiles')
            .update({ wallet_balance: Number(profile.wallet_balance) + winAmount })
            .eq('id', userId)

          // Create notification
          await supabaseAdmin.from('notifications').insert({
            user_id: userId,
            title: '💎 Mines Victory!',
            message: `You won ₹${winAmount} in Mines!`,
            type: 'success'
          })
        }

        console.log(`[mines-game-server] Cashout in game: ${gameId}, Amount: ${winAmount}`)

        return new Response(JSON.stringify({
          success: true,
          finalAmount: winAmount,
          minePositions: typedGame.mine_positions // Reveal mines after cashout
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
    console.error('[mines-game-server] Error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
