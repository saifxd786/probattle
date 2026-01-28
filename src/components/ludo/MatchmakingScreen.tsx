import { motion, AnimatePresence } from 'framer-motion';
import { Users, Loader2, Crown, Wifi, Shield, Clock, Zap, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Player {
  id: string;
  name: string;
  uid: string; // 5-digit UID
  avatar?: string;
  isBot: boolean;
  status: 'searching' | 'connecting' | 'ready';
  color: string;
}

interface MatchmakingScreenProps {
  players: Player[];
  totalPlayers: number;
  entryAmount: number;
  rewardAmount: number;
}

const BOT_NAMES = [
  'Aman', 'Rohit', 'Kunal', 'Neeraj', 'Sandeep', 'Rakesh', 'Ajay',
  'Vikram', 'Suresh', 'Deepak', 'Rahul', 'Pradeep', 'Mohit', 'Ankur',
  'Priya', 'Neha', 'Kavita', 'Anjali', 'Pooja', 'Ritu', 'Shreya'
];

const COLORS = {
  red: { bg: 'from-red-500 to-red-700', border: 'border-red-400', text: 'text-red-400', glow: 'shadow-red-500/50' },
  green: { bg: 'from-green-500 to-green-700', border: 'border-green-400', text: 'text-green-400', glow: 'shadow-green-500/50' },
  yellow: { bg: 'from-yellow-500 to-yellow-700', border: 'border-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-500/50' },
  blue: { bg: 'from-blue-500 to-blue-700', border: 'border-blue-400', text: 'text-blue-400', glow: 'shadow-blue-500/50' }
};

// Animated searching dots
const SearchingDots = () => {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
        />
      ))}
    </span>
  );
};

// Live player count indicator
const LiveIndicator = () => (
  <motion.div 
    className="flex items-center gap-1.5 text-xs text-green-400"
    animate={{ opacity: [1, 0.7, 1] }}
    transition={{ duration: 2, repeat: Infinity }}
  >
    <motion.div 
      className="w-2 h-2 rounded-full bg-green-500"
      animate={{ scale: [1, 1.3, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
    <span>LIVE</span>
  </motion.div>
);

// Player card component - more realistic design
const PlayerCard = ({ player, index, isSearching }: { player?: Player; index: number; isSearching: boolean }) => {
  const colorKeys = ['red', 'green', 'yellow', 'blue'];
  const colorKey = colorKeys[index] as keyof typeof COLORS;
  const colors = COLORS[colorKey];
  const [ping, setPing] = useState(Math.floor(Math.random() * 30) + 10);

  useEffect(() => {
    if (player) {
      const interval = setInterval(() => {
        setPing(Math.floor(Math.random() * 30) + 10);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [player]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 200 }}
      className={cn(
        'relative p-4 rounded-2xl border transition-all duration-300',
        player 
          ? `bg-gradient-to-br ${colors.bg}/10 ${colors.border}/30 border-2` 
          : 'bg-gray-800/30 border-gray-700/50 border-dashed'
      )}
    >
      {player ? (
        <div className="flex items-center gap-3">
          {/* Avatar with status ring */}
          <div className="relative">
            <motion.div
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg',
                `bg-gradient-to-br ${colors.bg}`
              )}
              animate={player.status === 'ready' ? {} : { scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {player.avatar ? (
                <img src={player.avatar} alt={player.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                player.name.charAt(0).toUpperCase()
              )}
            </motion.div>

            {/* Status indicator */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs',
                player.status === 'ready' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-yellow-500 text-black'
              )}
            >
              {player.status === 'ready' ? '✓' : (
                <motion.span 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  ◌
                </motion.span>
              )}
            </motion.div>

            {/* Glow effect */}
            {player.status === 'ready' && (
              <motion.div
                className={cn('absolute inset-0 rounded-full', colors.glow)}
                style={{ boxShadow: `0 0 20px currentColor` }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">#{player.uid || '00000'}</span>
              {!player.isBot && (
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">YOU</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-xs font-medium capitalize', colors.text)}>
                {colorKey}
              </span>
              {player.status === 'ready' && (
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <Wifi className="w-3 h-3" />
                  {ping}ms
                </span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            player.status === 'ready' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          )}>
            {player.status === 'ready' ? 'Ready' : 'Connecting...'}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-2">
          <motion.div 
            className="w-14 h-14 rounded-full bg-gray-700/50 flex items-center justify-center"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Users className="w-6 h-6 text-gray-500" />
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">
                Searching <SearchingDots />
              </span>
            </div>
            <span className={cn('text-xs capitalize', colors.text)}>
              {colorKey} Player
            </span>
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-5 h-5 text-gray-500" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const MatchmakingScreen = ({ players, totalPlayers, entryAmount, rewardAmount }: MatchmakingScreenProps) => {
  const [searchTime, setSearchTime] = useState(0);
  const [onlinePlayers] = useState(Math.floor(Math.random() * 500) + 2500);
  const slots = Array.from({ length: totalPlayers }, (_, i) => players[i] || null);
  const allReady = players.length === totalPlayers && players.every(p => p.status === 'ready');
  const readyCount = players.filter(p => p.status === 'ready').length;

  useEffect(() => {
    const timer = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-black/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10"
            >
              <Crown className="w-6 h-6 text-yellow-500" />
            </motion.div>
            <div>
              <h1 className="font-bold text-lg text-white">Finding Match</h1>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{formatTime(searchTime)}</span>
                <span className="text-gray-600">•</span>
                <LiveIndicator />
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Online</div>
            <div className="font-bold text-white">{onlinePlayers.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Match Info Cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 text-center"
        >
          <Zap className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-xs text-red-300/80 uppercase tracking-wide">Entry</p>
          <p className="text-xl font-bold text-white">₹{entryAmount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 text-center"
        >
          <Crown className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-xs text-green-300/80 uppercase tracking-wide">Win</p>
          <p className="text-xl font-bold text-green-400">₹{rewardAmount}</p>
        </motion.div>
      </div>

      {/* Players Section */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-300">
            Players ({readyCount}/{totalPlayers})
          </span>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-green-400">Secure Match</span>
          </div>
        </div>

        <div className="space-y-3">
          {slots.map((player, idx) => (
            <PlayerCard 
              key={idx} 
              player={player || undefined} 
              index={idx} 
              isSearching={!player} 
            />
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 bg-black/30 border-t border-white/10">
        <div className="mb-3">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-500 to-green-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(readyCount / totalPlayers) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {allReady ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold"
              >
                <Smartphone className="w-5 h-5" />
                Starting Game...
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-gray-400 text-sm"
            >
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Matching you with nearby players <SearchingDots />
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MatchmakingScreen;
export { BOT_NAMES };
