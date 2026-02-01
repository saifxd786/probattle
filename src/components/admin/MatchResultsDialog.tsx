import { useState, useEffect } from 'react';
import { Trophy, Medal, Skull, Gamepad2, Award, XCircle, Edit, Users, RotateCcw, Handshake } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  avatar_url?: string | null;
};

type ResultEntry = {
  registration_id: string;
  user_id: string;
  player_name: string;
  player_id: string;
  avatar_url: string | null;
  position: number | null;
  kills: number;
  prize_amount: number;
  is_winner: boolean;
  result_status: 'pending' | 'win' | 'lose' | 'tie';
  original_prize: number;
  existing_result_id: string | null;
};

type ExistingResult = {
  id: string;
  user_id: string;
  registration_id: string | null;
  position: number | null;
  kills: number;
  prize_amount: number;
  is_winner: boolean;
};

interface MatchResultsDialogProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onResultsDeclared: () => void;
  isEditMode?: boolean;
}

const MatchResultsDialog = ({ match, isOpen, onClose, onResultsDeclared, isEditMode = false }: MatchResultsDialogProps) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [existingResults, setExistingResults] = useState<ExistingResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkKills, setBulkKills] = useState<number>(0);

  const isClassicMatch = match?.match_type === 'classic';
  const isTDMMatch = match?.match_type?.startsWith('tdm');
  
  // For TDM matches, use prize_pool as winner prize if first_place_prize is not set
  const effectiveWinnerPrize = match ? (match.first_place_prize || (isTDMMatch ? match.prize_pool : 0)) : 0;

  useEffect(() => {
    if (match && isOpen) {
      fetchRegistrations();
      if (isEditMode) {
        fetchExistingResults();
      } else {
        setExistingResults([]);
      }
    }
  }, [match, isOpen, isEditMode]);

  const fetchExistingResults = async () => {
    if (!match) return;
    
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', match.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch existing results', variant: 'destructive' });
    } else if (data) {
      setExistingResults(data);
    }
  };

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
    } else if (data && data.length > 0) {
      // Fetch avatars from profiles
      const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', userIds);
      
      const avatarMap = new Map(profiles?.map(p => [p.id, p.avatar_url]) || []);
      
      const registrationsWithAvatars = data.map(reg => ({
        ...reg,
        avatar_url: avatarMap.get(reg.user_id) || null
      }));
      
      setRegistrations(registrationsWithAvatars);
    }
    setIsLoading(false);
  };

  // Update results when both registrations and existing results are loaded
  useEffect(() => {
    if (registrations.length > 0) {
      const initialResults = registrations.map((reg) => {
        const existing = existingResults.find(r => r.registration_id === reg.id || r.user_id === reg.user_id);
        
        if (existing && isEditMode) {
          let resultStatus: 'pending' | 'win' | 'lose' | 'tie' = 'pending';
          if (existing.is_winner) {
            resultStatus = 'win';
          } else if (isTDMMatch && !existing.is_winner && existing.prize_amount > 0) {
            // If player has prize but is not winner, it's a TIE
            resultStatus = 'tie';
          } else if (isTDMMatch && !existing.is_winner && existingResults.length > 0) {
            resultStatus = 'lose';
          }
          
          return {
            registration_id: reg.id,
            user_id: reg.user_id,
            player_name: reg.bgmi_ingame_name || 'Unknown Player',
            player_id: reg.bgmi_player_id || '',
            avatar_url: reg.avatar_url || null,
            position: existing.position,
            kills: existing.kills || 0,
            prize_amount: existing.prize_amount || 0,
            is_winner: existing.is_winner || false,
            result_status: resultStatus,
            original_prize: existing.prize_amount || 0,
            existing_result_id: existing.id
          };
        }
        
        return {
          registration_id: reg.id,
          user_id: reg.user_id,
          player_name: reg.bgmi_ingame_name || 'Unknown Player',
          player_id: reg.bgmi_player_id || '',
          avatar_url: reg.avatar_url || null,
          position: null,
          kills: 0,
          prize_amount: 0,
          is_winner: false,
          result_status: 'pending' as const,
          original_prize: 0,
          existing_result_id: null
        };
      });
      setResults(initialResults);
    }
  }, [registrations, existingResults, isEditMode, isTDMMatch]);

  const updateResult = (regId: string, field: keyof ResultEntry, value: any) => {
    setResults(prev => prev.map(r => {
      if (r.registration_id === regId) {
        const updated = { ...r, [field]: value };
        
        if (match) {
          let prize = 0;
          
          if (isTDMMatch && updated.result_status === 'win') {
            prize = effectiveWinnerPrize;
            updated.is_winner = true;
            updated.position = 1;
          } else if (isTDMMatch && updated.result_status === 'tie') {
            // TIE: Split the prize pool 50/50
            prize = Math.floor(effectiveWinnerPrize / 2);
            updated.is_winner = false;
            updated.position = null;
          } else if (isTDMMatch && updated.result_status === 'lose') {
            updated.is_winner = false;
            updated.position = null;
          }
          
          if (isClassicMatch) {
            if (updated.position === 1) {
              prize += effectiveWinnerPrize;
              updated.is_winner = true;
            } else if (updated.position === 2) {
              prize += (match as any).second_place_prize || 0;
            } else if (updated.position === 3) {
              prize += (match as any).third_place_prize || 0;
            }
          }
          
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

  // Bulk actions
  const markAllAsWinners = () => {
    setResults(prev => prev.map(r => {
      const updated = { ...r, result_status: 'win' as const, is_winner: true, position: 1 };
      if (match) {
        updated.prize_amount = effectiveWinnerPrize + (match.prize_per_kill * r.kills);
      }
      return updated;
    }));
    toast({ title: 'Bulk Action', description: 'All players marked as winners' });
  };

  const markAllAsLosers = () => {
    setResults(prev => prev.map(r => {
      const updated = { ...r, result_status: 'lose' as const, is_winner: false, position: null, prize_amount: 0 };
      return updated;
    }));
    toast({ title: 'Bulk Action', description: 'All players marked as losers' });
  };

  const markAllAsTie = () => {
    setResults(prev => prev.map(r => {
      const tieAmount = Math.floor(effectiveWinnerPrize / 2);
      const updated = { ...r, result_status: 'tie' as const, is_winner: false, position: null, prize_amount: tieAmount + (match?.prize_per_kill || 0) * r.kills };
      return updated;
    }));
    toast({ title: 'Bulk Action', description: 'Match marked as TIE - Prize split 50/50' });
  };

  const applyBulkKills = () => {
    setResults(prev => prev.map(r => {
      const updated = { ...r, kills: bulkKills };
      if (match && match.prize_per_kill && bulkKills > 0) {
        let prize = match.prize_per_kill * bulkKills;
        if (r.is_winner || r.result_status === 'win') {
          prize += effectiveWinnerPrize;
        } else if (isClassicMatch && r.position === 2) {
          prize += (match as any).second_place_prize || 0;
        } else if (isClassicMatch && r.position === 3) {
          prize += (match as any).third_place_prize || 0;
        }
        updated.prize_amount = prize;
      }
      return updated;
    }));
    toast({ title: 'Bulk Action', description: `Applied ${bulkKills} kills to all players` });
  };

  const resetAllResults = () => {
    setResults(prev => prev.map(r => ({
      ...r,
      position: null,
      kills: 0,
      prize_amount: 0,
      is_winner: false,
      result_status: 'pending' as const
    })));
    toast({ title: 'Reset', description: 'All results have been reset' });
  };

  const handleDeclareResults = async () => {
    if (!match) return;
    
    setIsSaving(true);
    
    try {
      const resultsToSave = results.filter(r => 
        r.prize_amount > 0 || r.position || r.result_status !== 'pending'
      );
      
      if (resultsToSave.length === 0) {
        toast({ title: 'Error', description: 'Please set at least one result', variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      if (isEditMode) {
        // Update existing results
        for (const result of resultsToSave) {
          if (result.existing_result_id) {
            await supabase
              .from('match_results')
              .update({
                position: result.position,
                kills: result.kills,
                prize_amount: result.prize_amount,
                is_winner: result.is_winner
              })
              .eq('id', result.existing_result_id);
          } else {
            await supabase.from('match_results').insert({
              match_id: match.id,
              user_id: result.user_id,
              registration_id: result.registration_id,
              position: result.position,
              kills: result.kills,
              prize_amount: result.prize_amount,
              is_winner: result.is_winner
            });
          }

          // Adjust wallet balance
          const originalPrize = result.original_prize || 0;
          const prizeDifference = result.prize_amount - originalPrize;

          if (prizeDifference !== 0) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('wallet_balance')
              .eq('id', result.user_id)
              .single();

            if (profile) {
              await supabase
                .from('profiles')
                .update({ wallet_balance: (profile.wallet_balance || 0) + prizeDifference })
                .eq('id', result.user_id);

              await supabase.from('transactions').insert([{
                user_id: result.user_id,
                amount: Math.abs(prizeDifference),
                type: prizeDifference > 0 ? 'prize' as const : 'admin_debit' as const,
                status: 'completed' as const,
                description: `📝 Result correction for "${match.title}" - ${prizeDifference > 0 ? 'Additional' : 'Deducted'} ₹${Math.abs(prizeDifference)}`
              }]);

              await supabase.from('notifications').insert({
                user_id: result.user_id,
                title: '📝 Result Updated',
                message: `Your result for "${match.title}" has been updated. ${prizeDifference > 0 ? `Additional ₹${prizeDifference} added` : prizeDifference < 0 ? `₹${Math.abs(prizeDifference)} deducted` : 'No prize change.'}`,
                type: 'info'
              });
            }
          }
        }

        toast({ title: 'Success', description: 'Results updated successfully!' });
        onResultsDeclared();
        onClose();
        return;
      }

      // Insert new results
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

      for (const result of resultsToSave) {
        if (result.prize_amount > 0) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', result.user_id)
            .single();

          if (profile) {
            await supabase
              .from('profiles')
              .update({ wallet_balance: (profile.wallet_balance || 0) + result.prize_amount })
              .eq('id', result.user_id);
          }

          await supabase.from('transactions').insert([{
            user_id: result.user_id,
            amount: result.prize_amount,
            type: 'prize' as const,
            status: 'completed' as const,
            description: result.result_status === 'tie' 
              ? `🤝 TIE Prize for "${match.title}" - Split 50/50, Kills: ${result.kills}`
              : `🏆 Prize for "${match.title}" - ${result.is_winner ? 'Winner' : `Position: ${result.position || 'N/A'}`}, Kills: ${result.kills}`
          }]);

          const notificationTitle = result.is_winner 
            ? '🏆 Congratulations! You Won!' 
            : result.result_status === 'tie' 
            ? '🤝 Match Ended in TIE!'
            : '💰 Match Rewards';
          
          const notificationMessage = result.result_status === 'tie'
            ? `Match "${match.title}" ended in a TIE! You earned ₹${result.prize_amount} (50/50 split). ${result.kills > 0 ? `Kills: ${result.kills}` : ''}`
            : `You earned ₹${result.prize_amount} from "${match.title}". ${result.position ? `Position: #${result.position}` : ''} ${result.kills > 0 ? `Kills: ${result.kills}` : ''}`;

          await supabase.from('notifications').insert({
            user_id: result.user_id,
            title: notificationTitle,
            message: notificationMessage,
            type: 'success'
          });
        }
      }

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

      await supabase
        .from('matches')
        .update({ status: 'completed' })
        .eq('id', match.id);

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
            {isEditMode ? <Edit className="w-5 h-5 text-primary" /> : <Trophy className="w-5 h-5 text-primary" />}
            {isEditMode ? 'Edit Results' : 'Declare Results'} - {match?.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading players...</div>
          ) : registrations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No approved registrations found</div>
          ) : (
            <div className="space-y-4">
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
                    <p className="font-bold text-yellow-500">₹{effectiveWinnerPrize}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Per Kill:</span>
                  <p className="font-bold text-red-500">₹{match?.prize_per_kill || 0}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Match ID: <span className="font-mono text-primary">{match?.id.slice(0, 8).toUpperCase()}</span>
                {isEditMode && <span className="ml-2 text-yellow-500">(Edit Mode)</span>}
              </div>

              {/* Bulk Actions */}
              <div className="glass-card p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" /> Bulk Actions
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetAllResults}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset All
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {isTDMMatch && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={markAllAsWinners}
                        className="text-green-500 border-green-500/50 hover:bg-green-500/10"
                      >
                        <Award className="w-3 h-3 mr-1" /> All Winners
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={markAllAsTie}
                        className="text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/10"
                      >
                        <Handshake className="w-3 h-3 mr-1" /> TIE (50/50)
                      </Button>
                      <Button
                        variant="outline" 
                        size="sm" 
                        onClick={markAllAsLosers}
                        className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                      >
                        <XCircle className="w-3 h-3 mr-1" /> All Losers
                      </Button>
                    </>
                  )}
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Skull className="w-3 h-3 mr-1" /> Apply Kills to All
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48">
                      <div className="space-y-2">
                        <Label className="text-xs">Kills for all players</Label>
                        <Input
                          type="number"
                          min={0}
                          value={bulkKills}
                          onChange={(e) => setBulkKills(parseInt(e.target.value) || 0)}
                          placeholder="Enter kills"
                        />
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={applyBulkKills}
                        >
                          Apply to All
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-3">
                {results.map((result) => (
                  <div 
                    key={result.registration_id} 
                    className={cn(
                      "glass-card p-4 transition-colors",
                      result.result_status === 'win' && "border-green-500/50 bg-green-500/5",
                      result.result_status === 'tie' && "border-yellow-500/50 bg-yellow-500/5",
                      result.result_status === 'lose' && "border-red-500/50 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-10 h-10 border-2 border-primary/30">
                        <AvatarImage src={result.avatar_url || ''} alt={result.player_name} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                          {result.player_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{result.player_name}</p>
                        {result.player_id && (
                          <p className="text-xs text-muted-foreground">ID: {result.player_id}</p>
                        )}
                      </div>
                      {result.prize_amount > 0 && (
                        <span className="text-primary font-bold">₹{result.prize_amount}</span>
                      )}
                      {isEditMode && result.original_prize > 0 && result.prize_amount !== result.original_prize && (
                        <span className="text-xs text-muted-foreground">(was ₹{result.original_prize})</span>
                      )}
                      {result.result_status === 'win' && (
                        <span className="flex items-center gap-1 text-green-500 text-xs">
                          <Award className="w-4 h-4" /> Winner
                        </span>
                      )}
                      {result.result_status === 'tie' && (
                        <span className="flex items-center gap-1 text-yellow-500 text-xs">
                          <Handshake className="w-4 h-4" /> Tie
                        </span>
                      )}
                      {result.result_status === 'lose' && (
                        <span className="flex items-center gap-1 text-red-500 text-xs">
                          <XCircle className="w-4 h-4" /> Lost
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                              <SelectItem value="tie">🤝 Tie (50/50 Split)</SelectItem>
                              <SelectItem value="lose">❌ Lost</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

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
            {isSaving ? 'Processing...' : isEditMode ? 'Update Results' : 'Declare Results & Distribute Prizes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchResultsDialog;