import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResetPasswordRequest {
  phone: string;
  newPassword?: string;
  securityAnswer?: string;
  action?: "get_question" | "verify" | "reset";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<ResetPasswordRequest>;
    const cleanPhone = (body.phone ?? "").toString().replace(/\D/g, "");
    const action: ResetPasswordRequest["action"] =
      body.action ?? (body.newPassword ? "reset" : "get_question");

    console.log(`reset-password: action=${action} phone=${cleanPhone}`);

    // Validate inputs
    if (!cleanPhone || cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (action === "get_question") {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("security_question, security_answer")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ success: true, exists: false, securityQuestion: null, hasSecurityQuestion: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const hasSecurityQuestion = Boolean(profile.security_question && profile.security_answer);

      return new Response(
        JSON.stringify({
          success: true,
          exists: true,
          securityQuestion: profile.security_question ?? null,
          hasSecurityQuestion,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // verify / reset require security answer
    const securityAnswer = (body.securityAnswer ?? "").toString();
    if (!securityAnswer.trim()) {
      return new Response(
        JSON.stringify({ error: "Security answer is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch profile with security answer (needed for both verify and reset)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, security_answer")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedStored = (profile.security_answer ?? "").toLowerCase().trim();
    const normalizedInput = securityAnswer.toLowerCase().trim();

    if (!normalizedStored || normalizedStored !== normalizedInput) {
      return new Response(
        JSON.stringify({ error: "Incorrect security answer" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "verify") {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // action === "reset"
    const newPassword = (body.newPassword ?? "").toString();
    if (!newPassword || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Password successfully reset for user: ${profile.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Reset password error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
