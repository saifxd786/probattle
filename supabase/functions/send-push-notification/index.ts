import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIREBASE_SERVER_KEY = Deno.env.get("FIREBASE_SERVER_KEY");
    if (!FIREBASE_SERVER_KEY) {
      throw new Error("FIREBASE_SERVER_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: NotificationPayload = await req.json();
    const { user_id, user_ids, title, body, data } = payload;

    if (!title || !body) {
      throw new Error("Title and body are required");
    }

    // Get target user IDs
    const targetUserIds = user_ids || (user_id ? [user_id] : []);
    
    if (targetUserIds.length === 0) {
      throw new Error("No target users specified");
    }

    // Get FCM tokens for users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, push_token")
      .in("id", targetUserIds)
      .not("push_token", "is", null);

    if (profilesError) {
      throw new Error(`Failed to get profiles: ${profilesError.message}`);
    }

    const tokens = profiles
      ?.map((p) => p.push_token)
      .filter((t): t is string => !!t) || [];

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No FCM tokens found for users", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send FCM notification
    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          const response = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `key=${FIREBASE_SERVER_KEY}`,
            },
            body: JSON.stringify({
              to: token,
              notification: {
                title,
                body,
                sound: "default",
                click_action: "FLUTTER_NOTIFICATION_CLICK",
              },
              data: data || {},
              priority: "high",
            }),
          });

          const result = await response.json();
          return { token, success: response.ok, result };
        } catch (err) {
          return { token, success: false, error: err.message };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: tokens.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
