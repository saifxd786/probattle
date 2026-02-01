import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassicScheduleSettings {
  id: string;
  is_enabled: boolean;
  schedule_times: string[];
  entry_fee: number;
  prize_pool: number;
  max_slots: number;
  map_name: string | null;
  first_place_prize: number | null;
  second_place_prize: number | null;
  third_place_prize: number | null;
  prize_per_kill: number | null;
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

    console.log(`[CLASSIC-SCHEDULER] Action: ${action}`);

    if (action === 'create_daily') {
      // Create daily matches based on schedule settings
      const { data: settings, error: settingsError } = await supabase
        .from('classic_schedule_settings')
        .select('*')
        .single();

      if (settingsError || !settings) {
        console.error('[CLASSIC-SCHEDULER] No settings found:', settingsError);
        return new Response(
          JSON.stringify({ success: false, message: 'No schedule settings found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!settings.is_enabled) {
        console.log('[CLASSIC-SCHEDULER] Scheduling is disabled');
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

      console.log(`[CLASSIC-SCHEDULER] Creating matches for ${todayIST} IST`);

      const createdMatches: string[] = [];
      const skippedMatches: string[] = [];

      // Map name display mapping
      const mapDisplayNames: Record<string, string> = {
        'erangel': 'Erangel',
        'miramar': 'Miramar',
        'sanhok': 'Sanhok',
        'vikendi': 'Vikendi',
        'livik': 'Livik',
        'all_maps': 'All Maps',
      };

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

        // Calculate auto_cancel_at (before match time)
        const autoCancelAt = new Date(matchTimeIST.getTime() - (settings.auto_cancel_seconds * 1000));

        // Check if match already exists for this time
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id')
          .eq('is_auto_scheduled', true)
          .eq('match_type', 'classic')
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

        const mapName = settings.map_name || 'erangel';
        const mapDisplayName = mapDisplayNames[mapName] || 'Erangel';

        // Create match
        const matchData = {
          title: `Classic ${mapDisplayName} - ${formattedTime}`,
          game: 'bgmi' as const,
          match_type: 'classic',
          entry_fee: settings.entry_fee,
          prize_pool: settings.prize_pool,
          max_slots: settings.max_slots,
          match_time: matchTimeIST.toISOString(),
          map_name: mapName,
          first_place_prize: settings.first_place_prize,
          second_place_prize: settings.second_place_prize,
          third_place_prize: settings.third_place_prize,
          prize_per_kill: settings.prize_per_kill,
          is_auto_scheduled: true,
          auto_cancel_at: autoCancelAt.toISOString(),
          status: 'upcoming',
          is_free: settings.entry_fee === 0,
        };

        const { error: insertError } = await supabase
          .from('matches')
          .insert(matchData);

        if (insertError) {
          console.error(`[CLASSIC-SCHEDULER] Error creating match at ${timeStr}:`, insertError);
        } else {
          createdMatches.push(timeStr);
          console.log(`[CLASSIC-SCHEDULER] Created match at ${timeStr}`);
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
      // Check for Classic matches that need to be auto-cancelled
      const now = new Date();
      
      // Find matches where auto_cancel_at has passed and not enough players
      const { data: matchesToCancel, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('is_auto_scheduled', true)
        .eq('match_type', 'classic')
        .eq('status', 'upcoming')
        .lt('auto_cancel_at', now.toISOString())
        .lt('filled_slots', 2); // Minimum 2 players required

      if (fetchError) {
        console.error('[CLASSIC-SCHEDULER] Error fetching matches to cancel:', fetchError);
        return new Response(
          JSON.stringify({ success: false, message: fetchError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[CLASSIC-SCHEDULER] Found ${matchesToCancel?.length || 0} matches to cancel`);

      const cancelledMatches: string[] = [];

      for (const match of matchesToCancel || []) {
        // Call the auto_cancel function
        const { data: result, error: cancelError } = await supabase
          .rpc('auto_cancel_unfilled_match', { p_match_id: match.id });

        if (cancelError) {
          console.error(`[CLASSIC-SCHEDULER] Error cancelling match ${match.id}:`, cancelError);
        } else {
          cancelledMatches.push(match.title);
          console.log(`[CLASSIC-SCHEDULER] Cancelled match: ${match.title}`, result);
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
      // Cancel Classic matches at EXACT match time if less than 2 players registered
      const now = new Date();
      
      // Find all upcoming Classic matches where match_time has passed and filled_slots < 2
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      
      const { data: unfullMatches, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('game', 'bgmi')
        .eq('match_type', 'classic')
        .eq('status', 'upcoming')
        .lt('filled_slots', 2)
        .lte('match_time', now.toISOString())
        .gte('match_time', twoMinutesAgo.toISOString());

      if (fetchError) {
        console.error('[CLASSIC-CLEANUP] Error fetching unfull matches:', fetchError);
        return new Response(
          JSON.stringify({ success: false, message: fetchError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[CLASSIC-CLEANUP] Found ${unfullMatches?.length || 0} matches with < 2 players at match time`);

      const cancelledMatches: { code: string; title: string; slots: number; refunded: boolean }[] = [];

      for (const match of unfullMatches || []) {
        console.log(`[CLASSIC-CLEANUP] Processing match ${match.match_code}: ${match.title} (${match.filled_slots} slots filled)`);
        
        const { data: result, error: cancelError } = await supabase
          .rpc('auto_cancel_unfilled_match', { p_match_id: match.id });

        if (cancelError) {
          console.error(`[CLASSIC-CLEANUP] Error cancelling match ${match.match_code}:`, cancelError);
          
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
          console.log(`[CLASSIC-CLEANUP] Cancelled match ${match.match_code}: ${match.title}`, result);
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

    return new Response(
      JSON.stringify({ success: false, message: 'Unknown action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLASSIC-SCHEDULER] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
