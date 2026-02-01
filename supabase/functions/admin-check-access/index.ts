import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeadersFor = (req: Request) => {
  const origin = req.headers.get('origin')

  // For credentialed requests, wildcard origin is not allowed. Reflect the request origin.
  // If origin is missing (non-browser calls), fall back to '*'.
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, Authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Credentials': 'true',
  }
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('authorization') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      console.log('[admin-check-access] Unauthorized request')
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userId = userData.user.id

    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('[admin-check-access] Role check error:', roleError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify role', code: 'ROLE_CHECK_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const isAdmin = Boolean(roleRow)

    return new Response(
      JSON.stringify({ isAdmin }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[admin-check-access] Error:', errorMessage)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', code: 'SERVER_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
