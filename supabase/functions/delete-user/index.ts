import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header to verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a regular client to verify the caller
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user: caller }, error: callerError } = await supabaseAnon.auth.getUser();
    if (callerError || !caller) {
      console.error('Caller verification failed:', callerError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      console.error('Caller is not admin:', caller.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user to delete
    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot delete yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${caller.id} deleting user ${userId}`);

    // Delete all related data in order (respect FK constraints)
    // First delete support messages for user's tickets
    const { data: ticketIds } = await supabaseAdmin
      .from('support_tickets')
      .select('id')
      .eq('user_id', userId);

    if (ticketIds && ticketIds.length > 0) {
      for (const ticket of ticketIds) {
        await supabaseAdmin.from('support_messages').delete().eq('ticket_id', ticket.id);
      }
    }

    // Delete ludo match players for user's created matches
    const { data: ludoMatches } = await supabaseAdmin
      .from('ludo_matches')
      .select('id')
      .eq('created_by', userId);

    if (ludoMatches && ludoMatches.length > 0) {
      for (const match of ludoMatches) {
        await supabaseAdmin.from('ludo_match_players').delete().eq('match_id', match.id);
      }
    }

    // Delete all user data in parallel
    const deleteOperations = [
      supabaseAdmin.from('notifications').delete().eq('user_id', userId),
      supabaseAdmin.from('support_tickets').delete().eq('user_id', userId),
      supabaseAdmin.from('transactions').delete().eq('user_id', userId),
      supabaseAdmin.from('match_registrations').delete().eq('user_id', userId),
      supabaseAdmin.from('match_results').delete().eq('user_id', userId),
      supabaseAdmin.from('mines_games').delete().eq('user_id', userId),
      supabaseAdmin.from('thimble_games').delete().eq('user_id', userId),
      supabaseAdmin.from('redeem_code_uses').delete().eq('user_id', userId),
      supabaseAdmin.from('user_roles').delete().eq('user_id', userId),
      supabaseAdmin.from('referrals').delete().eq('referrer_id', userId),
      supabaseAdmin.from('referrals').delete().eq('referred_id', userId),
      supabaseAdmin.from('spin_wheel').delete().eq('user_id', userId),
      supabaseAdmin.from('daily_login_bonus').delete().eq('user_id', userId),
      supabaseAdmin.from('weekly_login_rewards').delete().eq('user_id', userId),
      supabaseAdmin.from('ludo_transactions').delete().eq('user_id', userId),
      supabaseAdmin.from('ludo_match_players').delete().eq('user_id', userId),
      supabaseAdmin.from('ludo_matches').delete().eq('created_by', userId),
    ];

    await Promise.allSettled(deleteOperations);

    // Delete the profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to delete profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to delete profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete from auth.users using admin API
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Failed to delete auth user:', authError);
      // Profile was already deleted, so partial success
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'Profile deleted but auth user may remain',
          error: authError.message 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Delete user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});