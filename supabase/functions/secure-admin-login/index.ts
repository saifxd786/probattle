import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Prevent hanging requests (mobile networks / cold starts) by timing out outbound calls.
const REQUEST_TIMEOUT_MS = 10_000

const fetchWithTimeout: typeof fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    // If an upstream signal exists, respect it too.
    const upstreamSignal = (init as any)?.signal as AbortSignal | undefined
    const combinedSignal = (AbortSignal as any)?.any
      ? (AbortSignal as any).any([controller.signal, ...(upstreamSignal ? [upstreamSignal] : [])])
      : controller.signal

    return await fetch(input, { ...init, signal: combinedSignal })
  } finally {
    clearTimeout(timeoutId)
  }
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

  try {
    // Parse request
    const { phone, password }: LoginRequest = await req.json()

    // Input validation
    if (!phone || typeof phone !== 'string' || phone.length < 10 || phone.length > 15) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format', code: 'INVALID_INPUT' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
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

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: fetchWithTimeout },
    })
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      global: { fetch: fetchWithTimeout },
    })

    // Try login with profile email (legacy) and probattle.app domain
    let authData = null
    let authError = null

    const candidateEmails: string[] = []

    try {
      const { data: profileRow } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('phone', cleanPhone)
        .maybeSingle()

      const profileEmail = (profileRow as any)?.email
      if (profileEmail && typeof profileEmail === 'string' && profileEmail.includes('@')) {
        candidateEmails.push(profileEmail)
      }
    } catch {
      // ignore
    }

    // Use probattle.app domain
    candidateEmails.push(`${cleanPhone}@probattle.app`)

    // De-dupe while preserving order
    const seen = new Set<string>()
    const uniqueEmails = candidateEmails.filter((e) => {
      const key = e.trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

    for (const email of uniqueEmails) {
      const result = await supabase.auth.signInWithPassword({ email, password })

      if (!result.error && result.data.user) {
        authData = result.data
        break
      }
      authError = result.error
    }

    if (authError || !authData?.user) {
      const rawMsg = (authError as any)?.message ? String((authError as any).message) : 'unknown'
      console.log(`[secure-admin-login] Auth failed for phone ending ${cleanPhone.slice(-4)}`)

      const msg = rawMsg.toLowerCase()
      let code = 'AUTH_FAILED'
      let clientError = 'Invalid credentials'

      if (msg.includes('email not confirmed') || msg.includes('confirm') && msg.includes('email')) {
        code = 'EMAIL_NOT_CONFIRMED'
        clientError = 'Account verification pending. Please verify your account first.'
      }

      // Check if profile exists
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle()

        if (!profile) {
          code = 'ACCOUNT_NOT_FOUND'
          clientError = 'Account not found for this phone number.'
        }
      } catch {
        // ignore
      }

      return new Response(
        JSON.stringify({ error: clientError, code }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Parallel checks (faster on slow networks)
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
    const roleError = roleRes.error
    const profile = profileRes.data as any

    if (roleError || !roleData) {
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

    console.log(`[secure-admin-login] Admin ${authData.user.id} logged in successfully`)

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
    console.error('[secure-admin-login] Error:', errorMessage)

    const msg = String(errorMessage || '').toLowerCase()
    if (msg.includes('abort') || msg.includes('aborted') || msg.includes('timeout')) {
      return new Response(
        JSON.stringify({ error: 'Network timeout. Please try again.', code: 'TIMEOUT' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', code: 'SERVER_ERROR' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
