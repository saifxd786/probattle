import { useState, useEffect } from 'react';
import { Trophy, Medal, Skull, User, Gamepad2, Award, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type Match = {
  id: string;
  title: string;
  match_type: string;
  prize_pool: number;
  prize_per_kill: number;
  first_place_prize: number;
  second_place_prize?: number;
  third_place_prize?: number;
};

type Registration = {
  id: string;
  user_id: string;
  bgmi_ingame_name: string | null;
  bgmi_player_id: string | null;
  team_name: string | null;
};

type ResultEntry = {
  registration_id: string;
  user_id: string;
  player_name: string;
  player_id: string;
  position: number | null;
  kills: number;
  prize_amount: number;
  is_winner: boolean;
  result_status: 'pending' | 'win' | 'lose';
};

interface MatchResultsDialogProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onResultsDeclared: () => void;
}

const MatchResultsDialog = ({ match, isOpen, onClose, onResultsDeclared }: MatchResultsDialogProps) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isClassicMatch = match?.match_type === 'classic';
  const isTDMMatch = match?.match_type?.startsWith('tdm');

  useEffect(() => {
    if (match && isOpen) {
      fetchRegistrations();
    }
  }, [match, isOpen]);

  const fetchRegistrations = async () => {
    if (!match) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('match_registrations')
      .select('id, user_id, bgmi_ingame_name, bgmi_player_id, team_name')
      .eq('match_id', match.id)
      .eq('is_approved', true);

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch registrations', variant: 'destructive' });
    } else if (data) {
      setRegistrations(data);
      // Initialize results for each registration - using only in-game name
      setResults(data.map((reg) => ({
        registration_id: reg.id,
        user_id: reg.user_id,
        player_name: reg.bgmi_ingame_name || 'Unknown Player',
        player_id: reg.bgmi_player_id || '',
        position: null,
        kills: 0,
        prize_amount: 0,
        is_winner: false,
        result_status: 'pending' as const
      })));
    }
    setIsLoading(false);
  };

  const updateResult = (regId: string, field: keyof ResultEntry, value: any) => {
    setResults(prev => prev.map(r => {
      if (r.registration_id === regId) {
        const updated = { ...r, [field]: value };
        
        // Auto-calculate prize based on position, kills, and win status
        if (match) {
          let prize = 0;
          
          // For TDM matches - winner gets first place prize
          if (isTDMMatch && updated.result_status === 'win') {
            prize = match.first_place_prize || 0;
            updated.is_winner = true;
            updated.position = 1;
          } else if (isTDMMatch && updated.result_status === 'lose') {
            updated.is_winner = false;
            updated.position = null;
          }
          
          // For Classic matches - position-based prizes
          if (isClassicMatch) {
            if (updated.position === 1) {
              prize += match.first_place_prize || 0;
              updated.is_winner = true;
            } else if (updated.position === 2) {
              prize += (match as any).second_place_prize || 0;
            } else if (updated.position === 3) {
              prize += (match as any).third_place_prize || 0;
            }
          }
          
          // Per-kill prize (for all match types)
          if (match.prize_per_kill && updated.kills > 0) {
            prize += match.prize_per_kill * updated.kills;
          }
          
          updated.prize_amount = prize;
        }
        
        return updated;
      }
      return r;
    }));
  };

  const handleDeclareResults = async () => {
    if (!match) return;
    
    setIsSaving(true);
    
    try {
      // Filter results that have been marked
      const resultsToSave = results.filter(r => 
        r.prize_amount > 0 || r.position || r.result_status !== 'pending'
      );
      
      if (resultsToSave.length === 0) {
        toast({ title: 'Error', description: 'Please set at least one result', variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      // Insert results
      const { error: resultsError } = await supabase
        .from('match_results')
        .insert(
          resultsToSave.map(r => ({
            match_id: match.id,
            user_id: r.user_id,
            registration_id: r.registration_id,
            position: r.position,
            kills: r.kills,
            prize_amount: r.prize_amount,
            is_winner: r.is_winner
          }))
        );

      if (resultsError) throw resultsError;

      // Add prize money to winners' wallets and send notifications
      for (const result of resultsToSave) {
        if (result.prize_amount > 0) {
          // Get current wallet balance
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', result.user_id)
            .single();

          if (profile) {
            // Update wallet balance
            await supabase
              .from('profiles')
              .update({ wallet_balance: (profile.wallet_balance || 0) + result.prize_amount })
              .eq('id', result.user_id);
          }

          // Create transaction record
          await supabase.from('transactions').insert([{
            user_id: result.user_id,
            amount: result.prize_amount,
            type: 'prize' as const,
            status: 'completed' as const,
            description: `🏆 Prize for "${match.title}" - ${result.is_winner ? 'Winner' : `Position: ${result.position || 'N/A'}`}, Kills: ${result.kills}`
          }]);

          // Send notification
          await supabase.from('notifications').insert({
            user_id: result.user_id,
            title: result.is_winner ? '🏆 Congratulations! You Won!' : '💰 Match Rewards',
            message: `You earned ₹${result.prize_amount} from "${match.title}". ${result.position ? `Position: #${result.position}` : ''} ${result.kills > 0 ? `Kills: ${result.kills}` : ''}`,
            type: 'success'
          });
        }
      }

      // Send notifications to losers in TDM
      if (isTDMMatch) {
        const losers = results.filter(r => r.result_status === 'lose');
        for (const loser of losers) {
          await supabase.from('notifications').insert({
            user_id: loser.user_id,
            title: '😔 Match Result',
            message: `You lost in "${match.title}". Better luck next time!`,
            type: 'info'
          });
        }
      }

      // Update match status to completed
      await supabase
        .from('matches')
        .update({ status: 'completed' })
        .eq('id', match.id);

      // Notify all participants about results (those without specific results)
      const unmarkedParticipants = results.filter(r => r.prize_amount === 0 && r.result_status === 'pending');
      for (const participant of unmarkedParticipants) {
        await supabase.from('notifications').insert({
          user_id: participant.user_id,
          title: '📊 Match Results Declared',
          message: `Results for "${match.title}" have been declared.`,
          type: 'info'
        });
      }

      toast({ title: 'Success', description: 'Results declared and prizes distributed!' });
      onResultsDeclared();
      onClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Declare Results - {match?.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading players...</div>
          ) : registrations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No approved registrations found</div>
          ) : (
            <div className="space-y-4">
              {/* Prize Info */}
              <div className="glass-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Prize Pool:</span>
                  <p className="font-bold text-primary">₹{match?.prize_pool}</p>
                </div>
                {isClassicMatch && (
                  <>
                    <div>
                      <span className="text-muted-foreground">1st Place:</span>
                      <p className="font-bold text-yellow-500">₹{match?.first_place_prize || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">2nd Place:</span>
                      <p className="font-bold text-gray-400">₹{(match as any)?.second_place_prize || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">3rd Place:</span>
                      <p className="font-bold text-orange-400">₹{(match as any)?.third_place_prize || 0}</p>
                    </div>
                  </>
                )}
                {isTDMMatch && (
                  <div>
                    <span className="text-muted-foreground">Winner Prize:</span>
                    <p className="font-bold text-yellow-500">₹{match?.first_place_prize || 0}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Per Kill:</span>
                  <p className="font-bold text-red-500">₹{match?.prize_per_kill || 0}</p>
                </div>
              </div>

              {/* Match ID */}
              <div className="text-xs text-muted-foreground text-center">
                Match ID: <span className="font-mono text-primary">{match?.id.slice(0, 8).toUpperCase()}</span>
              </div>

              {/* Player Results */}
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <div 
                    key={result.registration_id} 
                    className={cn(
                      "glass-card p-4 transition-colors",
                      result.result_status === 'win' && "border-green-500/50 bg-green-500/5",
                      result.result_status === 'lose' && "border-red-500/50 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Gamepad2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{result.player_name}</p>
                        {result.player_id && (
                          <p className="text-xs text-muted-foreground">ID: {result.player_id}</p>
                        )}
                      </div>
                      {result.prize_amount > 0 && (
                        <span className="text-primary font-bold">₹{result.prize_amount}</span>
                      )}
                      {result.result_status === 'win' && (
                        <span className="flex items-center gap-1 text-green-500 text-xs">
                          <Award className="w-4 h-4" /> Winner
                        </span>
                      )}
                      {result.result_status === 'lose' && (
                        <span className="flex items-center gap-1 text-red-500 text-xs">
                          <XCircle className="w-4 h-4" /> Lost
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* TDM Win/Lose Selection */}
                      {isTDMMatch && (
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Result
                          </Label>
                          <Select
                            value={result.result_status}
                            onValueChange={(v) => updateResult(result.registration_id, 'result_status', v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select result" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Not Set</SelectItem>
                              <SelectItem value="win">🏆 Winner</SelectItem>
                              <SelectItem value="lose">❌ Lost</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Classic Position Selection */}
                      {isClassicMatch && (
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <Medal className="w-3 h-3" /> Position
                          </Label>
                          <Select
                            value={result.position?.toString() || ''}
                            onValueChange={(v) => updateResult(result.registration_id, 'position', v ? parseInt(v) : null)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              <SelectItem value="1">🥇 1st Place</SelectItem>
                              <SelectItem value="2">🥈 2nd Place</SelectItem>
                              <SelectItem value="3">🥉 3rd Place</SelectItem>
                              {[...Array(17)].map((_, i) => (
                                <SelectItem key={i + 4} value={(i + 4).toString()}>
                                  #{i + 4}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Kills Input */}
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <Skull className="w-3 h-3" /> Kills
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={result.kills}
                          onChange={(e) => updateResult(result.registration_id, 'kills', parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="neon" 
            onClick={handleDeclareResults} 
            disabled={isSaving || registrations.length === 0}
          >
            {isSaving ? 'Processing...' : 'Declare Results & Distribute Prizes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchResultsDialog;
