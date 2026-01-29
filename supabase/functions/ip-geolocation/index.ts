import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeoData {
  ip: string;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ip_addresses } = await req.json()
    
    if (!ip_addresses || !Array.isArray(ip_addresses)) {
      return new Response(
        JSON.stringify({ error: 'ip_addresses array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter out private/invalid IPs
    const validIps = ip_addresses.filter((ip: string) => {
      if (!ip) return false
      // Skip private IPs
      if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) return false
      if (ip === '127.0.0.1' || ip === 'localhost') return false
      return true
    })

    console.log('[ip-geolocation] Looking up', validIps.length, 'IPs')

    // Use ip-api.com batch endpoint (free, no API key needed, 45 requests/minute)
    // Batch API accepts up to 100 IPs at once
    const batchSize = 100
    const results: Record<string, GeoData | null> = {}

    for (let i = 0; i < validIps.length; i += batchSize) {
      const batch = validIps.slice(i, i + batchSize)
      
      const response = await fetch('http://ip-api.com/batch?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      })

      if (!response.ok) {
        console.error('[ip-geolocation] API error:', response.status)
        continue
      }

      const batchResults = await response.json()
      
      for (const result of batchResults) {
        if (result.status === 'success') {
          results[result.query] = {
            ip: result.query,
            country: result.country,
            countryCode: result.countryCode,
            region: result.region,
            regionName: result.regionName,
            city: result.city,
            zip: result.zip,
            lat: result.lat,
            lon: result.lon,
            timezone: result.timezone,
            isp: result.isp,
            org: result.org,
            as: result.as
          }
        } else {
          results[result.query] = null
        }
      }
    }

    // Add null for IPs that were filtered out
    for (const ip of ip_addresses) {
      if (!(ip in results)) {
        results[ip] = null
      }
    }

    console.log('[ip-geolocation] Resolved', Object.keys(results).length, 'IPs')

    return new Response(
      JSON.stringify({ success: true, locations: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ip-geolocation] Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
