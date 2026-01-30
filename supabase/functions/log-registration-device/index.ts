import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface GeoData {
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
}

// Get geolocation data from IP address
async function getGeoLocation(ip: string): Promise<GeoData | null> {
  try {
    // Skip private/invalid IPs
    if (!ip || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.') || 
        ip === '127.0.0.1' || ip === 'localhost') {
      return null;
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as`);
    
    if (!response.ok) {
      console.error('[log-registration-device] Geo API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        region: data.region,
        regionName: data.regionName,
        city: data.city,
        zip: data.zip,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org,
        as: data.as
      };
    }
    
    return null;
  } catch (error) {
    console.error('[log-registration-device] Geo lookup failed:', error);
    return null;
  }
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
    
    console.log('[log-registration-device] IP detection:', { forwardedFor, realIp, cfConnectingIp, resolved: ipAddress })

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body with extended device info
    const { 
      device_fingerprint, 
      user_agent, 
      device_name,
      is_registration,
      // Extended device info
      screen_resolution,
      color_depth,
      platform,
      hardware_concurrency,
      device_memory,
      touch_support,
      webgl_renderer,
      language
    } = await req.json()

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
      console.error('[log-registration-device] Auth error:', userError)
      return new Response(
        JSON.stringify({ success: false, message: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[log-registration-device] Logging device for user:', user.id, 'IP:', ipAddress, 'Registration:', is_registration)

    // Get geolocation data
    let geoData: GeoData | null = null;
    if (ipAddress) {
      geoData = await getGeoLocation(ipAddress);
      console.log('[log-registration-device] Geolocation:', geoData?.city, geoData?.country);
    }

    // Insert session log using service role for direct insert
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const sessionData = {
      user_id: user.id,
      ip_address: ipAddress,
      device_fingerprint,
      user_agent,
      device_name,
      is_registration: is_registration || false,
      // Device details
      screen_resolution,
      color_depth,
      platform,
      hardware_concurrency,
      device_memory,
      touch_support,
      webgl_renderer,
      language,
      // Geolocation
      country: geoData?.country || null,
      country_code: geoData?.countryCode || null,
      region: geoData?.regionName || null,
      city: geoData?.city || null,
      isp: geoData?.isp || null,
      timezone: geoData?.timezone || null,
      latitude: geoData?.lat || null,
      longitude: geoData?.lon || null,
    };

    const { error: insertError } = await supabaseAdmin
      .from('user_login_sessions')
      .insert(sessionData)

    if (insertError) {
      console.error('[log-registration-device] Insert error:', insertError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to log device' }),
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

    console.log('[log-registration-device] Device logged successfully:', {
      user_id: user.id,
      ip: ipAddress,
      country: geoData?.country,
      city: geoData?.city,
      is_registration
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        ip_captured: !!ipAddress,
        geo_captured: !!geoData,
        location: geoData ? `${geoData.city}, ${geoData.country}` : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[log-registration-device] Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
