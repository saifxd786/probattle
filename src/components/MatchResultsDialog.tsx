import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Target, Crown, Skull, Coins, Gamepad2, ArrowDown, ArrowUp, Minus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type MatchResult = {
  id: string;
  user_id: string;
  position: number | null;
  kills: number | null;
  prize_amount: number | null;
  is_winner: boolean | null;
  bgmi_ingame_name: string | null;
  avatar_url: string | null;
};

interface MatchResultsDialogProps {
  matchId: string | null;
  matchTitle: string;
  matchType: string;
  prizePerKill?: number;
  isOpen: boolean;
  onClose: () => void;
}

const MatchResultsDialog = ({ 
  matchId, 
  matchTitle, 
  matchType,
  prizePerKill = 0,
  isOpen, 
  onClose 
}: MatchResultsDialogProps) => {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isTDM = matchType === 'tdm' || matchType === 'TDM';

  useEffect(() => {
    if (matchId && isOpen) {
      fetchResults();
    }
  }, [matchId, isOpen]);

  const fetchResults = async () => {
    if (!matchId) return;
    
    setIsLoading(true);
    
    // Fetch match results with registration data
    const { data: resultsData, error } = await supabase
      .from('match_results')
      .select(`
        id, 
        user_id, 
        position, 
        kills, 
        prize_amount, 
        is_winner,
        registration_id
      `)
      .eq('match_id', matchId)
      .order('position', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching results:', error);
      setIsLoading(false);
      return;
    }

    if (resultsData && resultsData.length > 0) {
      // Fetch user profiles and registration data
      const userIds = resultsData.map(r => r.user_id);
      const registrationIds = resultsData.map(r => r.registration_id).filter(Boolean);
      
      const [profilesRes, registrationsRes] = await Promise.all([
        supabase.from('profiles').select('id, avatar_url').in('id', userIds),
        supabase.from('match_registrations').select('id, bgmi_ingame_name').in('id', registrationIds)
      ]);
      
      const profiles = profilesRes.data || [];
      const registrations = registrationsRes.data || [];
      
      // Merge data
      const mergedResults = resultsData.map(result => ({
        ...result,
        avatar_url: profiles.find(p => p.id === result.user_id)?.avatar_url || null,
        bgmi_ingame_name: registrations.find(r => r.id === result.registration_id)?.bgmi_ingame_name || 'Unknown'
      }));
      
      setResults(mergedResults);
    } else {
      setResults([]);
    }
    
    setIsLoading(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  };

  const getPositionBadge = (position: number | null) => {
    if (!position) return null;
    
    switch (position) {
      case 1:
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/50">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">1st</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-400/20 border border-gray-400/50">
            <Medal className="w-4 h-4 text-gray-300" />
            <span className="text-xs font-bold text-gray-300">2nd</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-600/20 border border-amber-600/50">
            <Medal className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-500">3rd</span>
          </div>
        );
      default:
        return (
          <div className="px-2 py-1 rounded-full bg-muted/50 border border-border">
            <span className="text-xs font-medium text-muted-foreground">#{position}</span>
          </div>
        );
    }
  };

  const getResultStatus = (result: MatchResult) => {
    // For TDM matches
    if (isTDM) {
      if (result.is_winner === true) {
        return { label: 'WINNER', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50', icon: Trophy };
      } else if (result.is_winner === false) {
        return { label: 'LOST', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50', icon: Skull };
      } else {
        return { label: 'TIE', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: Minus };
      }
    }
    
    // For Classic matches - based on position
    if (result.position === 1) {
      return { label: 'WINNER', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50', icon: Trophy };
    } else if (result.position && result.position <= 3) {
      return { label: 'TOP 3', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: Medal };
    } else if (result.prize_amount && result.prize_amount > 0) {
      return { label: 'EARNED', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: Coins };
    } else {
      return { label: 'LOST', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50', icon: Skull };
    }
  };

  // Separate winners and losers for TDM
  const winners = results.filter(r => r.is_winner === true || (r.position === 1));
  const losers = results.filter(r => r.is_winner === false && r.position !== 1);
  const ties = results.filter(r => r.is_winner === null && r.position !== 1);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-primary/30 max-h-[85vh]">
        {/* Header with gradient - Compact */}
        <div className="relative bg-gradient-to-br from-primary/30 via-primary/10 to-transparent p-3 border-b border-primary/20">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        />
          <DialogHeader className="relative z-10">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-primary/20 border border-primary/30">
                <Trophy className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="block text-sm font-semibold">Match Results</span>
                <span className="text-xs font-normal text-muted-foreground">{matchTitle}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* Stats summary - Compact */}
          <div className="flex gap-2 mt-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50 border border-border/50">
              <Gamepad2 className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium">{results.length} Players</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50 border border-border/50">
              <Trophy className="w-3 h-3 text-green-400" />
              <span className="text-xs font-medium">{winners.length} Winners</span>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] p-3">
          {isLoading ? (
            <div className="py-8 text-center">
              <motion.div
                className="w-8 h-8 mx-auto mb-3 border-3 border-primary/30 border-t-primary rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              />
              <p className="text-sm text-muted-foreground">Loading results...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No results published yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Winners Section */}
              {winners.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Trophy className="w-4 h-4 text-green-400" />
                    <h3 className="text-sm font-semibold text-green-400">Winners</h3>
                  </div>
                  <div className="space-y-1.5">
                    <AnimatePresence>
                      {winners.map((result, index) => (
                        <ResultCard 
                          key={result.id} 
                          result={result} 
                          index={index}
                          prizePerKill={prizePerKill}
                          getInitials={getInitials}
                          getPositionBadge={getPositionBadge}
                          getResultStatus={getResultStatus}
                          isTDM={isTDM}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Ties Section (for TDM) */}
              {ties.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Minus className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-sm font-semibold text-yellow-400">Tie</h3>
                  </div>
                  <div className="space-y-1.5">
                    {ties.map((result, index) => (
                      <ResultCard 
                        key={result.id} 
                        result={result} 
                        index={index}
                        prizePerKill={prizePerKill}
                        getInitials={getInitials}
                        getPositionBadge={getPositionBadge}
                        getResultStatus={getResultStatus}
                        isTDM={isTDM}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Losers Section */}
              {losers.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Skull className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-semibold text-red-400">
                      {isTDM ? 'Lost' : 'Other Participants'}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {losers.map((result, index) => (
                      <ResultCard 
                        key={result.id} 
                        result={result} 
                        index={index}
                        prizePerKill={prizePerKill}
                        getInitials={getInitials}
                        getPositionBadge={getPositionBadge}
                        getResultStatus={getResultStatus}
                        isTDM={isTDM}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Separate component for each result card
const ResultCard = ({ 
  result, 
  index, 
  prizePerKill,
  getInitials, 
  getPositionBadge, 
  getResultStatus,
  isTDM 
}: { 
  result: MatchResult; 
  index: number;
  prizePerKill: number;
  getInitials: (name: string | null) => string;
  getPositionBadge: (position: number | null) => React.ReactNode;
  getResultStatus: (result: MatchResult) => { label: string; color: string; bg: string; border: string; icon: any };
  isTDM: boolean;
}) => {
  const status = getResultStatus(result);
  const StatusIcon = status.icon;
  const isWinner = status.label === 'WINNER' || status.label === 'TOP 3';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "relative flex items-center gap-2 p-2.5 rounded-lg border transition-all overflow-hidden",
        isWinner 
          ? "bg-gradient-to-r from-green-500/10 via-transparent to-transparent border-green-500/30" 
          : status.label === 'TIE'
            ? "bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent border-yellow-500/30"
            : "bg-gradient-to-r from-red-500/5 via-transparent to-transparent border-red-500/20"
      )}
    >
      {/* Winner glow effect */}
      {isWinner && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-transparent to-green-500/10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
      
      {/* Rank/Position */}
      <div className="relative z-10 shrink-0">
        {!isTDM && (
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold",
            result.position === 1 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" :
            result.position === 2 ? "bg-gray-400/20 text-gray-300 border border-gray-400/50" :
            result.position === 3 ? "bg-amber-600/20 text-amber-500 border border-amber-600/50" :
            "bg-muted/50 text-muted-foreground border border-border"
          )}>
            {result.position === 1 ? <Crown className="w-4 h-4" /> :
             result.position && result.position <= 3 ? <Medal className="w-4 h-4" /> :
             `#${result.position}`}
          </div>
        )}
        {isTDM && (
          <div className={cn("p-1.5 rounded-md", status.bg, status.border, "border")}>
            <StatusIcon className={cn("w-4 h-4", status.color)} />
          </div>
        )}
      </div>
      
      {/* Avatar */}
      <Avatar className={cn(
        "w-9 h-9 border relative z-10",
        isWinner ? "border-green-500/50" : status.label === 'TIE' ? "border-yellow-500/50" : "border-red-500/30"
      )}>
        <AvatarImage src={result.avatar_url || undefined} alt={result.bgmi_ingame_name || 'Player'} />
        <AvatarFallback className={cn(
          "text-xs font-bold",
          isWinner ? "bg-green-500/20 text-green-400" : status.label === 'TIE' ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
        )}>
          {getInitials(result.bgmi_ingame_name)}
        </AvatarFallback>
      </Avatar>
      
      {/* Player Info */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate max-w-[100px]">{result.bgmi_ingame_name || 'Unknown'}</p>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", status.color, status.bg, status.border)}>
            {status.label}
          </Badge>
        </div>
        
        {/* Kills info */}
        {result.kills !== null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Target className="w-3 h-3 text-orange-400" />
            <span>{result.kills} Kills</span>
          </div>
        )}
      </div>
      
      {/* Prize Amount */}
      <div className="relative z-10 text-right shrink-0">
        {result.prize_amount !== null && result.prize_amount > 0 ? (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-0.5 text-green-400">
              <span className="font-bold text-sm">₹{result.prize_amount}</span>
            </div>
            <span className="text-[9px] text-green-400/70">Won</span>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-medium">₹0</span>
            <span className="text-[9px] text-muted-foreground">No Prize</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MatchResultsDialog;
