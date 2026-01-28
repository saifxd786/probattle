import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminResetPasswordRequest {
  userId: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { userId, newPassword }: AdminResetPasswordRequest = await req.json();

    console.log(`Admin ${requestingUser.id} resetting password for user: ${userId}`);

    // Validate inputs
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify target user exists
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, security_question")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !targetProfile) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Password successfully reset for user: ${userId} by admin: ${requestingUser.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset successfully",
        username: targetProfile.username
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Admin reset password error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
