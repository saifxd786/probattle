import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Wifi, Shield, Clock, Zap, Gamepad2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Player {
  id: string;
  name: string;
  uid: string;
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
  red: { 
    bg: 'from-red-500 to-red-600', 
    bgLight: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/50', 
    text: 'text-red-400',
    ring: 'ring-red-500/30'
  },
  green: { 
    bg: 'from-green-500 to-green-600', 
    bgLight: 'from-green-500/20 to-green-600/10',
    border: 'border-green-500/50', 
    text: 'text-green-400',
    ring: 'ring-green-500/30'
  },
  yellow: { 
    bg: 'from-yellow-500 to-yellow-600', 
    bgLight: 'from-yellow-500/20 to-yellow-600/10',
    border: 'border-yellow-500/50', 
    text: 'text-yellow-400',
    ring: 'ring-yellow-500/30'
  },
  blue: { 
    bg: 'from-blue-500 to-blue-600', 
    bgLight: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/50', 
    text: 'text-blue-400',
    ring: 'ring-blue-500/30'
  }
};

// Radar/pulse animation component
const RadarPulse = () => (
  <div className="relative w-32 h-32 mx-auto mb-6">
    {/* Outer rings */}
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full border border-primary/30"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1.5 + i * 0.3, opacity: [0, 0.5, 0] }}
        transition={{
          duration: 2,
          delay: i * 0.4,
          repeat: Infinity,
          ease: 'easeOut'
        }}
      />
    ))}
    
    {/* Center icon */}
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary-rgb),0.4)]">
        <Gamepad2 className="w-10 h-10 text-primary-foreground" />
      </div>
    </motion.div>
    
    {/* Rotating dots */}
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    >
      {[0, 90, 180, 270].map((angle) => (
        <motion.div
          key={angle}
          className="absolute w-2 h-2 rounded-full bg-primary"
          style={{
            left: '50%',
            top: '50%',
            transform: `rotate(${angle}deg) translateY(-45px) translateX(-50%)`,
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, delay: angle / 360, repeat: Infinity }}
        />
      ))}
    </motion.div>
  </div>
);

// Player slot component
const PlayerSlot = ({ player, index, totalPlayers }: { 
  player?: Player; 
  index: number;
  totalPlayers: number;
}) => {
  const colorKeys = ['red', 'green', 'yellow', 'blue'];
  const colorKey = colorKeys[index] as keyof typeof COLORS;
  const colors = COLORS[colorKey];
  const [ping] = useState(Math.floor(Math.random() * 30) + 15);

  if (!player) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className={cn(
          'relative p-4 rounded-2xl border-2 border-dashed',
          'bg-card/30 border-border/50'
        )}
      >
        <div className="flex items-center gap-4">
          <motion.div 
            className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Users className="w-6 h-6 text-muted-foreground" />
          </motion.div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <motion.span 
                className="text-sm text-muted-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Searching
              </motion.span>
              <motion.div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </motion.div>
            </div>
            <span className={cn('text-xs capitalize', colors.text)}>
              {colorKey} Player
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
      className={cn(
        'relative p-4 rounded-2xl overflow-hidden',
        `bg-gradient-to-br ${colors.bgLight}`,
        colors.border, 'border-2'
      )}
    >
      {/* Glow effect for ready players */}
      {player.status === 'ready' && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{ boxShadow: `inset 0 0 30px rgba(var(--primary-rgb), 0.1)` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative z-10 flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <motion.div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl',
              `bg-gradient-to-br ${colors.bg}`,
              'shadow-lg'
            )}
            animate={player.status !== 'ready' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {player.name.charAt(0).toUpperCase()}
          </motion.div>
          
          {/* Status badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              'absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center',
              'border-2 border-background',
              player.status === 'ready' ? 'bg-green-500' : 'bg-yellow-500'
            )}
          >
            {player.status === 'ready' ? (
              <span className="text-xs text-white">✓</span>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
              />
            )}
          </motion.div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">#{player.uid}</span>
            {!player.isBot && (
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                YOU
              </span>
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

        {/* Status */}
        <div className={cn(
          'px-3 py-1.5 rounded-full text-xs font-semibold',
          player.status === 'ready'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        )}>
          {player.status === 'ready' ? 'Ready' : 'Joining...'}
        </div>
      </div>
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
    const timer = setInterval(() => setSearchTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg">Finding Match</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(searchTime)}</span>
                  <span className="text-border">•</span>
                  <motion.div 
                    className="flex items-center gap-1 text-green-400"
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <motion.div 
                      className="w-1.5 h-1.5 rounded-full bg-green-500"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    LIVE
                  </motion.div>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Online</p>
              <p className="font-bold text-foreground">{onlinePlayers.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Radar Animation */}
        <RadarPulse />

        {/* Match Info */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-2">
              <Zap className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-xs text-muted-foreground">Entry Fee</p>
            <p className="text-2xl font-display font-bold text-foreground">₹{entryAmount}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-2">
              <Crown className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground">Win Prize</p>
            <p className="text-2xl font-display font-bold text-green-400">₹{rewardAmount}</p>
          </motion.div>
        </div>

        {/* Players Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Players ({readyCount}/{totalPlayers})
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <Shield className="w-3.5 h-3.5" />
              Secure Match
            </div>
          </div>

          <div className="space-y-3">
            {slots.map((player, idx) => (
              <PlayerSlot 
                key={idx} 
                player={player || undefined} 
                index={idx}
                totalPlayers={totalPlayers}
              />
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-green-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(readyCount / totalPlayers) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-lg shadow-green-500/30"
                >
                  <Sparkles className="w-5 h-5" />
                  Starting Game...
                </motion.div>
              </motion.div>
            ) : (
              <motion.p
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm text-muted-foreground"
              >
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Matching you with nearby players...
                </motion.span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MatchmakingScreen;
export { BOT_NAMES };
