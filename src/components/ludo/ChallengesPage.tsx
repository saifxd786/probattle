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

// Preset bot info for when joining a bot challenge
export interface PresetBotInfo {
  name: string;
  avatar: string;
}

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
  onCreateChallenge: (entryAmount: number, playerMode: 2 | 4) => void;
  onSwitchToJoin?: () => void;
  onPlayWithBot?: (entryAmount: number, playerMode: 2 | 4, presetBots?: PresetBotInfo[]) => void;
}

const getModeLabel = (mode: 2 | 4) => {
  switch (mode) {
    case 2: return '1v1';
    case 4: return '1v1v1v1';
  }
};

const getModeColor = (mode: 2 | 4) => {
  switch (mode) {
    case 2: return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' };
    case 4: return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  }
};

const getModeIcon = (mode: 2 | 4) => {
  switch (mode) {
    case 2: return Swords;
    case 4: return Crown;
  }
};

const getMultiplier = (mode: 2 | 4, baseMultiplier: number) => {
  switch (mode) {
    case 2: return baseMultiplier;
    case 4: return 2.5;
  }
};

// Import centralized bot names (200+ names: Hindu, Muslim, Gaming/Funny)
import { BOT_NAMES } from '@/constants/ludoBotNames';

// Entry amounts for bots - weighted towards popular amounts
const BOT_ENTRY_AMOUNTS = [
  10, 10, 10, 20, 20, 20, 30, 30, 50, 50, 50, 50,
  100, 100, 100, 100, 100, 150, 150, 200, 200, 200,
  300, 300, 500, 500
];

// Companion player for 1v1v1 and 1v1v1v1 modes
interface CompanionPlayer {
  username: string;
  avatar_url: string;
}

interface BotChallenge {
  id: string;
  creator_id: string;
  entry_amount: number;
  player_mode: 2 | 4;
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
  const usedNames = new Set<string>(); // Track ALL used names (creators + companions)
  
  // Generate 25-35 bot challenges for realistic activity
  const count = 25 + Math.floor(seededRandom(seed, 0) * 11);
  
  for (let i = 0; i < count; i++) {
    // Pick unique name for creator using deterministic selection
    const nameIndex = Math.floor(seededRandom(seed, i * 3 + 1) * BOT_NAMES.length);
    let name = BOT_NAMES[nameIndex];
    let attempts = 0;
    while (usedNames.has(name) && attempts < BOT_NAMES.length) {
      name = BOT_NAMES[(nameIndex + attempts + 1) % BOT_NAMES.length];
      attempts++;
    }
    if (usedNames.has(name)) continue; // Skip if no unique name available
    usedNames.add(name);
    
    // Pick entry amount - allows duplicates across bots for realistic feel
    // Popular amounts (50, 100, 200) will appear more frequently
    const amountIndex = Math.floor(seededRandom(seed, i * 7 + 2) * BOT_ENTRY_AMOUNTS.length);
    const rawAmount = BOT_ENTRY_AMOUNTS[amountIndex];
    const entryAmount = Math.max(rawAmount, minEntry);
    
    // Pick mode - more 1v1s (deterministic) - only 1v1 and 1v1v1v1
    const modes: (2 | 4)[] = [2, 2, 2, 2, 4];
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
      // Get a unique companion name (different from ALL used names)
      const companionNameIndex = Math.floor(seededRandom(seed, i * 100 + j * 17 + 50) * BOT_NAMES.length);
      let companionName = BOT_NAMES[companionNameIndex];
      let compAttempts = 0;
      // Make sure it's different from ALL used names (creators + other companions)
      while (usedNames.has(companionName) && compAttempts < BOT_NAMES.length) {
        companionName = BOT_NAMES[(companionNameIndex + compAttempts + 1) % BOT_NAMES.length];
        compAttempts++;
      }
      if (usedNames.has(companionName)) continue; // Skip this companion if no unique name
      usedNames.add(companionName);
      
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
  
  // Sort by entry amount but with slight randomization to mix same amounts
  return bots.sort((a, b) => {
    const diff = a.entry_amount - b.entry_amount;
    if (diff !== 0) return diff;
    // Same amount - randomize order using waiting time
    return a.waitingTime - b.waitingTime;
  });
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 2 | 4>('all');
  
  // For create mode
  const [selectedEntry, setSelectedEntry] = useState(minEntryAmount);
  const [selectedMode, setSelectedMode] = useState<2 | 4>(2);
  const [isCreating, setIsCreating] = useState(false);

  // No longer auto-show waiting screen - just redirect to join tab
  // The user's challenge will be shown at the top of the join list with "YOUR CHALLENGE" badge

  // Watch for when myChallenge gets matched by real player - auto redirect (for challenge creator)
  useEffect(() => {
    if (myChallenge?.status === 'matched') {
      // For 1v1v1 and 1v1v1v1, both players start their own bot games
      // The challenge creator also starts a bot game (no room needed)
      if (myChallenge.player_mode > 2 && onPlayWithBot) {
        console.log('[ChallengesPage] 4-player matched, starting bot game for creator');
        onPlayWithBot(myChallenge.entry_amount, myChallenge.player_mode as 2 | 4);
        onBack();
        return;
      }
      
      // For 1v1 mode, use the room system
      if (myChallenge.room_code) {
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
    }
  }, [myChallenge, onAcceptChallenge, onPlayWithBot, onBack]);

  // Auto-connect with bot after 7 seconds if no real player joins
  // This gives priority to real player matches first
  // Track if we've already triggered bot connection to prevent race conditions
  const [botConnectionTriggered, setBotConnectionTriggered] = useState(false);
  
  // Show "Opponent Found" animation before starting game
  const [joiningOpponent, setJoiningOpponent] = useState<{
    name: string;
    avatar: string;
    entryAmount: number;
    playerMode: 2 | 4;
  } | null>(null);
  
  useEffect(() => {
    // Reset trigger when challenge changes
    setBotConnectionTriggered(false);
    setJoiningOpponent(null);
  }, [myChallenge?.id]);
  
  useEffect(() => {
    if (!myChallenge || myChallenge.status !== 'waiting' || botConnectionTriggered) return;
    
    const waitingTime = myChallenge.waitingTime;
    const BOT_CONNECT_DELAY = 7; // 7 seconds delay before bot connection
    
    // If we've waited 7+ seconds, show opponent joining animation then connect
    if (waitingTime >= BOT_CONNECT_DELAY && onPlayWithBot) {
      console.log('[ChallengesPage] 7s elapsed, showing opponent joining...');
      
      // Prevent duplicate triggers
      setBotConnectionTriggered(true);
      
      // Capture values before async operation
      const entryAmount = myChallenge.entry_amount;
      const playerMode = myChallenge.player_mode;
      
      // Pick a random bot to show as opponent
      const randomBotIndex = Math.floor(Math.random() * BOT_NAMES.length);
      const randomAvatarIndex = Math.floor(Math.random() * LUDO_AVATARS.length);
      const opponentName = BOT_NAMES[randomBotIndex];
      const opponentAvatar = LUDO_AVATARS[randomAvatarIndex];
      
      // Show joining animation
      setJoiningOpponent({
        name: opponentName,
        avatar: opponentAvatar,
        entryAmount,
        playerMode,
      });
      
      // Cancel challenge silently and start game after animation (2.5s)
      cancelChallenge(true).then(() => {
        setTimeout(() => {
          // Start bot game with the displayed opponent
          onPlayWithBot(entryAmount, playerMode, [{ name: opponentName, avatar: opponentAvatar }]);
          onBack();
        }, 2500);
      }).catch(() => {
        setTimeout(() => {
          onPlayWithBot(entryAmount, playerMode, [{ name: opponentName, avatar: opponentAvatar }]);
          onBack();
        }, 2500);
      });
    }
  }, [myChallenge?.waitingTime, myChallenge?.status, myChallenge?.id, myChallenge?.entry_amount, myChallenge?.player_mode, onPlayWithBot, cancelChallenge, onBack, botConnectionTriggered]);

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

  const handleAcceptChallenge = async (challenge: PublicChallenge & { isBot?: boolean; companions?: CompanionPlayer[] }) => {
    // Check if this is a bot challenge
    if ((challenge as any).isBot && onPlayWithBot) {
      // Build preset bots array from challenge creator + companions
      const presetBots: PresetBotInfo[] = [];
      
      // Add the challenge creator (main bot)
      if (challenge.creator) {
        presetBots.push({
          name: challenge.creator.username,
          avatar: challenge.creator.avatar_url || LUDO_AVATARS[0],
        });
      }
      
      // Add companions for 1v1v1 and 1v1v1v1 modes
      if ((challenge as any).companions) {
        ((challenge as any).companions as CompanionPlayer[]).forEach((comp: CompanionPlayer) => {
          presetBots.push({
            name: comp.username,
            avatar: comp.avatar_url,
          });
        });
      }
      
      // Start bot game with preset bots from the challenge
      onPlayWithBot(challenge.entry_amount, challenge.player_mode, presetBots);
      onBack(); // Close challenges page
      return;
    }
    
    // Real challenge - normal flow
    const result = await acceptChallenge(challenge.id);
    
    // Check if this is a 1v1v1/1v1v1v1 challenge (handled as bot game)
    if (result.success && (result as any).isBotGame && onPlayWithBot) {
      const botResult = result as {
        success: true;
        isBotGame: true;
        playerMode: 2 | 4;
        entryAmount: number;
        creatorName: string;
        creatorAvatar: string;
      };
      
      // Build preset bots with challenge creator as first bot
      const presetBots: PresetBotInfo[] = [
        {
          name: botResult.creatorName,
          avatar: botResult.creatorAvatar,
        }
      ];
      
      // For 1v1v1v1, add one more random bot
      if (botResult.playerMode === 4) {
        const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        presetBots.push({
          name: randomName,
          avatar: LUDO_AVATARS[Math.floor(Math.random() * LUDO_AVATARS.length)],
        });
      }
      
      // Start bot game
      onPlayWithBot(botResult.entryAmount, botResult.playerMode, presetBots);
      onBack();
      return;
    }
    
    // 1v1 challenge - friend room flow
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
  // Remove bots after 5 minutes (300s) and replace with new ones
  useEffect(() => {
    const MAX_WAIT_TIME = 300; // 5 minutes max
    
    const interval = setInterval(() => {
      setBotChallenges(prev => {
        const seed = getDailyBotSeed();
        const currentTime = Date.now();
        
        // First, collect ALL currently used names (for uniqueness check)
        const usedNames = new Set<string>();
        prev.forEach(bot => {
          usedNames.add(bot.creator.username);
          bot.companions?.forEach(comp => usedNames.add(comp.username));
        });
        
        return prev.map((bot, index) => {
          const newWaitTime = bot.waitingTime + 1;
          
          // If bot exceeded 5 minutes, replace with fresh bot
          if (newWaitTime > MAX_WAIT_TIME) {
            // Remove old names from used set (this bot is being replaced)
            usedNames.delete(bot.creator.username);
            bot.companions?.forEach(comp => usedNames.delete(comp.username));
            
            // Pick a new unique name
            const newNameIndex = Math.floor(seededRandom(seed + currentTime, index * 13) * BOT_NAMES.length);
            let newName = BOT_NAMES[newNameIndex];
            let attempts = 0;
            while (usedNames.has(newName) && attempts < BOT_NAMES.length) {
              newName = BOT_NAMES[(newNameIndex + attempts + 1) % BOT_NAMES.length];
              attempts++;
            }
            usedNames.add(newName);
            
            // Generate new random waiting time (5-60 seconds)
            const newBaseWait = Math.floor(seededRandom(seed + currentTime, index * 11) * 55) + 5;
            
            // Pick new avatar
            const newAvatarIndex = Math.floor(seededRandom(seed + currentTime, index * 17) * LUDO_AVATARS.length);
            
            // Pick new entry amount
            const newAmountIndex = Math.floor(seededRandom(seed + currentTime, index * 19) * BOT_ENTRY_AMOUNTS.length);
            const newAmount = Math.max(BOT_ENTRY_AMOUNTS[newAmountIndex], minEntryAmount);
            
            // Pick new mode - only 1v1 and 1v1v1v1
            const modes: (2 | 4)[] = [2, 2, 2, 2, 4];
            const newModeIndex = Math.floor(seededRandom(seed + currentTime, index * 23) * modes.length);
            const newMode = modes[newModeIndex];
            
            // Generate companions for new mode (also unique names)
            const companionCount = newMode - 2;
            const newCompanions: CompanionPlayer[] = [];
            for (let j = 0; j < companionCount; j++) {
              const compNameIdx = Math.floor(seededRandom(seed + currentTime, index * 100 + j * 29) * BOT_NAMES.length);
              let compName = BOT_NAMES[compNameIdx];
              let compAttempts = 0;
              while (usedNames.has(compName) && compAttempts < BOT_NAMES.length) {
                compName = BOT_NAMES[(compNameIdx + compAttempts + 1) % BOT_NAMES.length];
                compAttempts++;
              }
              usedNames.add(compName);
              
              const compAvatarIdx = Math.floor(seededRandom(seed + currentTime, index * 100 + j * 31) * LUDO_AVATARS.length);
              newCompanions.push({ username: compName, avatar_url: LUDO_AVATARS[compAvatarIdx] });
            }
            
            return {
              ...bot,
              id: `bot-${seed}-${currentTime}-${index}`,
              entry_amount: newAmount,
              player_mode: newMode,
              waitingTime: newBaseWait,
              creator: {
                username: newName,
                avatar_url: LUDO_AVATARS[newAvatarIndex],
              },
              companions: newCompanions.length > 0 ? newCompanions : undefined,
            };
          }
          
          return { ...bot, waitingTime: newWaitTime };
        });
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [minEntryAmount]);
  
  // Regenerate bots on refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setBotChallenges(generateBotChallenges(minEntryAmount));
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter challenges - show own challenge at top, then real users, then bots
  // Extended type to include bot-specific properties
  type ChallengeWithCompanions = PublicChallenge & { 
    isBot?: boolean; 
    companions?: CompanionPlayer[] 
  };
  
  const filteredChallenges = useMemo((): ChallengeWithCompanions[] => {
    // Real challenges
    let ownChallenge = challenges.filter(c => c.creator_id === user?.id);
    let otherRealChallenges = challenges.filter(c => c.creator_id !== user?.id);
    
    // Bot challenges - keep companions data
    let filteredBots = botChallenges as unknown as ChallengeWithCompanions[];
    
    if (selectedFilter !== 'all') {
      ownChallenge = ownChallenge.filter(c => c.player_mode === selectedFilter);
      otherRealChallenges = otherRealChallenges.filter(c => c.player_mode === selectedFilter);
      filteredBots = (botChallenges.filter(c => c.player_mode === selectedFilter)) as unknown as ChallengeWithCompanions[];
    }
    
    // Own challenge first, then real users, then bots (sorted by entry)
    const allOthers = [...otherRealChallenges, ...filteredBots].sort((a, b) => a.entry_amount - b.entry_amount);
    return [...ownChallenge, ...allOthers] as ChallengeWithCompanions[];
  }, [challenges, botChallenges, selectedFilter, user?.id]);

  // Valid amounts (multiples of 10)
  const validAmounts = CUSTOM_AMOUNTS.filter(a => a >= minEntryAmount && a <= 2000);
  const canAffordCreate = walletBalance >= selectedEntry;
  const createMultiplier = getMultiplier(selectedMode, rewardMultiplier);
  const createReward = selectedEntry * createMultiplier;

  // Opponent Joining Overlay - Full screen VS animation
  if (joiningOpponent) {
    return (
      <div className="h-[100dvh] bg-[#0A0A0F] flex flex-col overflow-hidden">
        {/* Background with enhanced glow */}
        <div 
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 100% 100%, rgba(236, 72, 153, 0.06) 0%, transparent 40%),
              #0A0A0F
            `,
          }}
        />

        {/* VS Animation Container */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.p
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-lg font-bold text-emerald-400 mb-1"
            >
              ✨ Opponent Found!
            </motion.p>
            <p className="text-xs text-gray-500">Starting game...</p>
          </motion.div>

          {/* VS Battle Section */}
          <div className="flex items-center justify-center gap-4 w-full">
            {/* You */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-3 border-indigo-500 shadow-lg shadow-indigo-500/30">
                  <img 
                    src={user?.user_metadata?.avatar_url || LUDO_AVATARS[0]} 
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white"
                >
                  ✓
                </motion.div>
              </div>
              <span className="text-sm font-semibold text-white">You</span>
              <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                Ready
              </span>
            </motion.div>

            {/* VS Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
              transition={{ 
                scale: { delay: 0.4, type: 'spring', stiffness: 200 },
                rotate: { delay: 0.6, duration: 0.5, repeat: Infinity, repeatDelay: 2 }
              }}
              className="relative"
            >
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                  boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
                }}
              >
                <span className="text-white font-black text-lg">VS</span>
              </div>
              {/* Pulse rings */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-indigo-400"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>

            {/* Opponent */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-20 h-20 rounded-2xl overflow-hidden border-3 border-emerald-500 shadow-lg shadow-emerald-500/30"
                >
                  <img 
                    src={joiningOpponent.avatar} 
                    alt={joiningOpponent.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring' }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white"
                >
                  ✓
                </motion.div>
              </div>
              <span className="text-sm font-semibold text-white">{joiningOpponent.name.split('_')[0]}</span>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400"
              >
                Joining...
              </motion.span>
            </motion.div>
          </div>

          {/* Match Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-900/60 border border-gray-800"
          >
            <div className="text-center">
              <p className="text-[10px] text-gray-500">Entry</p>
              <p className="text-sm font-bold text-white">₹{joiningOpponent.entryAmount}</p>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="text-center">
              <p className="text-[10px] text-gray-500">Mode</p>
              <p className="text-sm font-bold text-indigo-400">{getModeLabel(joiningOpponent.playerMode)}</p>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="text-center">
              <p className="text-[10px] text-gray-500">Prize</p>
              <p className="text-sm font-bold text-amber-400">₹{(joiningOpponent.entryAmount * getMultiplier(joiningOpponent.playerMode, rewardMultiplier)).toFixed(0)}</p>
            </div>
          </motion.div>

          {/* Loading indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent"
            />
            <span className="text-xs text-gray-400">Preparing game board...</span>
          </motion.div>
        </div>
      </div>
    );
  }

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
              {([2, 4] as const).map((m) => {
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
              {(['all', 2, 4] as const).map((filter) => {
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
                          
                          <div className="flex items-start gap-2">
                            {/* Creator Avatar with name */}
                            <div className="flex flex-col items-center gap-0.5 shrink-0">
                              <div className="relative">
                                <Avatar className="w-10 h-10 rounded-xl border-2 border-gray-800">
                                  <AvatarImage src={avatarUrl} alt={challenge.creator?.username || 'Player'} />
                                  <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl text-xs">
                                    {(challenge.creator?.username || 'P').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {challenge.waitingTime < 30 && !isOwnChallenge && (
                                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center z-20">
                                    <Flame className="w-2 h-2 text-white" />
                                  </div>
                                )}
                              </div>
                              <span className="text-[8px] text-gray-400 max-w-[48px] truncate text-center">
                                {isOwnChallenge ? 'You' : (challenge.creator?.username?.split('_')[0] || 'Player')}
                              </span>
                            </div>
                            
                            {/* Companion Players with names (for 1v1v1 and 1v1v1v1) */}
                            {challenge.companions?.map((companion, idx) => (
                              <div key={idx} className="flex flex-col items-center gap-0.5 shrink-0">
                                <Avatar className="w-8 h-8 rounded-lg border-2 border-gray-800">
                                  <AvatarImage src={companion.avatar_url} alt={companion.username} />
                                  <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg text-[9px]">
                                    {companion.username.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[8px] text-gray-500 max-w-[40px] truncate text-center">
                                  {companion.username.split('_')[0]}
                                </span>
                              </div>
                            ))}
                            
                            {/* "You" slot indicator - shows for all modes */}
                            {!isOwnChallenge && (
                              <div className="flex flex-col items-center gap-0.5 shrink-0">
                                <div className="w-8 h-8 rounded-lg border-2 border-dashed border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
                                  <span className="text-[7px] font-bold text-emerald-400">+1</span>
                                </div>
                                <span className="text-[8px] text-emerald-400 font-medium">You</span>
                              </div>
                            )}
                            
                            {/* Info & Actions */}
                            <div className="flex-1 min-w-0 ml-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5",
                                  modeColors.bg, modeColors.text
                                )}>
                                  <ModeIcon className="w-2.5 h-2.5" />
                                  {getModeLabel(challenge.player_mode)}
                                </span>
                                <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatWaitTime(challenge.waitingTime)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-emerald-400 font-medium">
                                  Win ₹{reward.toFixed(0)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Entry & Accept */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className="text-right">
                                <p className="text-[8px] text-gray-500">Entry</p>
                                <p className="font-bold text-white text-sm">₹{challenge.entry_amount}</p>
                              </div>
                              {isOwnChallenge ? (
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={handleCancelChallenge}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 border border-red-500/30 text-red-400"
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
