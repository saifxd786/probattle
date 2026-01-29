import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get real IP address from various headers
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const cfConnectingIp = req.headers.get('cf-connecting-ip')
    
    // Priority: CF > X-Real-IP > X-Forwarded-For (first IP)
    let ipAddress = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null)
    
    console.log('[log-session] IP detection:', { forwardedFor, realIp, cfConnectingIp, resolved: ipAddress })

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { device_fingerprint, user_agent, device_name } = await req.json()

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('[log-session] Auth error:', userError)
      return new Response(
        JSON.stringify({ success: false, message: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[log-session] Logging session for user:', user.id, 'IP:', ipAddress)

    // Insert session log using service role for direct insert
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: insertError } = await supabaseAdmin
      .from('user_login_sessions')
      .insert({
        user_id: user.id,
        ip_address: ipAddress,
        device_fingerprint,
        user_agent,
        device_name
      })

    if (insertError) {
      console.error('[log-session] Insert error:', insertError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to log session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update profile with device fingerprint
    if (device_fingerprint) {
      await supabaseAdmin
        .from('profiles')
        .update({ device_fingerprint })
        .eq('id', user.id)
    }

    console.log('[log-session] Session logged successfully')

    return new Response(
      JSON.stringify({ success: true, ip_captured: !!ipAddress }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[log-session] Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
