import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Clock, Gamepad2, Globe, Search, Zap } from 'lucide-react';
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

// Simple radar animation
const SearchRadar = () => (
  <div className="relative w-32 h-32 mx-auto">
    {/* Pulse rings */}
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1.5, opacity: [0, 0.5, 0] }}
        transition={{
          duration: 2,
          delay: i * 0.6,
          repeat: Infinity,
          ease: 'easeOut'
        }}
      />
    ))}
    
    {/* Center orb */}
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <div 
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #64B5F6 0%, #1E88E5 50%, #1565C0 100%)',
          boxShadow: '0 0 40px rgba(33,150,243,0.5), inset 0 2px 8px rgba(255,255,255,0.3)',
        }}
      >
        <Search className="w-9 h-9 text-white" />
      </div>
    </motion.div>
  </div>
);

// Compact player card
const PlayerCard = ({ player, isOpponent }: { player?: Player; isOpponent?: boolean }) => {
  if (!player) {
    return (
      <motion.div
        className="flex flex-col items-center"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div 
          className="w-16 h-16 rounded-xl flex items-center justify-center mb-1.5"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '2px dashed rgba(255,255,255,0.3)',
          }}
        >
          <span className="text-2xl text-white/40">?</span>
        </div>
        <span className="text-xs text-white/50">???</span>
      </motion.div>
    );
  }

  const bgColor = isOpponent 
    ? 'linear-gradient(135deg, #43A047 0%, #2E7D32 100%)'
    : 'linear-gradient(135deg, #42A5F5 0%, #1565C0 100%)';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center"
    >
      <div 
        className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-1.5 relative overflow-hidden"
        style={{
          background: bgColor,
          boxShadow: `0 4px 16px ${isOpponent ? 'rgba(76,175,80,0.4)' : 'rgba(33,150,243,0.4)'}`,
        }}
      >
        {/* Shine overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%)',
          }}
        />
        <span className="relative z-10">{player.uid.slice(0, 1).toUpperCase()}</span>
      </div>
      <span className="text-xs text-white font-medium truncate max-w-[70px]">
        {player.uid}
      </span>
    </motion.div>
  );
};

const MatchmakingScreen = ({ players, totalPlayers, entryAmount, rewardAmount }: MatchmakingScreenProps) => {
  const [searchTime, setSearchTime] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState(2500);
  const allReady = players.length === totalPlayers && players.every(p => p.status === 'ready');

  useEffect(() => {
    const timer = setInterval(() => setSearchTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate fluctuating online count
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
    <div 
      className="min-h-screen pb-6"
      style={{
        background: 'linear-gradient(180deg, #1565C0 0%, #0D47A1 50%, #0A2472 100%)',
      }}
    >
      {/* Subtle pattern overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M20 20h-4v-4h4v4zm0 0h4v4h-4v-4z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <div 
        className="px-4 py-3"
        style={{
          background: 'rgba(21,101,192,0.9)',
          borderBottom: '1px solid rgba(66,165,245,0.2)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #42A5F5 0%, #1565C0 100%)',
              }}
            >
              <Gamepad2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm text-white tracking-wide">
                ONLINE MULTIPLAYER
              </h1>
              <div className="flex items-center gap-1.5 text-[10px]">
                <Clock className="w-2.5 h-2.5 text-blue-200/70" />
                <span className="text-blue-200/80">{formatTime(searchTime)}</span>
                <span className="text-blue-200/30">•</span>
                <div className="flex items-center gap-1">
                  <motion.div 
                    className="w-1.5 h-1.5 rounded-full bg-green-400"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-green-400 font-semibold">LIVE</span>
                </div>
              </div>
            </div>
          </div>
          
          <div 
            className="px-2.5 py-1.5 rounded-lg text-right"
            style={{
              background: 'rgba(76,175,80,0.15)',
              border: '1px solid rgba(76,175,80,0.3)',
            }}
          >
            <div className="flex items-center gap-1 text-green-400">
              <Globe className="w-3 h-3" />
              <span className="text-[10px] font-medium">Online</span>
            </div>
            <p className="font-bold text-white text-sm">{onlinePlayers.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-5 relative z-10">
        {/* Game Mode & Entry Card */}
        <div 
          className="p-3 rounded-xl"
          style={{
            background: 'rgba(33,150,243,0.15)',
            border: '1px solid rgba(66,165,245,0.3)',
          }}
        >
          <div className="flex items-center justify-around">
            <div className="text-center">
              <span className="text-[10px] text-blue-200/60 block">Game Mode</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Crown className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-white font-semibold text-sm">Classic</span>
              </div>
            </div>
            <div className="w-px h-8 bg-blue-400/20" />
            <div className="text-center">
              <span className="text-[10px] text-blue-200/60 block">Entry Amount</span>
              <span className="text-white font-bold text-sm">₹{entryAmount}</span>
            </div>
          </div>
        </div>

        {/* Search Animation */}
        <SearchRadar />

        {/* VS Players Section */}
        <div className="flex items-center justify-center gap-6">
          <PlayerCard player={players[0]} />
          
          <motion.span 
            className="text-2xl font-black text-yellow-400"
            style={{ textShadow: '0 0 10px rgba(255,193,7,0.4)' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            VS
          </motion.span>
          
          <PlayerCard player={players[1]} isOpponent />
        </div>

        {/* Timer Badge */}
        <div className="flex justify-center">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(76,175,80,0.15)',
              border: '1px solid rgba(76,175,80,0.3)',
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 rounded-full border-2 border-green-400 border-t-transparent"
            />
            <span className="text-white font-semibold text-sm">{formatTime(searchTime)}</span>
          </div>
        </div>

        {/* Searching Text */}
        <motion.div
          className="text-center"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="inline-flex items-center gap-2 text-blue-200/80 text-xs font-medium">
            <Search className="w-3.5 h-3.5" />
            SEARCHING FOR PLAYERS...
          </div>
        </motion.div>

        {/* Entry Fee & Prize Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            className="p-3 rounded-xl text-center relative overflow-hidden"
            style={{
              background: 'rgba(33,150,243,0.12)',
              border: '1px solid rgba(66,165,245,0.25)',
            }}
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
              style={{
                background: 'rgba(66,165,245,0.2)',
                border: '1px solid rgba(66,165,245,0.3)',
              }}
            >
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-[10px] text-blue-200/60 mb-0.5">Entry Fee</p>
            <p className="text-xl font-display font-bold text-white">₹{entryAmount}</p>
          </div>
          
          <div 
            className="p-3 rounded-xl text-center relative overflow-hidden"
            style={{
              background: 'rgba(76,175,80,0.12)',
              border: '1px solid rgba(76,175,80,0.25)',
            }}
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
              style={{
                background: 'rgba(76,175,80,0.2)',
                border: '1px solid rgba(76,175,80,0.3)',
              }}
            >
              <Crown className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-[10px] text-green-200/60 mb-0.5">Win Prize</p>
            <p 
              className="text-xl font-display font-bold"
              style={{
                background: 'linear-gradient(135deg, #66BB6A 0%, #A5D6A7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ₹{rewardAmount}
            </p>
          </div>
        </div>

        {/* Ready Status */}
        <AnimatePresence mode="wait">
          {allReady && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center pt-2"
            >
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{
                  background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                  boxShadow: '0 4px 20px rgba(76,175,80,0.4)',
                }}
              >
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
