import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckRequest {
  playerId: string;
  secondaryPlayerId?: string;
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
    const body: CheckRequest = await req.json()
    const { playerId, secondaryPlayerId } = body

    if (!playerId?.trim()) {
      return new Response(JSON.stringify({ error: 'Player ID required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const playerIdsToCheck = [playerId.trim()]
    if (secondaryPlayerId?.trim()) {
      playerIdsToCheck.push(secondaryPlayerId.trim())
    }

    console.log(`[check-bgmi-duplicate] Checking player IDs: ${playerIdsToCheck.join(', ')} for user: ${userId}`)

    // Check if any of these player IDs are already used by other users
    // Check in both primary and secondary player_id columns
    const { data: existingProfiles, error: checkError } = await supabaseAdmin
      .from('bgmi_profiles')
      .select('user_id, player_id, secondary_player_id, ingame_name, secondary_ingame_name')
      .neq('user_id', userId)
      .or(`player_id.in.(${playerIdsToCheck.join(',')}),secondary_player_id.in.(${playerIdsToCheck.join(',')})`)

    if (checkError) {
      console.error('[check-bgmi-duplicate] Check error:', checkError)
      // Don't block registration on error
      return new Response(JSON.stringify({ success: true, duplicates: [] }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const duplicates: { playerId: string; originalUserId: string; originalIngameName: string }[] = []

    if (existingProfiles && existingProfiles.length > 0) {
      for (const profile of existingProfiles) {
        for (const checkId of playerIdsToCheck) {
          if (profile.player_id === checkId || profile.secondary_player_id === checkId) {
            const originalIngameName = profile.player_id === checkId 
              ? profile.ingame_name 
              : (profile.secondary_ingame_name || profile.ingame_name)
            
            duplicates.push({
              playerId: checkId,
              originalUserId: profile.user_id,
              originalIngameName
            })

            console.log(`[check-bgmi-duplicate] Duplicate found! Player ID: ${checkId}, Original owner: ${profile.user_id}`)

            // Create multi-account alert for admin
            const alertIdentifier = `bgmi_${checkId}`

            // Check if alert already exists
            const { data: existingAlert } = await supabaseAdmin
              .from('multi_account_alerts')
              .select('id, user_ids')
              .eq('alert_type', 'bgmi_player_match')
              .eq('identifier_value', alertIdentifier)
              .eq('is_resolved', false)
              .maybeSingle()

            if (existingAlert) {
              // Update existing alert
              const userIds = existingAlert.user_ids || []
              if (!userIds.includes(userId)) {
                userIds.push(userId)
                await supabaseAdmin
                  .from('multi_account_alerts')
                  .update({ 
                    user_ids: userIds, 
                    user_count: userIds.length,
                    updated_at: new Date().toISOString(),
                    notes: `User ${userId} registered with Player ID ${checkId} (IGN: ${originalIngameName}). Original owner: ${profile.user_id}`
                  })
                  .eq('id', existingAlert.id)
              }
            } else {
              // Create new alert
              await supabaseAdmin
                .from('multi_account_alerts')
                .insert({
                  alert_type: 'bgmi_player_match',
                  severity: 'high',
                  identifier_value: alertIdentifier,
                  user_ids: [profile.user_id, userId],
                  user_count: 2,
                  notes: `User ${userId} registered for match with BGMI Player ID ${checkId} which is already linked to user ${profile.user_id} (IGN: ${originalIngameName}). Possible banned user returning with new account.`
                })

              console.log(`[check-bgmi-duplicate] Alert created for Player ID: ${checkId}`)
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      duplicates,
      message: duplicates.length > 0 ? 'Duplicate player IDs found - alert sent to admin' : 'No duplicates found'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[check-bgmi-duplicate] Error:', errorMessage)
    // Don't block registration on error
    return new Response(JSON.stringify({ success: true, duplicates: [] }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
