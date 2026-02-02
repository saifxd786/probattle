import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[TICKET-CLEANUP] Starting stale ticket cleanup...");

    // Find tickets older than 24 hours with NO admin replies
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get all open tickets created more than 24 hours ago
    const { data: oldTickets, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, created_at, subject")
      .eq("status", "open")
      .lt("created_at", twentyFourHoursAgo);

    if (ticketError) {
      console.error("[TICKET-CLEANUP] Error fetching tickets:", ticketError);
      throw ticketError;
    }

    console.log(`[TICKET-CLEANUP] Found ${oldTickets?.length || 0} tickets older than 24h`);

    if (!oldTickets || oldTickets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deleted_count: 0, message: "No stale tickets found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ticketsToDelete: string[] = [];

    // Check each ticket for admin replies
    for (const ticket of oldTickets) {
      const { data: messages, error: msgError } = await supabase
        .from("support_messages")
        .select("sender_type")
        .eq("ticket_id", ticket.id);

      if (msgError) {
        console.error(`[TICKET-CLEANUP] Error fetching messages for ticket ${ticket.id}:`, msgError);
        continue;
      }

      // Check if any message is from admin
      const hasAdminReply = messages?.some(msg => msg.sender_type === "admin");

      if (!hasAdminReply) {
        console.log(`[TICKET-CLEANUP] Ticket ${ticket.id} has no admin reply, marking for deletion`);
        ticketsToDelete.push(ticket.id);
      }
    }

    console.log(`[TICKET-CLEANUP] ${ticketsToDelete.length} tickets have no admin replies, deleting...`);

    if (ticketsToDelete.length > 0) {
      // Delete messages first (foreign key constraint)
      const { error: deleteMsgError } = await supabase
        .from("support_messages")
        .delete()
        .in("ticket_id", ticketsToDelete);

      if (deleteMsgError) {
        console.error("[TICKET-CLEANUP] Error deleting messages:", deleteMsgError);
        throw deleteMsgError;
      }

      // Delete tickets
      const { error: deleteTicketError } = await supabase
        .from("support_tickets")
        .delete()
        .in("id", ticketsToDelete);

      if (deleteTicketError) {
        console.error("[TICKET-CLEANUP] Error deleting tickets:", deleteTicketError);
        throw deleteTicketError;
      }

      console.log(`[TICKET-CLEANUP] Successfully deleted ${ticketsToDelete.length} stale tickets`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: ticketsToDelete.length,
        message: `Deleted ${ticketsToDelete.length} stale tickets with no admin replies after 24h`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[TICKET-CLEANUP] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
