import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, Swords, Users, Crown, RefreshCw, Flame, Sparkles, Loader2, X, Clock
} from 'lucide-react';
import { usePublicLudoChallenge, LUDO_AVATARS, CUSTOM_AMOUNTS, PublicChallenge } from '@/hooks/usePublicLudoChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface ChallengesPageProps {
  mode: 'create' | 'join';
  minEntryAmount: number;
  walletBalance: number;
  rewardMultiplier: number;
  onBack: () => void;
  onAcceptChallenge: (data: { 
    roomId: string; 
    roomCode: string; 
    entryAmount: number; 
    rewardAmount: number;
    isHost: boolean;
  }) => void;
  onCreateChallenge: (entryAmount: number, playerMode: 2 | 3 | 4) => void;
  onSwitchToJoin?: () => void;
}

const getModeLabel = (mode: 2 | 3 | 4) => {
  switch (mode) {
    case 2: return '1v1';
    case 3: return '1v1v1';
    case 4: return '1v1v1v1';
  }
};

const getModeColor = (mode: 2 | 3 | 4) => {
  switch (mode) {
    case 2: return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' };
    case 3: return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 4: return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  }
};

const getModeIcon = (mode: 2 | 3 | 4) => {
  switch (mode) {
    case 2: return Swords;
    case 3: return Users;
    case 4: return Crown;
  }
};

const getMultiplier = (mode: 2 | 3 | 4, baseMultiplier: number) => {
  switch (mode) {
    case 2: return baseMultiplier;
    case 3: return 2;
    case 4: return 2.5;
  }
};

// Get a consistent avatar based on creator ID
const getAvatarForUser = (creatorId: string, avatarUrl?: string | null): string => {
  if (avatarUrl) return avatarUrl;
  // Use hash of ID to pick consistent avatar
  const hash = creatorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return LUDO_AVATARS[hash % LUDO_AVATARS.length];
};

const formatWaitTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const ChallengesPage = ({
  mode,
  minEntryAmount,
  walletBalance,
  rewardMultiplier,
  onBack,
  onAcceptChallenge,
  onCreateChallenge,
  onSwitchToJoin,
}: ChallengesPageProps) => {
  const { user } = useAuth();
  const { 
    challenges, 
    myChallenge, 
    isLoading, 
    createChallenge, 
    acceptChallenge, 
    cancelChallenge,
    refetch 
  } = usePublicLudoChallenge();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 2 | 3 | 4>('all');
  
  // For create mode
  const [selectedEntry, setSelectedEntry] = useState(minEntryAmount);
  const [selectedMode, setSelectedMode] = useState<2 | 3 | 4>(2);
  const [isCreating, setIsCreating] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  // Check if user has active challenge (waiting mode)
  useEffect(() => {
    if (myChallenge && mode === 'create') {
      setIsWaiting(true);
      setSelectedEntry(myChallenge.entry_amount);
      setSelectedMode(myChallenge.player_mode);
    }
  }, [myChallenge, mode]);

  // Watch for when myChallenge gets matched - auto redirect (for challenge creator)
  useEffect(() => {
    if (myChallenge?.status === 'matched' && myChallenge.room_code) {
      // Fetch the room details to get room_id
      const fetchRoomAndJoin = async () => {
        const { data: room } = await supabase
          .from('ludo_rooms')
          .select('id, entry_amount, reward_amount')
          .eq('room_code', myChallenge.room_code)
          .single();
        
        if (room) {
          onAcceptChallenge({ 
            roomId: room.id,
            roomCode: myChallenge.room_code!,
            entryAmount: room.entry_amount, 
            rewardAmount: room.reward_amount,
            isHost: false, // Creator joins as guest since the joiner created the room
          });
        }
      };
      fetchRoomAndJoin();
    }
  }, [myChallenge, onAcceptChallenge]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCreateChallenge = async () => {
    setIsCreating(true);
    const result = await createChallenge(selectedEntry, selectedMode);
    setIsCreating(false);
    
    if (result.success) {
      setIsWaiting(true);
      // Redirect to join section so user can see their challenge at top
      if (onSwitchToJoin) {
        onSwitchToJoin();
      }
    }
  };

  const handleCancelChallenge = async () => {
    await cancelChallenge();
    setIsWaiting(false);
  };

  const handleAcceptChallenge = async (challenge: PublicChallenge) => {
    const result = await acceptChallenge(challenge.id);
    if (result.success && result.roomId && result.roomCode) {
      onAcceptChallenge({ 
        roomId: result.roomId, 
        roomCode: result.roomCode,
        entryAmount: result.entryAmount || challenge.entry_amount,
        rewardAmount: result.rewardAmount || (challenge.entry_amount * 2 * 1.5),
        isHost: true, // Joiner is the host since they created the room
      });
    }
  };

  // Filter challenges - show own challenge at top, then others
  const filteredChallenges = useMemo(() => {
    let ownChallenge = challenges.filter(c => c.creator_id === user?.id);
    let otherChallenges = challenges.filter(c => c.creator_id !== user?.id);
    
    if (selectedFilter !== 'all') {
      ownChallenge = ownChallenge.filter(c => c.player_mode === selectedFilter);
      otherChallenges = otherChallenges.filter(c => c.player_mode === selectedFilter);
    }
    
    // Own challenge first, then others
    return [...ownChallenge, ...otherChallenges];
  }, [challenges, selectedFilter, user?.id]);

  // Valid amounts (multiples of 10)
  const validAmounts = CUSTOM_AMOUNTS.filter(a => a >= minEntryAmount && a <= 2000);
  const canAffordCreate = walletBalance >= selectedEntry;
  const createMultiplier = getMultiplier(selectedMode, rewardMultiplier);
  const createReward = selectedEntry * createMultiplier;

  return (
    <div className="h-[100dvh] bg-[#0A0A0F] flex flex-col overflow-hidden">
      {/* Background */}
      <div 
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 100% 100%, rgba(236, 72, 153, 0.06) 0%, transparent 40%),
            #0A0A0F
          `,
        }}
      />

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={isWaiting ? handleCancelChallenge : onBack}
            className="w-10 h-10 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            {isWaiting ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </motion.button>
          
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {isWaiting ? 'Waiting for Opponent' : mode === 'create' ? 'Create Challenge' : 'Join Challenge'}
              </h1>
              <p className="text-[10px] text-gray-500">
                {isWaiting 
                  ? `Entry: ₹${selectedEntry} • ${getModeLabel(selectedMode)}`
                  : mode === 'create' 
                    ? 'Set your entry & wait for opponent' 
                    : `${filteredChallenges.length} players waiting`}
              </p>
            </div>
          </div>

          {mode === 'join' && !isWaiting && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-auto w-9 h-9 rounded-lg bg-gray-800/60 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Waiting State */}
      {isWaiting && myChallenge ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6"
          >
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </motion.div>
          
          <h2 className="text-xl font-bold text-white mb-2">Searching for Opponent...</h2>
          <p className="text-gray-400 text-sm mb-6">Waiting {formatWaitTime(myChallenge.waitingTime)}</p>
          
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 w-full max-w-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Entry</p>
                <p className="text-lg font-bold text-white">₹{myChallenge.entry_amount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Mode</p>
                <p className="text-lg font-bold text-white">{getModeLabel(myChallenge.player_mode)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Win</p>
                <p className="text-lg font-bold text-amber-400">
                  ₹{(myChallenge.entry_amount * getMultiplier(myChallenge.player_mode, rewardMultiplier)).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCancelChallenge}
            className="mt-6 px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold"
          >
            Cancel Challenge
          </motion.button>
        </div>
      ) : mode === 'create' ? (
        /* Create Challenge UI */
        <div className="flex-1 px-4 pb-4 flex flex-col overflow-hidden">
          {/* Mode Selection */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Select Mode</p>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((m) => {
                const isActive = selectedMode === m;
                const colors = getModeColor(m);
                const Icon = getModeIcon(m);
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMode(m)}
                    className={cn(
                      "flex-1 py-3 rounded-xl border transition-all flex items-center justify-center gap-2",
                      isActive 
                        ? `${colors.bg} ${colors.text} ${colors.border}` 
                        : "bg-gray-900/50 text-gray-500 border-gray-800 hover:border-gray-700"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold text-sm">{getModeLabel(m)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Entry Amount Grid - Scrollable */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <p className="text-xs text-gray-400 mb-2">Entry Amount (₹10, ₹20, ₹30...)</p>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2 pb-4">
                {validAmounts.slice(0, 50).map((amount) => {
                  const isActive = selectedEntry === amount;
                  const canAfford = walletBalance >= amount;
                  return (
                    <button
                      key={amount}
                      onClick={() => canAfford && setSelectedEntry(amount)}
                      disabled={!canAfford}
                      className={cn(
                        "py-2.5 rounded-xl border transition-all font-bold text-xs",
                        isActive 
                          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" 
                          : canAfford
                            ? "bg-gray-900/50 text-white border-gray-800 hover:border-gray-700"
                            : "bg-gray-900/30 text-gray-600 border-gray-800/50 cursor-not-allowed"
                      )}
                    >
                      ₹{amount}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Prize Preview */}
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Potential Win</p>
                <p className="text-2xl font-bold text-amber-400">₹{createReward.toFixed(0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Multiplier</p>
                <p className="text-lg font-bold text-amber-400">{createMultiplier}x</p>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateChallenge}
            disabled={!canAffordCreate || isCreating}
            className={cn(
              "w-full h-14 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2",
              canAffordCreate
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            )}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : canAffordCreate ? (
              'Create Challenge'
            ) : (
              'Insufficient Balance'
            )}
          </motion.button>
        </div>
      ) : (
        /* Join Challenge UI */
        <>
          {/* Mode Filters */}
          <div className="flex-shrink-0 px-4 pb-2">
            <div className="flex gap-1.5">
              {(['all', 2, 3, 4] as const).map((filter) => {
                const isActive = selectedFilter === filter;
                const colors = filter === 'all' 
                  ? { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' }
                  : getModeColor(filter);
                
                return (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={cn(
                      "flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all border",
                      isActive 
                        ? `${colors.bg} ${colors.text} ${colors.border}` 
                        : "bg-gray-900/50 text-gray-500 border-gray-800 hover:border-gray-700"
                    )}
                  >
                    {filter === 'all' ? 'All' : getModeLabel(filter)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Challenges List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {isLoading && challenges.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
              </div>
            ) : filteredChallenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No challenges available</p>
                <p className="text-xs">Create one or check back later</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                    {filteredChallenges.map((challenge, index) => {
                      const isOwnChallenge = challenge.creator_id === user?.id;
                      const canAfford = walletBalance >= challenge.entry_amount || isOwnChallenge;
                      const modeColors = getModeColor(challenge.player_mode);
                      const ModeIcon = getModeIcon(challenge.player_mode);
                      const multiplier = getMultiplier(challenge.player_mode, rewardMultiplier);
                      const reward = challenge.entry_amount * multiplier;
                      const avatarUrl = getAvatarForUser(challenge.creator_id, challenge.creator?.avatar_url);
                      
                      return (
                        <motion.div
                          key={challenge.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "relative p-3 rounded-xl border transition-all",
                            isOwnChallenge
                              ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30"
                              : canAfford 
                                ? "bg-gray-900/60 border-gray-800 hover:border-gray-700" 
                                : "bg-gray-900/30 border-gray-800/50 opacity-50"
                          )}
                        >
                          {/* Own challenge badge */}
                          {isOwnChallenge && (
                            <div className="absolute -top-2 left-3 px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-[9px] font-bold text-white">
                              YOUR CHALLENGE
                            </div>
                          )}
                          
                          <div className="flex items-center gap-3">
                            {/* User Avatar */}
                            <div className="relative">
                              <Avatar className="w-11 h-11 rounded-xl">
                                <AvatarImage src={avatarUrl} alt={challenge.creator?.username || 'Player'} />
                                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl">
                                  {(challenge.creator?.username || 'P').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {challenge.waitingTime < 30 && !isOwnChallenge && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                                  <Flame className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-white text-sm truncate">
                                  {isOwnChallenge ? 'You' : (challenge.creator?.username || 'Player')}
                                </p>
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5",
                                  modeColors.bg, modeColors.text
                                )}>
                                  <ModeIcon className="w-2.5 h-2.5" />
                                  {getModeLabel(challenge.player_mode)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatWaitTime(challenge.waitingTime)}
                                </span>
                                <span className="text-gray-700">•</span>
                                <span className="text-[10px] text-emerald-400 font-medium">
                                  Win ₹{reward.toFixed(0)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Entry & Accept */}
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="text-right">
                                <p className="text-[9px] text-gray-500">Entry</p>
                                <p className="font-bold text-white text-sm">₹{challenge.entry_amount}</p>
                              </div>
                              {isOwnChallenge ? (
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={handleCancelChallenge}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 border border-red-500/30 text-red-400"
                                >
                                  Cancel
                                </motion.button>
                              ) : (
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleAcceptChallenge(challenge)}
                                  disabled={!canAfford || isLoading}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    canAfford
                                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30"
                                      : "bg-gray-800 text-gray-500 cursor-not-allowed"
                                  )}
                                >
                                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Play'}
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
              </AnimatePresence>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChallengesPage;
