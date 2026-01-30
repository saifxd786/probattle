import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Clock, Gamepad2, Search, Trophy, Zap, Users } from 'lucide-react';
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

// Indian Male Names (Hindu + Muslim mix) - Only boys names
const BOT_NAMES = [
  // Hindu Names
  'Aman', 'Rohit', 'Kunal', 'Arjun', 'Vikram', 'Rahul', 'Deepak', 'Mohit',
  'Ankur', 'Rajesh', 'Suresh', 'Karan', 'Varun', 'Nikhil', 'Aditya', 'Manish',
  'Sachin', 'Vikas', 'Gaurav', 'Harsh', 'Ravi', 'Amit', 'Sanjay', 'Akash',
  // Muslim Names
  'Imran', 'Aamir', 'Farhan', 'Zaid', 'Arman', 'Salman', 'Asif', 'Faisal',
  'Rizwan', 'Irfan', 'Danish', 'Nadeem', 'Tariq', 'Wasim', 'Shahid', 'Junaid',
  'Ayaan', 'Rehan', 'Saif', 'Kabir', 'Ayan', 'Bilal', 'Hamza', 'Yusuf'
];

// Player card component - Flat design with Avatar
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
        className={`flex items-center gap-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-10 h-10 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center">
          <Search className="w-4 h-4 text-gray-500" />
        </div>
        <div className={`${isLeft ? 'text-left' : 'text-right'}`}>
          <p className="text-gray-500 text-xs font-medium">Searching...</p>
          <p className="text-gray-600 text-[10px]">ProBattle</p>
        </div>
      </motion.div>
    );
  }

  const colorMap: Record<string, string> = {
    red: '#E53935',
    green: '#43A047', 
    yellow: '#FFD600',
    blue: '#1E88E5'
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div className="relative">
        {player.avatar ? (
          <img 
            src={player.avatar}
            alt={player.name}
            className="w-10 h-10 rounded-xl object-cover border-2"
            style={{
              borderColor: colorMap[player.color],
            }}
          />
        ) : (
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm border-2"
            style={{
              background: `linear-gradient(135deg, ${colorMap[player.color]}dd, ${colorMap[player.color]}88)`,
              borderColor: colorMap[player.color],
            }}
          >
            {/* Show initials as fallback */}
            {player.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        {/* Online dot */}
        <motion.div 
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0A0A0F]"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>
      
      {/* Info */}
      <div className={`${isLeft ? 'text-left' : 'text-right'}`}>
        <p className="text-white font-semibold text-xs">{player.name}</p>
        <div className="flex items-center gap-1 text-green-400 text-[10px]">
          <Zap className="w-2.5 h-2.5" />
          <span>Ready</span>
        </div>
      </div>
    </motion.div>
  );
};

// Animated search pulse - Flat design
const SearchPulse = () => (
  <div className="relative w-24 h-24">
    {/* Pulse rings */}
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full border border-indigo-500/30"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1.4, opacity: [0, 0.5, 0] }}
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
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        }}
      >
        <span className="text-white font-black text-lg tracking-tight">VS</span>
      </div>
    </motion.div>
  </div>
);

const MatchmakingScreen = ({ players, totalPlayers, entryAmount, rewardAmount }: MatchmakingScreenProps) => {
  const [searchTime, setSearchTime] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState(2500);
  const allReady = players.length === totalPlayers && players.every(p => p.status === 'ready');
  const is4Player = totalPlayers === 4;

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
    <div className="h-screen flex flex-col bg-[#0A0A0F] relative overflow-hidden">
      {/* Subtle gradient background */}
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

      {/* Dot pattern overlay */}
      <div 
        className="fixed inset-0 -z-[5] opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              }}
            >
              <Gamepad2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide">
                {is4Player ? '4 PLAYER MATCH' : 'ONLINE MATCH'}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px]">
                <motion.div 
                  className="w-1.5 h-1.5 rounded-full bg-green-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-green-400 font-semibold">LIVE</span>
                <span className="text-gray-600">•</span>
                <Users className="w-2.5 h-2.5 text-gray-500" />
                <span className="text-gray-500">{onlinePlayers.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          {/* Premium Prize Badge */}
          <motion.div 
            className="relative overflow-hidden"
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Outer glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-500/30 rounded-xl blur-sm" />
            
            {/* Main badge container */}
            <div 
              className="relative px-4 py-2 rounded-xl border-2"
              style={{
                background: 'linear-gradient(135deg, rgba(180, 130, 60, 0.25) 0%, rgba(120, 80, 40, 0.35) 100%)',
                borderColor: 'rgba(212, 175, 55, 0.6)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              {/* Inner shine effect */}
              <div 
                className="absolute inset-0 rounded-xl opacity-30"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)'
                }}
              />
              
              {/* Content */}
              <div className="relative text-center">
                <p 
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: 'rgba(212, 175, 55, 0.9)' }}
                >
                  Prize
                </p>
                <p 
                  className="font-bold text-base leading-tight"
                  style={{ 
                    color: '#F5D77A',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                  }}
                >
                  ₹{rewardAmount}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 space-y-5">
        
        {/* Search Animation */}
        <SearchPulse />

        {/* Timer */}
        <div className="text-center">
          <motion.p 
            className="text-3xl font-bold text-white font-mono"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {formatTime(searchTime)}
          </motion.p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">
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
            className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent"
          />
          <span className="text-gray-400 text-xs">
            {is4Player 
              ? `Finding players... (${players.length}/${totalPlayers})`
              : 'Finding opponent...'
            }
          </span>
        </motion.div>

        {/* Info Cards */}
        <div className="w-full max-w-xs space-y-2">
          <div className="bg-gray-900/50 border border-gray-800 flex items-center justify-between px-4 py-3 rounded-xl">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-gray-400 text-xs">Mode</span>
            </div>
            <span className="text-white font-semibold text-xs">
              {is4Player ? '4 Player Battle' : 'Classic 1v1'}
            </span>
          </div>
          
          <div className="bg-gray-900/50 border border-gray-800 flex items-center justify-between px-4 py-3 rounded-xl">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-indigo-400" />
              <span className="text-gray-400 text-xs">Entry</span>
            </div>
            <span className="text-white font-semibold text-xs">₹{entryAmount}</span>
          </div>
        </div>
      </div>

      {/* Bottom Players Section - Updated for 4 players */}
      <div className="px-4 py-4 border-t border-gray-800/50 bg-gray-900/30">
        {is4Player ? (
          // 4 Player Grid Layout
          <div className="space-y-3">
            {/* Player slots in 2x2 grid */}
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((index) => {
                const player = players[index];
                const colorMap: Record<string, string> = {
                  red: '#E53935',
                  green: '#43A047', 
                  yellow: '#FFD600',
                  blue: '#1E88E5'
                };
                const colorOrder = ['red', 'green', 'yellow', 'blue'];
                const slotColor = colorOrder[index];
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 p-2 rounded-xl bg-gray-800/40 border"
                    style={{
                      borderColor: player ? colorMap[player.color] : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    {player ? (
                      <>
                        {player.avatar ? (
                          <img 
                            src={player.avatar}
                            alt={player.name}
                            className="w-8 h-8 rounded-lg object-cover border-2"
                            style={{ borderColor: colorMap[player.color] }}
                          />
                        ) : (
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs border-2"
                            style={{
                              background: `linear-gradient(135deg, ${colorMap[player.color]}dd, ${colorMap[player.color]}88)`,
                              borderColor: colorMap[player.color],
                            }}
                          >
                            {player.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-xs truncate">{player.name}</p>
                          <div className="flex items-center gap-1 text-green-400 text-[10px]">
                            <Zap className="w-2.5 h-2.5" />
                            <span>Ready</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <motion.div 
                          className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center"
                          animate={{ opacity: [0.4, 0.7, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Search className="w-3.5 h-3.5 text-gray-500" />
                        </motion.div>
                        <div className="flex-1">
                          <p className="text-gray-500 text-xs">Searching...</p>
                          <p className="text-gray-600 text-[10px]">
                            <span className="capitalize">{slotColor}</span> slot
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
            
            {/* Timer in center */}
            <div className="flex justify-center">
              <div className="bg-gray-800/60 border border-gray-700/50 px-3 py-1.5 rounded-full">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span className="text-indigo-400 font-mono font-semibold text-xs">
                    {formatTime(searchTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 2 Player Layout - Original
          <div className="flex items-center justify-between">
            <PlayerCard 
              player={players[0]} 
              position="left" 
              isSearching={!players[0]}
            />
            
            <div className="bg-gray-800/60 border border-gray-700/50 px-3 py-1.5 rounded-full">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span className="text-indigo-400 font-mono font-semibold text-xs">
                  {formatTime(searchTime)}
                </span>
              </div>
            </div>
            
            <PlayerCard 
              player={players[1]} 
              position="right"
              isSearching={!players[1]}
            />
          </div>
        )}
        
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
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
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
