import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, Swords, Users, Crown, RefreshCw, Flame, Sparkles, Loader2, Clock
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
  onPlayWithBot?: (entryAmount: number, playerMode: 2 | 3 | 4) => void;
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

// Realistic Indian names for bot players
const BOT_NAMES = [
  'Rahul_Gamer', 'Priya_Pro', 'Amit_King', 'Neha_Star', 'Vikram_99',
  'Anjali_Boss', 'Rohan_X', 'Sneha_Win', 'Arjun_YT', 'Kavita_777',
  'Deepak_FF', 'Megha_Queen', 'Suresh_OP', 'Divya_GG', 'Karan_Ace',
  'Pooja_Lucky', 'Raj_Thunder', 'Simran_Pro', 'Aakash_Beast', 'Ritu_Fire',
  'Mohit_Legend', 'Ananya_Blitz', 'Nikhil_Storm', 'Tanvi_Rush', 'Varun_Clash',
  'Sakshi_Fury', 'Harsh_Boom', 'Shruti_Glow', 'Gaurav_Max', 'Ishita_Zen'
];

// Entry amounts for bots
const BOT_ENTRY_AMOUNTS = [10, 20, 30, 50, 100, 150, 200, 300, 500];

// Companion player for 1v1v1 and 1v1v1v1 modes
interface CompanionPlayer {
  username: string;
  avatar_url: string;
}

interface BotChallenge {
  id: string;
  creator_id: string;
  entry_amount: number;
  player_mode: 2 | 3 | 4;
  status: string;
  room_code: null;
  matched_user_id: null;
  created_at: string;
  expires_at: string;
  waitingTime: number;
  isBot: true;
  creator: {
    username: string;
    avatar_url: string;
  };
  companions?: CompanionPlayer[]; // Other players already in the challenge
}

// Generate DETERMINISTIC bot challenges - SAME for ALL users
// Uses date-based seed so everyone sees identical bots
const getDailyBotSeed = (): number => {
  const now = new Date();
  // Seed changes every 6 hours (4 times per day), same for all users
  const hours = Math.floor(now.getHours() / 6);
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return dateSeed * 10 + hours;
};

// Simple seeded random generator for deterministic results
const seededRandom = (seed: number, index: number): number => {
  const x = Math.sin(seed * 9999 + index * 7919) * 10000;
  return x - Math.floor(x);
};

const generateBotChallenges = (minEntry: number): BotChallenge[] => {
  const seed = getDailyBotSeed();
  const bots: BotChallenge[] = [];
  const usedNames = new Set<string>();
  
  // Generate 10-14 bot challenges (deterministic count)
  const count = 10 + Math.floor(seededRandom(seed, 0) * 5);
  
  for (let i = 0; i < count; i++) {
    // Pick unique name using deterministic selection
    const nameIndex = Math.floor(seededRandom(seed, i * 3 + 1) * BOT_NAMES.length);
    let name = BOT_NAMES[nameIndex];
    let attempts = 0;
    while (usedNames.has(name) && attempts < BOT_NAMES.length) {
      name = BOT_NAMES[(nameIndex + attempts + 1) % BOT_NAMES.length];
      attempts++;
    }
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    
    // Pick entry amount (deterministic)
    const validAmounts = BOT_ENTRY_AMOUNTS.filter(a => a >= minEntry);
    const amountIndex = Math.floor(seededRandom(seed, i * 3 + 2) * validAmounts.length);
    const entryAmount = validAmounts[amountIndex];
    
    // Pick mode - more 1v1s (deterministic)
    const modes: (2 | 3 | 4)[] = [2, 2, 2, 2, 3, 3, 4];
    const modeIndex = Math.floor(seededRandom(seed, i * 3 + 3) * modes.length);
    const playerMode = modes[modeIndex];
    
    // Waiting time - starts deterministic but will tick up
    const baseWaitTime = Math.floor(seededRandom(seed, i * 5) * 50) + 5;
    
    // Pick avatar (deterministic per bot)
    const avatarIndex = Math.floor(seededRandom(seed, i * 7) * LUDO_AVATARS.length);
    
    // Generate companion players for 1v1v1 and 1v1v1v1
    // 1v1v1 (3 players) = 1 companion (creator + companion + joiner)
    // 1v1v1v1 (4 players) = 2 companions (creator + 2 companions + joiner)
    const companionCount = playerMode - 2; // 0 for 1v1, 1 for 1v1v1, 2 for 1v1v1v1
    const companions: CompanionPlayer[] = [];
    
    for (let j = 0; j < companionCount; j++) {
      // Get a unique companion name (different from creator)
      const companionNameIndex = Math.floor(seededRandom(seed, i * 100 + j * 17 + 50) * BOT_NAMES.length);
      let companionName = BOT_NAMES[companionNameIndex];
      // Make sure it's different from creator
      if (companionName === name) {
        companionName = BOT_NAMES[(companionNameIndex + 1) % BOT_NAMES.length];
      }
      
      const companionAvatarIndex = Math.floor(seededRandom(seed, i * 100 + j * 23 + 70) * LUDO_AVATARS.length);
      
      companions.push({
        username: companionName,
        avatar_url: LUDO_AVATARS[companionAvatarIndex],
      });
    }
    
    bots.push({
      id: `bot-${seed}-${i}`,
      creator_id: `bot-${seed}-${i}`,
      entry_amount: entryAmount,
      player_mode: playerMode,
      status: 'waiting',
      room_code: null,
      matched_user_id: null,
      created_at: new Date(Date.now() - baseWaitTime * 1000).toISOString(),
      expires_at: new Date(Date.now() + 300000).toISOString(),
      waitingTime: baseWaitTime,
      isBot: true,
      creator: {
        username: name,
        avatar_url: LUDO_AVATARS[avatarIndex],
      },
      companions: companions.length > 0 ? companions : undefined,
    });
  }
  
  return bots.sort((a, b) => a.entry_amount - b.entry_amount);
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
  onPlayWithBot,
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

  // No longer auto-show waiting screen - just redirect to join tab
  // The user's challenge will be shown at the top of the join list with "YOUR CHALLENGE" badge

  // Watch for when myChallenge gets matched by real player - auto redirect (for challenge creator)
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

  // Auto-connect with bot after 7 seconds if no real player joins
  // This gives priority to real player matches first
  useEffect(() => {
    if (!myChallenge || myChallenge.status !== 'waiting') return;
    
    const waitingTime = myChallenge.waitingTime;
    const BOT_CONNECT_DELAY = 7; // 7 seconds delay before bot connection
    
    // If we've waited 7+ seconds, auto-connect with bot
    if (waitingTime >= BOT_CONNECT_DELAY && onPlayWithBot) {
      console.log('[ChallengesPage] 7s elapsed, connecting with bot...');
      // Cancel the challenge first (cleanup)
      cancelChallenge().then(() => {
        // Start bot game
        onPlayWithBot(myChallenge.entry_amount, myChallenge.player_mode);
        onBack();
      });
    }
  }, [myChallenge?.waitingTime, myChallenge?.status, onPlayWithBot, cancelChallenge, onBack]);

  const handleCreateChallenge = async () => {
    setIsCreating(true);
    const result = await createChallenge(selectedEntry, selectedMode);
    setIsCreating(false);
    
    if (result.success) {
      // Don't show waiting animation - directly switch to join tab
      // User's challenge will appear at top with "YOUR CHALLENGE" badge
      if (onSwitchToJoin) {
        onSwitchToJoin();
      }
    }
  };

  const handleCancelChallenge = async () => {
    await cancelChallenge();
  };

  const handleAcceptChallenge = async (challenge: PublicChallenge & { isBot?: boolean }) => {
    // Check if this is a bot challenge
    if ((challenge as any).isBot && onPlayWithBot) {
      // Start bot game with selected entry and mode
      onPlayWithBot(challenge.entry_amount, challenge.player_mode);
      onBack(); // Close challenges page
      return;
    }
    
    // Real challenge - normal flow
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

  // Generate bot challenges
  const [botChallenges, setBotChallenges] = useState<BotChallenge[]>(() => 
    generateBotChallenges(minEntryAmount)
  );
  
  // Update bot waiting times every second
  useEffect(() => {
    const interval = setInterval(() => {
      setBotChallenges(prev => prev.map(bot => ({
        ...bot,
        waitingTime: bot.waitingTime + 1,
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Regenerate bots on refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setBotChallenges(generateBotChallenges(minEntryAmount));
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter challenges - show own challenge at top, then real users, then bots
  const filteredChallenges = useMemo(() => {
    // Real challenges
    let ownChallenge = challenges.filter(c => c.creator_id === user?.id);
    let otherRealChallenges = challenges.filter(c => c.creator_id !== user?.id);
    
    // Bot challenges (cast to match type)
    let filteredBots = botChallenges as unknown as PublicChallenge[];
    
    if (selectedFilter !== 'all') {
      ownChallenge = ownChallenge.filter(c => c.player_mode === selectedFilter);
      otherRealChallenges = otherRealChallenges.filter(c => c.player_mode === selectedFilter);
      filteredBots = botChallenges.filter(c => c.player_mode === selectedFilter) as unknown as PublicChallenge[];
    }
    
    // Own challenge first, then real users, then bots (sorted by entry)
    const allOthers = [...otherRealChallenges, ...filteredBots].sort((a, b) => a.entry_amount - b.entry_amount);
    return [...ownChallenge, ...allOthers];
  }, [challenges, botChallenges, selectedFilter, user?.id]);

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
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {mode === 'create' ? 'Create Challenge' : 'Join Challenge'}
              </h1>
              <p className="text-[10px] text-gray-500">
                {mode === 'create' 
                  ? 'Set your entry & find opponent' 
                  : `${filteredChallenges.length} players waiting`}
              </p>
            </div>
          </div>

          {mode === 'join' && (
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

      {/* Content */}
      {mode === 'create' ? (
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
                            {/* Player Avatars - Stack for multiple players */}
                            <div className="relative flex items-center">
                              {/* Creator Avatar */}
                              <div className="relative z-10">
                                <Avatar className="w-11 h-11 rounded-xl border-2 border-gray-900">
                                  <AvatarImage src={avatarUrl} alt={challenge.creator?.username || 'Player'} />
                                  <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl">
                                    {(challenge.creator?.username || 'P').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {challenge.waitingTime < 30 && !isOwnChallenge && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center z-20">
                                    <Flame className="w-2.5 h-2.5 text-white" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Companion Avatars (for 1v1v1 and 1v1v1v1) */}
                              {(challenge as any).companions?.map((companion: { username: string; avatar_url: string }, idx: number) => (
                                <div key={idx} className="relative -ml-3" style={{ zIndex: 9 - idx }}>
                                  <Avatar className="w-9 h-9 rounded-lg border-2 border-gray-900">
                                    <AvatarImage src={companion.avatar_url} alt={companion.username} />
                                    <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg text-[10px]">
                                      {companion.username.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              ))}
                              
                              {/* "You" slot indicator for modes > 2 */}
                              {challenge.player_mode > 2 && (
                                <div className="relative -ml-2" style={{ zIndex: 5 }}>
                                  <div className="w-8 h-8 rounded-lg border-2 border-dashed border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-emerald-400">YOU</span>
                                  </div>
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
