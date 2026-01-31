import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// In-memory rate limiting store (per edge function instance)
const rateLimitStore = new Map<string, { attempts: number; firstAttempt: number; lockedUntil: number | null }>()

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,       // Max 5 attempts
  windowMs: 60000,      // Per minute
  lockoutMs: 900000,    // 15 minute lockout (stricter for admin)
  maxGlobalAttempts: 50, // Max 50 attempts globally per IP per hour
  globalWindowMs: 3600000,
}

interface LoginRequest {
  phone: string
  password: string
  deviceFingerprint?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get real IP address
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const cfConnectingIp = req.headers.get('cf-connecting-ip')
    const ipAddress = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown')
    
    console.log('[secure-admin-login] IP:', ipAddress)

    // Check rate limit for this IP
    const now = Date.now()
    const rateKey = `admin_login:${ipAddress}`
    const rateLimitData = rateLimitStore.get(rateKey)

    if (rateLimitData) {
      // Check if locked out
      if (rateLimitData.lockedUntil && now < rateLimitData.lockedUntil) {
        const remainingSeconds = Math.ceil((rateLimitData.lockedUntil - now) / 1000)
        console.log(`[secure-admin-login] IP ${ipAddress} is locked out for ${remainingSeconds}s`)
        return new Response(
          JSON.stringify({ 
            error: 'Too many failed attempts. Please try again later.',
            lockedFor: remainingSeconds,
            code: 'RATE_LIMITED'
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': String(remainingSeconds)
            } 
          }
        )
      }

      // Reset if window expired
      if (now - rateLimitData.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
        rateLimitData.attempts = 0
        rateLimitData.firstAttempt = now
        rateLimitData.lockedUntil = null
      }
    }

    // Parse request
    const { phone, password, deviceFingerprint }: LoginRequest = await req.json()

    // Input validation
    if (!phone || typeof phone !== 'string' || phone.length < 10 || phone.length > 15) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format', code: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return new Response(
        JSON.stringify({ error: 'Invalid password format', code: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize phone
    const cleanPhone = phone.replace(/\D/g, '')

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Try login with both email domains
    let authData = null
    let authError = null

    for (const domain of ['probattle.app', 'proscims.app']) {
      const email = `${cleanPhone}@${domain}`
      const result = await supabase.auth.signInWithPassword({ email, password })
      
      if (!result.error && result.data.user) {
        authData = result.data
        break
      }
      authError = result.error
    }

    // Record attempt regardless of success
    if (!rateLimitStore.has(rateKey)) {
      rateLimitStore.set(rateKey, { attempts: 1, firstAttempt: now, lockedUntil: null })
    } else {
      const data = rateLimitStore.get(rateKey)!
      data.attempts++
      
      // Check if should lock
      if (data.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
        data.lockedUntil = now + RATE_LIMIT_CONFIG.lockoutMs
        console.log(`[secure-admin-login] IP ${ipAddress} locked out after ${data.attempts} attempts`)
        
        // Log security event
        await supabaseAdmin.from('admin_audit_logs').insert({
          action_type: 'ADMIN_LOGIN_LOCKOUT',
          entity_type: 'security',
          details: {
            ip_address: ipAddress,
            attempts: data.attempts,
            phone_hash: cleanPhone.slice(-4), // Only last 4 digits
            device_fingerprint: deviceFingerprint
          }
        })
      }
    }

    if (authError || !authData?.user) {
      const rawMsg = (authError as any)?.message ? String((authError as any).message) : 'unknown'
      const rawStatus = (authError as any)?.status ? Number((authError as any).status) : undefined
      console.log(
        `[secure-admin-login] Auth failed for phone ending ${cleanPhone.slice(-4)} | status=${rawStatus ?? 'n/a'} | msg=${rawMsg}`,
      )

      // Heuristic mapping (keeps client UX clear without leaking sensitive details)
      const msg = rawMsg.toLowerCase()
      let code = 'AUTH_FAILED'
      let clientError = 'Invalid credentials'
      let httpStatus = 401

      if (msg.includes('email not confirmed') || msg.includes('confirm') && msg.includes('email')) {
        code = 'EMAIL_NOT_CONFIRMED'
        clientError = 'Account verification pending. Please verify your account first.'
        httpStatus = 403
      }

      // Helpful hint: check if profile exists for this phone (admin-only flow)
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle()

        if (!profile) {
          code = 'ACCOUNT_NOT_FOUND'
          clientError = 'Account not found for this phone number.'
          httpStatus = 404
        }
      } catch {
        // ignore
      }

      return new Response(
        JSON.stringify({ error: clientError, code }),
        { status: httpStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      console.log(`[secure-admin-login] Non-admin user ${authData.user.id} attempted admin login`)
      
      // Sign out the user
      await supabase.auth.signOut()
      
      // Log unauthorized access attempt
      await supabaseAdmin.from('admin_audit_logs').insert({
        action_type: 'UNAUTHORIZED_ADMIN_ACCESS',
        entity_type: 'security',
        user_id: authData.user.id,
        details: {
          ip_address: ipAddress,
          device_fingerprint: deviceFingerprint
        }
      })
      
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin privileges required.', code: 'UNAUTHORIZED' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if device is banned
    if (deviceFingerprint) {
      const { data: deviceBan } = await supabaseAdmin
        .from('device_bans')
        .select('id')
        .eq('device_fingerprint', deviceFingerprint)
        .maybeSingle()
      
      if (deviceBan) {
        await supabase.auth.signOut()
        console.log(`[secure-admin-login] Banned device attempted admin login: ${deviceFingerprint}`)
        return new Response(
          JSON.stringify({ error: 'Device is banned from admin access', code: 'DEVICE_BANNED' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Success - reset rate limit
    rateLimitStore.delete(rateKey)

    // Log successful admin login
    await supabaseAdmin.from('admin_audit_logs').insert({
      action_type: 'ADMIN_LOGIN_SUCCESS',
      entity_type: 'security',
      user_id: authData.user.id,
      details: {
        ip_address: ipAddress,
        device_fingerprint: deviceFingerprint
      }
    })

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
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', code: 'SERVER_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
