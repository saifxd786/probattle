import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeviceValidationRequest {
  device_id: string;
  platform: 'android' | 'ios' | 'web';
  device_model?: string;
  os_version?: string;
  app_version?: string;
  is_emulator?: boolean;
  is_rooted?: boolean;
  action: 'check' | 'register' | 'link';
  user_id?: string; // Only for 'link' action
}

interface DeviceValidationResponse {
  success: boolean;
  allowed: boolean;
  reason?: string;
  device_status?: {
    is_banned: boolean;
    is_flagged: boolean;
    account_count: number;
    can_create_account: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: DeviceValidationRequest = await req.json()
    
    const { 
      device_id, 
      platform, 
      device_model, 
      os_version, 
      app_version,
      is_emulator,
      is_rooted,
      action,
      user_id
    } = requestData

    // Validate required fields
    if (!device_id || !platform || !action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          allowed: false, 
          reason: 'Missing required fields' 
        } as DeviceValidationResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[validate-device] Request:', { device_id: device_id.substring(0, 16) + '...', platform, action })

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ACTION: CHECK - Just check if device is banned (pre-auth)
    if (action === 'check') {
      const { data: statusData, error: statusError } = await supabase
        .rpc('check_device_status', { p_device_id: device_id })
      
      if (statusError) {
        console.error('[validate-device] Status check error:', statusError)
        // If function fails, device might not exist - allow
        return new Response(
          JSON.stringify({ 
            success: true, 
            allowed: true,
            device_status: {
              is_banned: false,
              is_flagged: false,
              account_count: 0,
              can_create_account: true
            }
          } as DeviceValidationResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const status = statusData?.[0] || { 
        is_banned: false, 
        is_flagged: false, 
        account_count: 0, 
        max_accounts_reached: false 
      }

      // Check if banned
      if (status.is_banned) {
        console.log('[validate-device] Device is BANNED:', device_id.substring(0, 16))
        return new Response(
          JSON.stringify({ 
            success: true, 
            allowed: false,
            reason: 'ACCESS_DENIED', // Generic message - no reason leakage
            device_status: {
              is_banned: true,
              is_flagged: status.is_flagged,
              account_count: status.account_count,
              can_create_account: false
            }
          } as DeviceValidationResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check account limit
      if (status.max_accounts_reached) {
        console.log('[validate-device] Max accounts reached:', device_id.substring(0, 16))
        return new Response(
          JSON.stringify({ 
            success: true, 
            allowed: true, // Allow login, but not new signups
            reason: 'MAX_ACCOUNTS_REACHED',
            device_status: {
              is_banned: false,
              is_flagged: status.is_flagged,
              account_count: status.account_count,
              can_create_account: false
            }
          } as DeviceValidationResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          allowed: true,
          device_status: {
            is_banned: false,
            is_flagged: status.is_flagged,
            account_count: status.account_count,
            can_create_account: true
          }
        } as DeviceValidationResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ACTION: REGISTER - Register/update device in database
    if (action === 'register') {
      const { data: registerData, error: registerError } = await supabase
        .rpc('register_device', { 
          p_device_id: device_id,
          p_platform: platform,
          p_device_model: device_model || null,
          p_os_version: os_version || null,
          p_app_version: app_version || null,
          p_is_emulator: is_emulator || false,
          p_is_rooted: is_rooted || false
        })
      
      if (registerError) {
        console.error('[validate-device] Registration error:', registerError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            allowed: false, 
            reason: 'Registration failed' 
          } as DeviceValidationResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const result = registerData?.[0] || { 
        success: false, 
        device_banned: false, 
        account_count: 0, 
        can_create_account: true 
      }

      // Check if device was banned
      if (result.device_banned) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            allowed: false,
            reason: 'ACCESS_DENIED',
            device_status: {
              is_banned: true,
              is_flagged: false,
              account_count: result.account_count,
              can_create_account: false
            }
          } as DeviceValidationResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          allowed: result.can_create_account,
          reason: result.can_create_account ? undefined : 'MAX_ACCOUNTS_REACHED',
          device_status: {
            is_banned: false,
            is_flagged: false,
            account_count: result.account_count,
            can_create_account: result.can_create_account
          }
        } as DeviceValidationResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ACTION: LINK - Link user to device after successful signup/login
    if (action === 'link') {
      if (!user_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            allowed: false, 
            reason: 'User ID required for linking' 
          } as DeviceValidationResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // First ensure device is registered
      await supabase.rpc('register_device', { 
        p_device_id: device_id,
        p_platform: platform,
        p_device_model: device_model || null,
        p_os_version: os_version || null,
        p_app_version: app_version || null,
        p_is_emulator: is_emulator || false,
        p_is_rooted: is_rooted || false
      })

      // Link user to device
      const { data: linkData, error: linkError } = await supabase
        .rpc('link_user_to_device', { 
          p_user_id: user_id,
          p_device_id: device_id
        })
      
      if (linkError) {
        console.error('[validate-device] Link error:', linkError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            allowed: false, 
            reason: 'Linking failed' 
          } as DeviceValidationResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const result = linkData?.[0] || { success: false, error_message: 'Unknown error' }

      if (!result.success) {
        console.log('[validate-device] Link blocked:', result.error_message)
        return new Response(
          JSON.stringify({ 
            success: true, 
            allowed: false,
            reason: result.error_message === 'Maximum accounts reached for this device' 
              ? 'MAX_ACCOUNTS_REACHED' 
              : 'ACCESS_DENIED'
          } as DeviceValidationResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[validate-device] User linked to device:', { user_id, device_id: device_id.substring(0, 16) })
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          allowed: true
        } as DeviceValidationResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Unknown action
    return new Response(
      JSON.stringify({ 
        success: false, 
        allowed: false, 
        reason: 'Invalid action' 
      } as DeviceValidationResponse),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[validate-device] Error:', errorMessage)
    return new Response(
      JSON.stringify({ 
        success: false, 
        allowed: false, 
        reason: 'Server error' 
      } as DeviceValidationResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
