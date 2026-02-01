import { useState, useEffect } from 'react';
import { Users, Gamepad2, UserX, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Participant = {
  id: string;
  user_id: string;
  bgmi_ingame_name: string | null;
  team_name: string | null;
  bgmi_player_id: string | null;
  avatar_url?: string | null;
  username?: string | null;
};

interface AdminMatchParticipantsDialogProps {
  matchId: string | null;
  matchTitle: string;
  entryFee: number;
  matchStatus?: string;
  isOpen: boolean;
  onClose: () => void;
  onParticipantKicked?: () => void;
  onMatchCancelled?: () => void;
}

const AdminMatchParticipantsDialog = ({ 
  matchId, 
  matchTitle, 
  entryFee,
  matchStatus,
  isOpen, 
  onClose,
  onParticipantKicked,
  onMatchCancelled
}: AdminMatchParticipantsDialogProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (matchId && isOpen) {
      fetchParticipants();
    }
  }, [matchId, isOpen]);

  const fetchParticipants = async () => {
    if (!matchId) return;
    
    setIsLoading(true);
    
    // Fetch registrations
    const { data: registrations, error } = await supabase
      .from('match_registrations')
      .select('id, user_id, bgmi_ingame_name, team_name, bgmi_player_id')
      .eq('match_id', matchId)
      .eq('is_approved', true);

    if (!error && registrations) {
      // Fetch avatar_url and username for each participant from profiles
      const userIds = registrations.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, username')
        .in('id', userIds);
      
      // Merge profile data with participants
      const participantsWithProfiles = registrations.map(reg => ({
        ...reg,
        avatar_url: profiles?.find(p => p.id === reg.user_id)?.avatar_url || null,
        username: profiles?.find(p => p.id === reg.user_id)?.username || null
      }));
      
      setParticipants(participantsWithProfiles);
    }
    setIsLoading(false);
  };

  const handleKickPlayer = async (participant: Participant) => {
    if (!matchId) return;
    
    const confirmKick = confirm(
      `Are you sure you want to kick "${participant.bgmi_ingame_name || participant.username || 'this player'}"?\n\nThis will:\n- Remove their registration\n- Refund ₹${entryFee} to their wallet\n- Send them a notification`
    );
    
    if (!confirmKick) return;
    
    setKickingUserId(participant.user_id);
    
    try {
      // 1. Delete registration
      const { error: deleteError } = await supabase
        .from('match_registrations')
        .delete()
        .eq('id', participant.id);
      
      if (deleteError) throw deleteError;
      
      // 2. Update filled_slots in matches table
      const { error: updateMatchError } = await supabase
        .from('matches')
        .update({ filled_slots: participants.length - 1 })
        .eq('id', matchId);
      
      if (updateMatchError) {
        console.error('Failed to update filled_slots:', updateMatchError);
      }
      
      // 3. Refund entry fee to wallet
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', participant.user_id)
        .single();
      
      if (profileError) throw profileError;
      
      const currentBalance = Number(profile.wallet_balance || 0);
      const newBalance = currentBalance + entryFee;
      
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', participant.user_id);
      
      if (walletError) throw walletError;
      
      // 4. Create refund transaction record
      await supabase.from('transactions').insert([{
        user_id: participant.user_id,
        type: 'admin_credit' as const,
        amount: entryFee,
        status: 'completed' as const,
        description: `Refund: Kicked from match "${matchTitle}"`
      }]);
      
      // 5. Send notification to user
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: participant.user_id,
          title: '❌ Match Entry Removed',
          message: `Your entry for "${matchTitle}" has been removed by admin. ₹${entryFee} has been refunded to your wallet.`,
          type: 'warning'
        });
      
      if (notifError) {
        console.error('Failed to send notification:', notifError);
      }
      
      // Update local state
      setParticipants(prev => prev.filter(p => p.id !== participant.id));
      
      toast({
        title: 'Player Kicked',
        description: `${participant.bgmi_ingame_name || 'Player'} removed and ₹${entryFee} refunded`,
      });
      
      // Notify parent to refresh match data
      onParticipantKicked?.();
      
    } catch (error: any) {
      console.error('Kick error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to kick player',
        variant: 'destructive'
      });
    } finally {
      setKickingUserId(null);
    }
  };

  // Cancel match and refund all players
  const handleCancelMatchAndRefundAll = async () => {
    if (!matchId) return;
    
    setIsCancelling(true);
    
    try {
      const totalRefund = participants.length * entryFee;
      
      // 1. Refund all participants
      for (const participant of participants) {
        // Get current balance
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', participant.user_id)
          .single();
        
        if (profileError) {
          console.error('Failed to fetch profile for:', participant.user_id);
          continue;
        }
        
        const currentBalance = Number(profile.wallet_balance || 0);
        const newBalance = currentBalance + entryFee;
        
        // Update wallet
        await supabase
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', participant.user_id);
        
        // Create refund transaction
        await supabase.from('transactions').insert([{
          user_id: participant.user_id,
          type: 'admin_credit' as const,
          amount: entryFee,
          status: 'completed' as const,
          description: `Match Cancelled: Refund for "${matchTitle}"`
        }]);
        
        // Send notification
        await supabase.from('notifications').insert({
          user_id: participant.user_id,
          title: '🚫 Match Cancelled',
          message: `"${matchTitle}" has been cancelled. ₹${entryFee} has been refunded to your wallet.`,
          type: 'warning'
        });
      }
      
      // 2. Delete all registrations
      const { error: deleteError } = await supabase
        .from('match_registrations')
        .delete()
        .eq('match_id', matchId);
      
      if (deleteError) {
        console.error('Failed to delete registrations:', deleteError);
      }
      
      // 3. Update match status to cancelled
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'cancelled', filled_slots: 0 })
        .eq('id', matchId);
      
      if (matchError) throw matchError;
      
      toast({
        title: 'Match Cancelled',
        description: `${participants.length} players refunded ₹${totalRefund} total`,
      });
      
      setIsCancelDialogOpen(false);
      onClose();
      onMatchCancelled?.();
      
    } catch (error: any) {
      console.error('Cancel match error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel match',
        variant: 'destructive'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Get initials from name
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  };

  const canCancelMatch = matchStatus === 'upcoming' || matchStatus === 'live';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Manage Players - {matchTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading participants...</div>
          ) : participants.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No participants yet
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div 
                  key={participant.id} 
                  className="flex items-center gap-3 p-3 glass-card hover:border-primary/30 transition-colors"
                >
                  {/* Slot Number */}
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {index + 1}
                  </div>
                  
                  {/* User Avatar */}
                  <Avatar className="w-9 h-9 border-2 border-primary/30">
                    <AvatarImage src={participant.avatar_url || undefined} alt={participant.bgmi_ingame_name || 'Player'} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {getInitials(participant.bgmi_ingame_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-primary shrink-0" />
                      {participant.bgmi_ingame_name || 'Unknown Player'}
                    </p>
                    {participant.username && (
                      <p className="text-xs text-muted-foreground truncate">@{participant.username}</p>
                    )}
                  </div>
                  
                  {/* Kick Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleKickPlayer(participant)}
                    disabled={kickingUserId === participant.user_id}
                    title="Kick player (refund & remove)"
                  >
                    {kickingUserId === participant.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserX className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer with Cancel Match button */}
        <div className="pt-3 border-t border-border space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{participants.length} player{participants.length !== 1 ? 's' : ''} registered</span>
            <span>Kick refunds ₹{entryFee}</span>
          </div>
          
          {/* Cancel Match & Refund All Button */}
          {canCancelMatch && participants.length > 0 && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setIsCancelDialogOpen(true)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Match & Refund All (₹{participants.length * entryFee})
            </Button>
          )}
          
          {matchStatus === 'cancelled' && (
            <p className="text-xs text-center text-destructive">
              This match has been cancelled
            </p>
          )}
        </div>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Cancel Match & Refund All?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to cancel <strong>"{matchTitle}"</strong></p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                <p className="text-sm">This action will:</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li>Cancel the match permanently</li>
                  <li>Refund <strong>₹{entryFee}</strong> to each of <strong>{participants.length}</strong> players</li>
                  <li>Total refund: <strong>₹{participants.length * entryFee}</strong></li>
                  <li>Notify all players about cancellation</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Match</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelMatchAndRefundAll}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel & Refund All
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default AdminMatchParticipantsDialog;
