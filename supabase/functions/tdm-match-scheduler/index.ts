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
        const matchData = {
          title: `TDM 1v1 - ${formattedTime}`,
          game: 'bgmi' as const,
          match_type: settings.match_type,
          entry_fee: settings.entry_fee,
          prize_pool: settings.prize_pool,
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
      // Cancel ALL BGMI matches with 0 registrations that are past their start time or close to it
      const now = new Date();
      
      // 5 minutes buffer - cancel matches with 0 slots that are within 5 mins of start or past start
      const bufferTime = new Date(now.getTime() + 5 * 60 * 1000);
      
      // Find all upcoming BGMI matches with 0 filled slots that are about to start or past start
      const { data: emptyMatches, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('game', 'bgmi')
        .eq('status', 'upcoming')
        .eq('filled_slots', 0)
        .lt('match_time', bufferTime.toISOString());

      if (fetchError) {
        console.error('[CLEANUP] Error fetching empty matches:', fetchError);
        return new Response(
          JSON.stringify({ success: false, message: fetchError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[CLEANUP] Found ${emptyMatches?.length || 0} empty matches to remove`);

      const removedMatches: string[] = [];

      for (const match of emptyMatches || []) {
        // Update status to cancelled
        const { error: updateError } = await supabase
          .from('matches')
          .update({ status: 'cancelled' })
          .eq('id', match.id);

        if (updateError) {
          console.error(`[CLEANUP] Error cancelling match ${match.id}:`, updateError);
        } else {
          removedMatches.push(match.title);
          console.log(`[CLEANUP] Cancelled empty match: ${match.title}`);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Removed ${removedMatches.length} empty matches`,
          removed: removedMatches,
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