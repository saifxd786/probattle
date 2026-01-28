import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Clock, Gamepad2, Globe, Search, Trophy, User } from 'lucide-react';
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

// Compact player card for bottom corners
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
  const bgColor = isLeft ? '#DC2626' : '#16A34A'; // Red for left, Green for right
  
  if (!player || isSearching) {
    return (
      <motion.div
        className={`flex items-center gap-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: `${bgColor}40`,
            border: `2px dashed ${bgColor}80`,
          }}
        >
          <Search className="w-4 h-4" style={{ color: bgColor }} />
        </div>
        <div className={`text-xs ${isLeft ? 'text-left' : 'text-right'}`}>
          <p className="text-white/50 font-medium">Searching...</p>
          <p className="text-white/30 text-[10px]">#?????</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm relative"
        style={{
          background: bgColor,
          boxShadow: `0 2px 8px ${bgColor}60`,
        }}
      >
        <span>{player.uid.slice(0, 1).toUpperCase()}</span>
        {/* Online indicator */}
        <div 
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900"
          style={{ background: '#22C55E' }}
        />
      </div>
      
      {/* Info */}
      <div className={`text-xs ${isLeft ? 'text-left' : 'text-right'}`}>
        <p className="text-white font-semibold">#{player.uid}</p>
        <div className="flex items-center gap-1 text-white/60 text-[10px]">
          <div 
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: bgColor }}
          />
          <span>Ready</span>
        </div>
      </div>
    </motion.div>
  );
};

// Circular timer component
const CircularTimer = ({ seconds }: { seconds: number }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (seconds % 60) / 60;
  
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      {/* Background circle */}
      <svg className="absolute w-full h-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="url(#timerGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.5 }}
        />
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Timer text */}
      <div className="text-center z-10">
        <p className="text-white font-bold text-lg leading-none">
          {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
        </p>
        <p className="text-white/50 text-[8px] uppercase tracking-wider">Time</p>
      </div>
    </div>
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

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
      }}
    >
      {/* Header Bar */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(15,23,42,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}
          >
            <Gamepad2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xs text-white tracking-wide">ONLINE MATCH</h1>
            <div className="flex items-center gap-1.5 text-[10px]">
              <motion.div 
                className="w-1.5 h-1.5 rounded-full bg-green-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-green-400 font-medium">LIVE</span>
              <span className="text-white/30">•</span>
              <Globe className="w-2.5 h-2.5 text-white/50" />
              <span className="text-white/50">{onlinePlayers.toLocaleString()} online</span>
            </div>
          </div>
        </div>
        
        {/* Prize Badge */}
        <div 
          className="px-3 py-1.5 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(234,179,8,0.2) 0%, rgba(161,98,7,0.2) 100%)',
            border: '1px solid rgba(234,179,8,0.3)',
          }}
        >
          <p className="text-[9px] text-yellow-500/70 uppercase tracking-wider">Win Prize</p>
          <p className="text-yellow-400 font-bold text-sm">₹{rewardAmount}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        
        {/* VS Badge */}
        <motion.div 
          className="mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              boxShadow: '0 0 30px rgba(245,158,11,0.4)',
            }}
          >
            <span className="text-white font-black text-xl">VS</span>
          </div>
        </motion.div>

        {/* Timer */}
        <CircularTimer seconds={searchTime} />

        {/* Searching Text */}
        <motion.div
          className="mt-4 mb-6"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-3.5 h-3.5 rounded-full border-2 border-green-500 border-t-transparent"
            />
            <span>Finding opponent...</span>
          </div>
        </motion.div>

        {/* Match Info Cards */}
        <div className="w-full max-w-xs space-y-2">
          <div 
            className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-white/70 text-xs">Game Mode</span>
            </div>
            <span className="text-white font-semibold text-xs">Classic 1v1</span>
          </div>
          
          <div 
            className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-blue-400" />
              <span className="text-white/70 text-xs">Entry Fee</span>
            </div>
            <span className="text-white font-semibold text-xs">₹{entryAmount}</span>
          </div>
        </div>
      </div>

      {/* Bottom Player Cards */}
      <div 
        className="px-4 py-4"
        style={{
          background: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left Player (You) */}
          <PlayerCard 
            player={players[0]} 
            position="left" 
            isSearching={!players[0]}
          />
          
          {/* Center Timer Badge */}
          <div 
            className="px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-semibold text-xs">
                {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          
          {/* Right Player (Opponent) */}
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
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-white text-sm"
                style={{
                  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
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
