import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, Swords, Users, Crown, RefreshCw, Flame, Sparkles
} from 'lucide-react';

// Bot personas with Indian MALE names only
const BOT_PERSONAS = [
  { name: 'Arjun_Pro', avatar: '🦁' },
  { name: 'RajGamer99', avatar: '🔥' },
  { name: 'VikramKing', avatar: '⚡' },
  { name: 'RohanBoss', avatar: '🎯' },
  { name: 'DeepakX', avatar: '🚀' },
  { name: 'KaranAce', avatar: '🎮' },
  { name: 'AmitChamp', avatar: '🥇' },
  { name: 'SureshGod', avatar: '👊' },
  { name: 'RahulStar', avatar: '⭐' },
  { name: 'AkashPro', avatar: '💎' },
  { name: 'VarunTop', avatar: '🏆' },
  { name: 'ManojKiller', avatar: '🔱' },
  { name: 'SanjayBeast', avatar: '🐯' },
  { name: 'PradeepX', avatar: '✨' },
  { name: 'RakeshLucky', avatar: '🍀' },
];

const ENTRY_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000, 2000];

interface BotChallenge {
  id: string;
  bot: typeof BOT_PERSONAS[0];
  entryAmount: number;
  playerMode: 2 | 3 | 4;
  isHot: boolean;
  waitingTime: number;
}

interface ChallengesPageProps {
  mode: 'create' | 'join';
  minEntryAmount: number;
  walletBalance: number;
  rewardMultiplier: number;
  onBack: () => void;
  onAcceptChallenge: (challenge: BotChallenge) => void;
  onCreateChallenge: (entryAmount: number, playerMode: 2 | 3 | 4) => void;
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
    case 3: return 2.5;
    case 4: return 3.5;
  }
};

const generateChallenges = (minEntry: number): BotChallenge[] => {
  const validAmounts = ENTRY_AMOUNTS.filter(a => a >= minEntry);
  const challenges: BotChallenge[] = [];
  const usedBots = new Set<string>();
  
  const count = 6 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < count; i++) {
    let botIndex: number;
    do {
      botIndex = Math.floor(Math.random() * BOT_PERSONAS.length);
    } while (usedBots.has(BOT_PERSONAS[botIndex].name) && usedBots.size < BOT_PERSONAS.length);
    
    usedBots.add(BOT_PERSONAS[botIndex].name);
    
    const entryAmount = validAmounts[Math.floor(Math.random() * validAmounts.length)];
    const modes: (2 | 3 | 4)[] = [2, 2, 2, 3, 3, 4];
    const playerMode = modes[Math.floor(Math.random() * modes.length)];
    
    challenges.push({
      id: `challenge-${i}-${Date.now()}`,
      bot: BOT_PERSONAS[botIndex],
      entryAmount,
      playerMode,
      isHot: Math.random() > 0.7,
      waitingTime: Math.floor(Math.random() * 45) + 5,
    });
  }
  
  return challenges.sort((a, b) => a.entryAmount - b.entryAmount);
};

const ChallengesPage = ({
  mode,
  minEntryAmount,
  walletBalance,
  rewardMultiplier,
  onBack,
  onAcceptChallenge,
  onCreateChallenge,
}: ChallengesPageProps) => {
  const [challenges, setChallenges] = useState<BotChallenge[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 2 | 3 | 4>('all');
  
  // For create mode
  const [selectedEntry, setSelectedEntry] = useState(minEntryAmount);
  const [selectedMode, setSelectedMode] = useState<2 | 3 | 4>(2);

  useEffect(() => {
    if (mode === 'join') {
      setChallenges(generateChallenges(minEntryAmount));
    }
  }, [minEntryAmount, mode]);

  useEffect(() => {
    if (mode !== 'join') return;
    const interval = setInterval(() => {
      setChallenges(prev => prev.map(c => ({
        ...c,
        waitingTime: c.waitingTime + 1,
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'join') return;
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setChallenges(prev => {
          const newChallenges = [...prev];
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
          } else if (newChallenges.length > 4) {
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
  }, [minEntryAmount, mode]);

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

  const validAmounts = ENTRY_AMOUNTS.filter(a => a >= minEntryAmount);
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
                {mode === 'create' ? 'Set your entry & wait for opponent' : `${challenges.length} players waiting`}
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

      {mode === 'create' ? (
        /* Create Challenge UI */
        <div className="flex-1 px-4 pb-4 flex flex-col">
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

          {/* Entry Amount Grid */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Entry Amount</p>
            <div className="grid grid-cols-4 gap-2">
              {validAmounts.map((amount) => {
                const isActive = selectedEntry === amount;
                const canAfford = walletBalance >= amount;
                return (
                  <button
                    key={amount}
                    onClick={() => canAfford && setSelectedEntry(amount)}
                    disabled={!canAfford}
                    className={cn(
                      "py-3 rounded-xl border transition-all font-bold text-sm",
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
          <div className="mt-auto">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onCreateChallenge(selectedEntry, selectedMode)}
              disabled={!canAffordCreate}
              className={cn(
                "w-full h-14 rounded-xl font-bold text-lg transition-all",
                canAffordCreate
                  ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              )}
            >
              {canAffordCreate ? 'Create Challenge' : 'Insufficient Balance'}
            </motion.button>
          </div>
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
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xl">
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
                          {canAfford ? 'Join' : 'Low Balance'}
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
                No challenges found. Try a different filter!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChallengesPage;
