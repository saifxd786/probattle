import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[daily-scan] Starting multi-account detection scan...')
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Run the detection function
    const { data: scanResult, error: scanError } = await supabaseAdmin.rpc('detect_multi_accounts')
    
    if (scanError) {
      console.error('[daily-scan] Scan error:', scanError)
      return new Response(
        JSON.stringify({ success: false, error: scanError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[daily-scan] Scan result:', scanResult)

    // Get count of new critical/high alerts from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: newAlerts, error: alertsError } = await supabaseAdmin
      .from('multi_account_alerts')
      .select('id, alert_type, severity, user_count')
      .gte('created_at', today.toISOString())
      .eq('is_resolved', false)
      .in('severity', ['critical', 'high'])

    const alertsSummary = {
      total: newAlerts?.length || 0,
      critical: newAlerts?.filter(a => a.severity === 'critical').length || 0,
      high: newAlerts?.filter(a => a.severity === 'high').length || 0,
      byType: {
        ip_match: newAlerts?.filter(a => a.alert_type === 'ip_match').length || 0,
        device_match: newAlerts?.filter(a => a.alert_type === 'device_match').length || 0,
        upi_match: newAlerts?.filter(a => a.alert_type === 'upi_match').length || 0,
      }
    }

    console.log('[daily-scan] Alerts summary:', alertsSummary)

    // Log the scan to a metadata table or just return
    // Store last scan time in a simple way - update or insert into a settings-like approach
    // For now, we'll use the existing pattern and just return results

    const response = {
      success: true,
      scan_time: new Date().toISOString(),
      alerts_created: scanResult?.alerts_created || 0,
      summary: alertsSummary
    }

    console.log('[daily-scan] Scan completed successfully:', response)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[daily-scan] Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
