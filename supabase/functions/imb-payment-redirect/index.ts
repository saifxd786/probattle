import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This function handles the redirect from IMB gateway after payment
// It redirects the user back to the app with payment status

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get('order_id') || '';
  const status = url.searchParams.get('status') || '';
  
  // Determine redirect URL based on environment
  // In production, this would be your app's domain
  const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://probattle.lovable.app';
  
  // Initialize Supabase admin
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Payment redirect received:', { orderId, status });

  // If we have status info from the redirect, we can use it for immediate feedback
  // But the actual wallet credit happens via webhook, not here
  let redirectPath = '/wallet';
  let message = '';

  if (orderId) {
    // Get payment info for the redirect
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('status, amount')
      .eq('order_id', orderId)
      .single();

    if (payment) {
      if (payment.status === 'SUCCESS') {
        message = `Payment of ₹${payment.amount} successful!`;
        redirectPath = `/wallet?deposit=success&amount=${payment.amount}`;
      } else if (payment.status === 'FAILED') {
        message = 'Payment failed. Please try again.';
        redirectPath = '/wallet?deposit=failed';
      } else {
        // Still pending - redirect with pending status
        message = 'Payment is being processed...';
        redirectPath = `/wallet?deposit=pending&order_id=${orderId}`;
      }
    }
  }

  // If status indicates failure from gateway side
  if (status && ['failed', 'failure', 'cancelled', 'cancel'].includes(status.toLowerCase())) {
    redirectPath = '/wallet?deposit=failed';
  }

  // Create an HTML page that redirects and shows a brief message
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Processing - ProBattle</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0A0A0F 0%, #1a1a2e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.05);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      max-width: 400px;
      margin: 20px;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #10b981;
    }
    p {
      color: rgba(255,255,255,0.7);
      margin-bottom: 20px;
    }
    .redirect-text {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>Processing Payment</h1>
    <p>${message || 'Redirecting you back to ProBattle...'}</p>
    <p class="redirect-text">If not redirected automatically, <a href="${appBaseUrl}${redirectPath}" style="color: #10b981;">click here</a></p>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "${appBaseUrl}${redirectPath}";
    }, 1500);
  </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
});
