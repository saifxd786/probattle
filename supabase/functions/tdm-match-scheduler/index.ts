import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleSettings {
  id: string;
  is_enabled: boolean;
  schedule_times: string[];
  match_type: string;
  entry_fee: number;
  prize_pool: number;
  max_slots: number;
  gun_category: string | null;
  auto_cancel_seconds: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'create_daily';

    console.log(`[TDM-SCHEDULER] Action: ${action}`);

    if (action === 'create_daily') {
      // Create daily matches based on schedule settings
      const { data: settings, error: settingsError } = await supabase
        .from('tdm_schedule_settings')
        .select('*')
        .single();

      if (settingsError || !settings) {
        console.error('[TDM-SCHEDULER] No settings found:', settingsError);
        return new Response(
          JSON.stringify({ success: false, message: 'No schedule settings found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!settings.is_enabled) {
        console.log('[TDM-SCHEDULER] Scheduling is disabled');
        return new Response(
          JSON.stringify({ success: true, message: 'Scheduling is disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const scheduleTimes = settings.schedule_times as string[];
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in ms
      const istNow = new Date(now.getTime() + istOffset);
      const todayIST = istNow.toISOString().split('T')[0];

      console.log(`[TDM-SCHEDULER] Creating matches for ${todayIST} IST`);

      const createdMatches: string[] = [];
      const skippedMatches: string[] = [];

      for (const timeStr of scheduleTimes) {
        // Parse time (HH:MM format)
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        // Create match time in IST
        const matchTimeIST = new Date(`${todayIST}T${timeStr}:00+05:30`);
        
        // Skip if match time has already passed
        if (matchTimeIST.getTime() < now.getTime()) {
          skippedMatches.push(`${timeStr} (past)`);
          continue;
        }

        // Calculate auto_cancel_at (10 seconds before match time)
        const autoCancelAt = new Date(matchTimeIST.getTime() - (settings.auto_cancel_seconds * 1000));

        // Check if match already exists for this time
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id')
          .eq('is_auto_scheduled', true)
          .eq('match_time', matchTimeIST.toISOString())
          .single();

        if (existingMatch) {
          skippedMatches.push(`${timeStr} (exists)`);
          continue;
        }

        // Format title with time
        const formattedTime = matchTimeIST.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        });

        // Create match
        // For TDM matches, the winner gets the full prize pool
        const matchData = {
          title: `TDM 1v1 - ${formattedTime}`,
          game: 'bgmi' as const,
          match_type: settings.match_type,
          entry_fee: settings.entry_fee,
          prize_pool: settings.prize_pool,
          first_place_prize: settings.prize_pool, // Winner gets full prize pool in TDM
          max_slots: settings.max_slots,
          match_time: matchTimeIST.toISOString(),
          gun_category: settings.gun_category,
          is_auto_scheduled: true,
          auto_cancel_at: autoCancelAt.toISOString(),
          status: 'upcoming',
          is_free: settings.entry_fee === 0,
        };

        const { error: insertError } = await supabase
          .from('matches')
          .insert(matchData);

        if (insertError) {
          console.error(`[TDM-SCHEDULER] Error creating match at ${timeStr}:`, insertError);
        } else {
          createdMatches.push(timeStr);
          console.log(`[TDM-SCHEDULER] Created match at ${timeStr}`);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Created ${createdMatches.length} matches`,
          created: createdMatches,
          skipped: skippedMatches,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_cancel') {
      // Check for TDM matches that need to be auto-cancelled (auto-scheduled)
      const now = new Date();
      
      // Find matches where auto_cancel_at has passed and not full
      const { data: matchesToCancel, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('is_auto_scheduled', true)
        .eq('status', 'upcoming')
        .lt('auto_cancel_at', now.toISOString())
        .lt('filled_slots', 2); // For 1v1 matches

      if (fetchError) {
        console.error('[TDM-SCHEDULER] Error fetching matches to cancel:', fetchError);
        return new Response(
          JSON.stringify({ success: false, message: fetchError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[TDM-SCHEDULER] Found ${matchesToCancel?.length || 0} matches to cancel`);

      const cancelledMatches: string[] = [];

      for (const match of matchesToCancel || []) {
        // Call the auto_cancel function
        const { data: result, error: cancelError } = await supabase
          .rpc('auto_cancel_unfilled_match', { p_match_id: match.id });

        if (cancelError) {
          console.error(`[TDM-SCHEDULER] Error cancelling match ${match.id}:`, cancelError);
        } else {
          cancelledMatches.push(match.title);
          console.log(`[TDM-SCHEDULER] Cancelled match: ${match.title}`, result);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Cancelled ${cancelledMatches.length} matches`,
          cancelled: cancelledMatches,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cleanup_empty_matches') {
      // Cancel BGMI TDM matches at EXACT match time if less than 2 players registered
      const now = new Date();
      
      // Find all upcoming BGMI matches where match_time has passed and filled_slots < 2
      // This runs every minute, so we check matches within the last 2 minutes to avoid missing any
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      
      const { data: unfullMatches, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('game', 'bgmi')
        .eq('status', 'upcoming')
        .lt('filled_slots', 2) // Less than 2 players = cancel (0 or 1 player)
        .lte('match_time', now.toISOString()) // Match time has passed
        .gte('match_time', twoMinutesAgo.toISOString()); // Within last 2 minutes

      if (fetchError) {
        console.error('[CLEANUP] Error fetching unfull matches:', fetchError);
        return new Response(
          JSON.stringify({ success: false, message: fetchError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[CLEANUP] Found ${unfullMatches?.length || 0} matches with < 2 players at match time`);

      const cancelledMatches: { code: string; title: string; slots: number; refunded: boolean }[] = [];

      for (const match of unfullMatches || []) {
        console.log(`[CLEANUP] Processing match ${match.match_code}: ${match.title} (${match.filled_slots} slots filled)`);
        
        // Use the auto_cancel function which handles refunds
        const { data: result, error: cancelError } = await supabase
          .rpc('auto_cancel_unfilled_match', { p_match_id: match.id });

        if (cancelError) {
          console.error(`[CLEANUP] Error cancelling match ${match.match_code}:`, cancelError);
          
          // Fallback: just update status if RPC fails
          const { error: updateError } = await supabase
            .from('matches')
            .update({ status: 'cancelled' })
            .eq('id', match.id);
            
          if (!updateError) {
            cancelledMatches.push({
              code: match.match_code || 'N/A',
              title: match.title,
              slots: match.filled_slots,
              refunded: false
            });
          }
        } else {
          cancelledMatches.push({
            code: match.match_code || 'N/A',
            title: match.title,
            slots: match.filled_slots,
            refunded: true
          });
          console.log(`[CLEANUP] Cancelled match ${match.match_code}: ${match.title}`, result);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Cancelled ${cancelledMatches.length} matches with insufficient players`,
          cancelled: cancelledMatches,
          checked_at: now.toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_room_timeout') {
      // Cancel TDM matches that are FULL but admin hasn't uploaded room details within 15 minutes of match time
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      
      // Find TDM matches where:
      // - Match type starts with 'tdm'
      // - Status is 'upcoming' or 'live'
      // - Slots are full (filled_slots = max_slots)
      // - Room ID or password is missing
      // - Match time + 15 minutes has passed
      const { data: matchesToCancel, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .like('match_type', 'tdm%')
        .in('status', ['upcoming', 'live'])
        .lte('match_time', fifteenMinutesAgo.toISOString()) // Match time was 15+ mins ago
        .or('room_id.is.null,room_password.is.null');

      if (fetchError) {
        console.error('[TDM-ROOM-TIMEOUT] Error fetching matches:', fetchError);
        return new Response(
          JSON.stringify({ success: false, message: fetchError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filter to only full matches (filled_slots = max_slots)
      const fullMatchesWithoutRoom = (matchesToCancel || []).filter(
        m => m.filled_slots >= m.max_slots && (!m.room_id || !m.room_password)
      );

      console.log(`[TDM-ROOM-TIMEOUT] Found ${fullMatchesWithoutRoom.length} full TDM matches without room details after 15 mins`);

      const cancelledMatches: { id: string; title: string; players: number; totalRefund: number }[] = [];

      for (const match of fullMatchesWithoutRoom) {
        console.log(`[TDM-ROOM-TIMEOUT] Processing: ${match.title} (${match.filled_slots}/${match.max_slots} slots)`);
        
        // 1. Get all registrations for this match
        const { data: registrations, error: regError } = await supabase
          .from('match_registrations')
          .select('id, user_id')
          .eq('match_id', match.id)
          .eq('is_approved', true);

        if (regError) {
          console.error(`[TDM-ROOM-TIMEOUT] Error fetching registrations for ${match.id}:`, regError);
          continue;
        }

        const entryFee = match.entry_fee || 0;
        let refundedCount = 0;

        // 2. Refund each player
        for (const reg of registrations || []) {
          // Get current balance
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', reg.user_id)
            .single();

          if (profile) {
            const currentBalance = Number(profile.wallet_balance || 0);
            const newBalance = currentBalance + entryFee;

            // Update wallet
            await supabase
              .from('profiles')
              .update({ wallet_balance: newBalance })
              .eq('id', reg.user_id);

            // Create refund transaction
            await supabase.from('transactions').insert({
              user_id: reg.user_id,
              type: 'admin_credit',
              amount: entryFee,
              status: 'completed',
              description: `Auto-cancelled: Room details not provided for "${match.title}"`
            });

            // Send notification
            await supabase.from('notifications').insert({
              user_id: reg.user_id,
              title: '⏰ Match Auto-Cancelled',
              message: `"${match.title}" was cancelled because room details weren't provided within 15 minutes. ₹${entryFee} has been refunded to your wallet.`,
              type: 'warning'
            });

            refundedCount++;
          }
        }

        // 3. Delete registrations
        await supabase
          .from('match_registrations')
          .delete()
          .eq('match_id', match.id);

        // 4. Update match status to cancelled
        await supabase
          .from('matches')
          .update({ status: 'cancelled', filled_slots: 0 })
          .eq('id', match.id);

        cancelledMatches.push({
          id: match.id,
          title: match.title,
          players: refundedCount,
          totalRefund: refundedCount * entryFee
        });

        console.log(`[TDM-ROOM-TIMEOUT] Cancelled ${match.title}, refunded ${refundedCount} players ₹${refundedCount * entryFee}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Auto-cancelled ${cancelledMatches.length} TDM matches without room details`,
          cancelled: cancelledMatches,
          checked_at: now.toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Unknown action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TDM-SCHEDULER] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});