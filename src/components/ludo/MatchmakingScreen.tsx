import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Clock, Gamepad2, Globe, Search, Trophy, Zap } from 'lucide-react';
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

// Player card component
const PlayerCard = ({ 
  player, 
  position,
  isSearching 
}: { 
  player?: Player; 
  position: 'left' | 'right';
  isSearching?: boolean;
}) => {
  const isLeft = position === 'left';
  
  if (!player || isSearching) {
    return (
      <motion.div
        className={`flex items-center gap-2.5 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-11 h-11 rounded-xl glass-card flex items-center justify-center border border-primary/30">
          <Search className="w-4 h-4 text-primary/60" />
        </div>
        <div className={`${isLeft ? 'text-left' : 'text-right'}`}>
          <p className="text-muted-foreground text-xs font-medium">Searching...</p>
          <p className="text-muted-foreground/50 text-[10px] font-mono">#?????</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-2.5 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div className="relative">
        <div 
          className="w-11 h-11 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
            boxShadow: 'var(--glow-blue)',
          }}
        >
          {player.uid.slice(0, 1).toUpperCase()}
        </div>
        {/* Online dot */}
        <motion.div 
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>
      
      {/* Info */}
      <div className={`${isLeft ? 'text-left' : 'text-right'}`}>
        <p className="text-foreground font-semibold text-xs font-mono">#{player.uid}</p>
        <div className="flex items-center gap-1 text-green-400 text-[10px]">
          <Zap className="w-2.5 h-2.5" />
          <span>Ready</span>
        </div>
      </div>
    </motion.div>
  );
};

// Animated search pulse
const SearchPulse = () => (
  <div className="relative w-28 h-28">
    {/* Pulse rings */}
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full border border-primary/40"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1.4, opacity: [0, 0.6, 0] }}
        transition={{
          duration: 2.5,
          delay: i * 0.7,
          repeat: Infinity,
          ease: 'easeOut'
        }}
      />
    ))}
    
    {/* Center VS badge */}
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center neon-glow"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--neon-cyan) / 1) 100%)',
        }}
      >
        <span className="text-primary-foreground font-black text-xl tracking-tight">VS</span>
      </div>
    </motion.div>
  </div>
);

const MatchmakingScreen = ({ players, totalPlayers, entryAmount, rewardAmount }: MatchmakingScreenProps) => {
  const [searchTime, setSearchTime] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState(2500);
  const allReady = players.length === totalPlayers && players.every(p => p.status === 'ready');

  useEffect(() => {
    const timer = setInterval(() => setSearchTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlinePlayers(prev => {
        const change = Math.floor(Math.random() * 20) - 10;
        return Math.max(2000, Math.min(3500, prev + change));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background cyber-grid">
      {/* Header */}
      <div className="px-4 py-3 glass-card rounded-none border-x-0 border-t-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--neon-cyan) / 1) 100%)',
              }}
            >
              <Gamepad2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xs text-foreground tracking-wider">
                ONLINE MATCH
              </h1>
              <div className="flex items-center gap-1.5 text-[10px]">
                <motion.div 
                  className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-live"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-green-400 font-semibold">LIVE</span>
                <span className="text-muted-foreground/30">•</span>
                <Globe className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-muted-foreground">{onlinePlayers.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          {/* Prize Badge */}
          <div className="glass-card px-3 py-1.5 rounded-lg gradient-border">
            <p className="text-[9px] text-primary/70 uppercase tracking-wider font-medium">Prize</p>
            <p className="text-gradient font-bold text-sm font-display">₹{rewardAmount}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 space-y-6">
        
        {/* Search Animation */}
        <SearchPulse />

        {/* Timer */}
        <div className="text-center">
          <motion.p 
            className="text-3xl font-display font-bold text-foreground"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {formatTime(searchTime)}
          </motion.p>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-1">
            Search Time
          </p>
        </div>

        {/* Searching Status */}
        <motion.div
          className="flex items-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent"
          />
          <span className="text-muted-foreground text-xs">Finding opponent...</span>
        </motion.div>

        {/* Info Cards */}
        <div className="w-full max-w-xs space-y-2">
          <div className="glass-card flex items-center justify-between px-4 py-3 rounded-xl">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-muted-foreground text-xs">Mode</span>
            </div>
            <span className="text-foreground font-semibold text-xs">Classic 1v1</span>
          </div>
          
          <div className="glass-card flex items-center justify-between px-4 py-3 rounded-xl">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground text-xs">Entry</span>
            </div>
            <span className="text-foreground font-semibold text-xs">₹{entryAmount}</span>
          </div>
        </div>
      </div>

      {/* Bottom Players Section */}
      <div className="glass-card px-4 py-4 rounded-none border-x-0 border-b-0">
        <div className="flex items-center justify-between">
          {/* Left Player */}
          <PlayerCard 
            player={players[0]} 
            position="left" 
            isSearching={!players[0]}
          />
          
          {/* Center Timer */}
          <div className="glass-card px-3 py-1.5 rounded-full border border-primary/20">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-primary" />
              <span className="text-primary font-mono font-semibold text-xs">
                {formatTime(searchTime)}
              </span>
            </div>
          </div>
          
          {/* Right Player */}
          <PlayerCard 
            player={players[1]} 
            position="right"
            isSearching={!players[1]}
          />
        </div>
        
        {/* Ready Status */}
        <AnimatePresence mode="wait">
          {allReady && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-primary-foreground text-sm neon-glow"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--neon-cyan) / 1) 100%)',
                }}
              >
                <Zap className="w-4 h-4" />
                Starting Game...
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MatchmakingScreen;
export { BOT_NAMES };
