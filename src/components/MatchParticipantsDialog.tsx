import { useState, useEffect } from 'react';
import { Users, User, Gamepad2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

type Participant = {
  id: string;
  user_id: string;
  bgmi_ingame_name: string | null;
  team_name: string | null;
  bgmi_player_id: string | null;
};

interface MatchParticipantsDialogProps {
  matchId: string | null;
  matchTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const MatchParticipantsDialog = ({ matchId, matchTitle, isOpen, onClose }: MatchParticipantsDialogProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (matchId && isOpen) {
      fetchParticipants();
    }
  }, [matchId, isOpen]);

  const fetchParticipants = async () => {
    if (!matchId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('match_registrations')
      .select('id, user_id, bgmi_ingame_name, team_name, bgmi_player_id')
      .eq('match_id', matchId)
      .eq('is_approved', true);

    if (!error && data) {
      setParticipants(data);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Opponents - {matchTitle}
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
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-primary" />
                      {participant.bgmi_ingame_name || 'Unknown Player'}
                    </p>
                    {participant.bgmi_player_id && (
                      <p className="text-xs text-muted-foreground">
                        ID: {participant.bgmi_player_id}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Total: {participants.length} player{participants.length !== 1 ? 's' : ''} registered
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchParticipantsDialog;
