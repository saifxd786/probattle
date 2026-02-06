import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Swords, Users, Crown, Zap, RefreshCw, Trophy, Flame, 
  User, UserPlus, Sparkles
} from 'lucide-react';

// Bot personas with Indian names
const BOT_PERSONAS = [
  { name: 'Arjun_Pro', avatar: '🦁' },
  { name: 'RajGamer99', avatar: '🔥' },
  { name: 'SnehaQueen', avatar: '👑' },
  { name: 'VikramKing', avatar: '⚡' },
  { name: 'PriyaWins', avatar: '🌟' },
  { name: 'RohanBoss', avatar: '🎯' },
  { name: 'AnjaliPro', avatar: '💎' },
  { name: 'DeepakX', avatar: '🚀' },
  { name: 'MeghaTop', avatar: '🏆' },
  { name: 'KaranAce', avatar: '🎮' },
  { name: 'NehaMaster', avatar: '✨' },
  { name: 'AmitChamp', avatar: '🥇' },
  { name: 'DivyaStar', avatar: '⭐' },
  { name: 'SureshGod', avatar: '👊' },
  { name: 'KavitaLucky', avatar: '🍀' },
];

const ENTRY_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000, 2000];

interface BotChallenge {
  id: string;
  bot: typeof BOT_PERSONAS[0];
  entryAmount: number;
  playerMode: 2 | 3 | 4;
  isHot: boolean;
  waitingTime: number; // seconds "waiting"
}

interface FindMatchChallengesProps {
  minEntryAmount: number;
  walletBalance: number;
  rewardMultiplier: number;
  onAcceptChallenge: (challenge: BotChallenge) => void;
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
    case 2: return baseMultiplier; // 1.5x for 1v1
    case 3: return 2.5; // 2.5x for 1v1v1
    case 4: return 3.5; // 3.5x for 1v1v1v1
  }
};

// Generate random challenges
const generateChallenges = (minEntry: number): BotChallenge[] => {
  const validAmounts = ENTRY_AMOUNTS.filter(a => a >= minEntry);
  const challenges: BotChallenge[] = [];
  const usedBots = new Set<string>();
  
  // Generate 6-8 challenges
  const count = 6 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < count; i++) {
    // Pick a unique bot
    let botIndex: number;
    do {
      botIndex = Math.floor(Math.random() * BOT_PERSONAS.length);
    } while (usedBots.has(BOT_PERSONAS[botIndex].name) && usedBots.size < BOT_PERSONAS.length);
    
    usedBots.add(BOT_PERSONAS[botIndex].name);
    
    // Pick random amount and mode
    const entryAmount = validAmounts[Math.floor(Math.random() * validAmounts.length)];
    const modes: (2 | 3 | 4)[] = [2, 2, 2, 3, 3, 4]; // More 1v1s
    const playerMode = modes[Math.floor(Math.random() * modes.length)];
    
    challenges.push({
      id: `challenge-${i}-${Date.now()}`,
      bot: BOT_PERSONAS[botIndex],
      entryAmount,
      playerMode,
      isHot: Math.random() > 0.7, // 30% chance of being "hot"
      waitingTime: Math.floor(Math.random() * 45) + 5, // 5-50 seconds
    });
  }
  
  // Sort by entry amount
  return challenges.sort((a, b) => a.entryAmount - b.entryAmount);
};

const FindMatchChallenges = ({
  minEntryAmount,
  walletBalance,
  rewardMultiplier,
  onAcceptChallenge,
}: FindMatchChallengesProps) => {
  const [challenges, setChallenges] = useState<BotChallenge[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 2 | 3 | 4>('all');
  
  // Generate initial challenges
  useEffect(() => {
    setChallenges(generateChallenges(minEntryAmount));
  }, [minEntryAmount]);
  
  // Simulate waiting time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setChallenges(prev => prev.map(c => ({
        ...c,
        waitingTime: c.waitingTime + 1,
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Occasionally add/remove challenges to feel dynamic
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setChallenges(prev => {
          const newChallenges = [...prev];
          
          // Sometimes add a new challenge
          if (Math.random() > 0.5 && newChallenges.length < 10) {
            const validAmounts = ENTRY_AMOUNTS.filter(a => a >= minEntryAmount);
            const usedBots = new Set(newChallenges.map(c => c.bot.name));
            const availableBots = BOT_PERSONAS.filter(b => !usedBots.has(b.name));
            
            if (availableBots.length > 0) {
              const bot = availableBots[Math.floor(Math.random() * availableBots.length)];
              const modes: (2 | 3 | 4)[] = [2, 2, 2, 3, 3, 4];
              newChallenges.push({
                id: `challenge-${Date.now()}`,
                bot,
                entryAmount: validAmounts[Math.floor(Math.random() * validAmounts.length)],
                playerMode: modes[Math.floor(Math.random() * modes.length)],
                isHot: Math.random() > 0.7,
                waitingTime: Math.floor(Math.random() * 10) + 1,
              });
            }
          }
          // Sometimes remove old challenge
          else if (newChallenges.length > 4) {
            const oldIndex = newChallenges.findIndex(c => c.waitingTime > 50);
            if (oldIndex !== -1) {
              newChallenges.splice(oldIndex, 1);
            }
          }
          
          return newChallenges.sort((a, b) => a.entryAmount - b.entryAmount);
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [minEntryAmount]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setChallenges(generateChallenges(minEntryAmount));
      setIsRefreshing(false);
    }, 500);
  };
  
  const filteredChallenges = useMemo(() => {
    if (selectedFilter === 'all') return challenges;
    return challenges.filter(c => c.playerMode === selectedFilter);
  }, [challenges, selectedFilter]);

  return (
    <div className="space-y-3">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Find Match</h3>
            <p className="text-[9px] text-gray-500">{challenges.length} players waiting</p>
          </div>
        </div>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-8 h-8 rounded-lg bg-gray-800/60 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
        </motion.button>
      </div>
      
      {/* Mode Filters */}
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
                "flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all border",
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
      
      {/* Challenges List */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {filteredChallenges.map((challenge, index) => {
            const canAfford = walletBalance >= challenge.entryAmount;
            const modeColors = getModeColor(challenge.playerMode);
            const ModeIcon = getModeIcon(challenge.playerMode);
            const multiplier = getMultiplier(challenge.playerMode, rewardMultiplier);
            const reward = challenge.entryAmount * multiplier;
            
            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative p-3 rounded-xl border transition-all",
                  canAfford 
                    ? "bg-gray-900/60 border-gray-800 hover:border-gray-700" 
                    : "bg-gray-900/30 border-gray-800/50 opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Bot Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xl">
                      {challenge.bot.avatar}
                    </div>
                    {challenge.isHot && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                        <Flame className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm truncate">
                        {challenge.bot.name}
                      </p>
                      {/* Mode Badge */}
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5",
                        modeColors.bg, modeColors.text
                      )}>
                        <ModeIcon className="w-2.5 h-2.5" />
                        {getModeLabel(challenge.playerMode)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-500">
                        Waiting {challenge.waitingTime}s
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
                      <p className="font-bold text-white text-sm">₹{challenge.entryAmount}</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onAcceptChallenge(challenge)}
                      disabled={!canAfford}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                        canAfford
                          ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/20"
                          : "bg-gray-800 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      {canAfford ? 'Accept' : 'Low Balance'}
                    </motion.button>
                  </div>
                </div>
                
                {/* Multiplier badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">
                    {multiplier}x
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {filteredChallenges.length === 0 && (
          <div className="py-8 text-center text-gray-500 text-sm">
            No matches found. Try a different filter!
          </div>
        )}
      </div>
    </div>
  );
};

export default FindMatchChallenges;
