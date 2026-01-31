import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface LoginRequest {
  phone: string
  password: string
}

const normalizePhone = (raw: string) => {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length <= 10) return digits
  return digits.slice(-10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('[secure-admin-login] Request started')

  try {
    // Parse request
    const { phone, password }: LoginRequest = await req.json()

    // Input validation - quick exit for warmup calls
    if (!phone || phone === '0' || phone.length < 2) {
      console.log('[secure-admin-login] Warmup/invalid call - quick exit')
      return new Response(
        JSON.stringify({ error: 'Invalid phone', code: 'WARMUP' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!password || password.length < 4) {
      return new Response(
        JSON.stringify({ error: 'Invalid password format', code: 'INVALID_INPUT' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize + normalize phone
    const cleanPhone = normalizePhone(phone)

    if (cleanPhone.length !== 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format', code: 'INVALID_INPUT' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[secure-admin-login] Attempting login for phone ending ${cleanPhone.slice(-4)}`)

    // Create Supabase clients - NO custom fetch timeout (use default)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Build candidate emails - Primary domain first
    const primaryEmail = `${cleanPhone}@probattle.app`
    const candidateEmails = [primaryEmail]

    // Check if profile has different email (parallel with first auth attempt for speed)
    const profileEmailPromise = supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('phone', cleanPhone)
      .maybeSingle()

    // Try primary email first
    console.log(`[secure-admin-login] Trying primary email: ${primaryEmail}`)
    let authResult = await supabase.auth.signInWithPassword({ 
      email: primaryEmail, 
      password 
    })

    // If primary failed, check for legacy email
    if (authResult.error || !authResult.data?.user) {
      try {
        const { data: profileRow } = await profileEmailPromise
        const profileEmail = (profileRow as any)?.email

        if (profileEmail && typeof profileEmail === 'string' && 
            profileEmail.includes('@') && 
            profileEmail.toLowerCase() !== primaryEmail.toLowerCase()) {
          
          console.log(`[secure-admin-login] Trying legacy email: ${profileEmail}`)
          authResult = await supabase.auth.signInWithPassword({ 
            email: profileEmail, 
            password 
          })
        }
      } catch (e) {
        console.log('[secure-admin-login] Profile lookup failed:', e)
      }
    }

    if (authResult.error || !authResult.data?.user) {
      const rawMsg = authResult.error?.message || 'unknown'
      console.log(`[secure-admin-login] Auth failed: ${rawMsg}`)

      const msg = rawMsg.toLowerCase()
      let code = 'AUTH_FAILED'
      let clientError = 'Invalid phone number or password'

      if (msg.includes('email not confirmed') || (msg.includes('confirm') && msg.includes('email'))) {
        code = 'EMAIL_NOT_CONFIRMED'
        clientError = 'Account verification pending. Please verify your account first.'
      }

      // Quick check if account exists
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle()

        if (!profile) {
          code = 'ACCOUNT_NOT_FOUND'
          clientError = 'No account found for this phone number'
        }
      } catch {}

      console.log(`[secure-admin-login] Returning error: ${code} (${Date.now() - startTime}ms)`)
      return new Response(
        JSON.stringify({ error: clientError, code }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const authData = authResult.data
    console.log(`[secure-admin-login] Auth success, checking admin role...`)

    // Parallel checks for role + ban status
    const [roleRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'admin')
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('is_banned, ban_reason')
        .eq('id', authData.user.id)
        .maybeSingle(),
    ])

    const roleData = roleRes.data
    const profile = profileRes.data as any

    if (roleRes.error || !roleData) {
      console.log(`[secure-admin-login] Non-admin user ${authData.user.id} attempted admin login`)
      await supabase.auth.signOut()

      return new Response(
        JSON.stringify({ error: 'Access denied. Admin privileges required.', code: 'UNAUTHORIZED' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (profile?.is_banned) {
      await supabase.auth.signOut()
      console.log(`[secure-admin-login] Banned user attempted admin login: ${authData.user.id}`)
      return new Response(
        JSON.stringify({
          error: profile.ban_reason || 'Your account has been banned',
          code: 'ACCOUNT_BANNED',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[secure-admin-login] SUCCESS - Admin ${authData.user.id} logged in (${Date.now() - startTime}ms)`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        session: authData.session,
        user: {
          id: authData.user.id,
          email: authData.user.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[secure-admin-login] Error (${Date.now() - startTime}ms):`, errorMessage)

    return new Response(
      JSON.stringify({ error: 'Connection error. Please try again.', code: 'SERVER_ERROR' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
