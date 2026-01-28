import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Wifi, Shield, Clock, Zap, Gamepad2, Sparkles, Signal, Globe } from 'lucide-react';
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
    gradient: 'linear-gradient(135deg, #EF5350 0%, #C62828 50%, #8B0000 100%)',
    bgLight: 'linear-gradient(135deg, rgba(239,83,80,0.15) 0%, rgba(198,40,40,0.08) 100%)',
    glow: 'rgba(239,83,80,0.4)',
    text: '#EF5350',
    border: 'rgba(239,83,80,0.4)'
  },
  green: { 
    gradient: 'linear-gradient(135deg, #66BB6A 0%, #388E3C 50%, #1B5E20 100%)',
    bgLight: 'linear-gradient(135deg, rgba(102,187,106,0.15) 0%, rgba(56,142,60,0.08) 100%)',
    glow: 'rgba(76,175,80,0.4)',
    text: '#66BB6A',
    border: 'rgba(102,187,106,0.4)'
  },
  yellow: { 
    gradient: 'linear-gradient(135deg, #FFEE58 0%, #FBC02D 50%, #F57F17 100%)',
    bgLight: 'linear-gradient(135deg, rgba(255,238,88,0.15) 0%, rgba(251,192,45,0.08) 100%)',
    glow: 'rgba(255,193,7,0.4)',
    text: '#FFCA28',
    border: 'rgba(255,202,40,0.4)'
  },
  blue: { 
    gradient: 'linear-gradient(135deg, #42A5F5 0%, #1976D2 50%, #0D47A1 100%)',
    bgLight: 'linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(25,118,210,0.08) 100%)',
    glow: 'rgba(33,150,243,0.4)',
    text: '#42A5F5',
    border: 'rgba(66,165,245,0.4)'
  }
};

// Premium Radar/pulse animation component
const PremiumRadarPulse = () => (
  <div className="relative w-36 h-36 mx-auto mb-8">
    {/* Outer scanning rings */}
    {[0, 1, 2, 3].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full"
        style={{
          border: '2px solid',
          borderColor: `rgba(255,215,0,${0.4 - i * 0.1})`,
        }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1.8 + i * 0.25, opacity: [0, 0.6, 0] }}
        transition={{
          duration: 2.5,
          delay: i * 0.5,
          repeat: Infinity,
          ease: 'easeOut'
        }}
      />
    ))}
    
    {/* Center glowing orb */}
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div 
        className="w-24 h-24 rounded-full flex items-center justify-center relative"
        style={{
          background: 'linear-gradient(180deg, #FFE082 0%, #FFD54F 25%, #FFCA28 50%, #FFB300 75%, #FF8F00 100%)',
          boxShadow: '0 0 50px rgba(255,193,7,0.5), 0 0 100px rgba(255,152,0,0.3), inset 0 2px 10px rgba(255,255,255,0.5)',
        }}
      >
        {/* Inner reflection */}
        <div 
          className="absolute inset-2 rounded-full opacity-30"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 50%)',
          }}
        />
        <Gamepad2 className="w-12 h-12 text-amber-900 drop-shadow-lg relative z-10" />
      </div>
    </motion.div>
    
    {/* Rotating orbital dots */}
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
    >
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <motion.div
          key={angle}
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: `rotate(${angle}deg) translateY(-55px) translateX(-50%)`,
            background: 'linear-gradient(135deg, #FFD54F 0%, #FF8F00 100%)',
            boxShadow: '0 0 10px rgba(255,193,7,0.8)',
          }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.8, delay: angle / 360, repeat: Infinity }}
        />
      ))}
    </motion.div>
    
    {/* Scanning line */}
    <motion.div
      className="absolute inset-0 rounded-full overflow-hidden"
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    >
      <div 
        className="absolute top-1/2 left-1/2 w-1/2 h-1"
        style={{
          background: 'linear-gradient(90deg, rgba(255,215,0,0.8) 0%, transparent 100%)',
          transformOrigin: 'left center',
        }}
      />
    </motion.div>
  </div>
);

// Premium Player slot component
const PremiumPlayerSlot = ({ player, index, totalPlayers }: { 
  player?: Player; 
  index: number;
  totalPlayers: number;
}) => {
  const colorKeys = ['red', 'green', 'yellow', 'blue'];
  const colorKey = colorKeys[index] as keyof typeof COLORS;
  const colors = COLORS[colorKey];
  const [ping] = useState(Math.floor(Math.random() * 25) + 12);

  if (!player) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: index * 0.12, type: 'spring', stiffness: 200 }}
        className="relative p-4 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(40,38,35,0.6) 0%, rgba(30,28,25,0.5) 100%)',
          border: '2px dashed rgba(255,255,255,0.15)',
        }}
      >
        <div className="flex items-center gap-4">
          <motion.div 
            className="w-14 h-14 rounded-full flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, rgba(60,55,50,0.8) 0%, rgba(45,40,35,0.6) 100%)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Users className="w-6 h-6 text-white/30" />
            
            {/* Scanning ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid rgba(255,215,0,0.3)' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <motion.span 
                className="text-sm text-white/50 font-medium"
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Searching
              </motion.span>
              <motion.div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgba(255,215,0,0.6)' }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 0.7, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </motion.div>
            </div>
            <span 
              className="text-xs font-semibold capitalize"
              style={{ color: colors.text }}
            >
              {colorKey} Player
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: -30 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200, damping: 18 }}
      className="relative p-4 rounded-2xl overflow-hidden"
      style={{
        background: colors.bgLight,
        border: `2px solid ${colors.border}`,
        boxShadow: player.status === 'ready' ? `0 0 30px ${colors.glow}` : 'none',
      }}
    >
      {/* Animated border glow for ready players */}
      {player.status === 'ready' && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ 
            boxShadow: `inset 0 0 25px ${colors.glow}`,
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative z-10 flex items-center gap-4">
        {/* Premium Avatar */}
        <div className="relative">
          <motion.div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-xl relative"
            style={{
              background: colors.gradient,
              boxShadow: `0 4px 20px ${colors.glow}, inset 0 2px 4px rgba(255,255,255,0.3)`,
            }}
            animate={player.status !== 'ready' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {/* Highlight */}
            <div 
              className="absolute inset-1 rounded-full opacity-30 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 50%)',
              }}
            />
            <span className="relative z-10 drop-shadow-lg">{player.name.charAt(0).toUpperCase()}</span>
          </motion.div>
          
          {/* Status badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400 }}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: player.status === 'ready' 
                ? 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)'
                : 'linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)',
              boxShadow: player.status === 'ready'
                ? '0 2px 10px rgba(76,175,80,0.5)'
                : '0 2px 10px rgba(255,152,0,0.5)',
              border: '2px solid rgba(0,0,0,0.3)',
            }}
          >
            {player.status === 'ready' ? (
              <span className="text-[10px] text-white font-black">✓</span>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
              />
            )}
          </motion.div>
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">#{player.uid}</span>
            {!player.isBot && (
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full font-black tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #FFD54F 0%, #FF8F00 100%)',
                  color: '#5D4037',
                  boxShadow: '0 2px 8px rgba(255,152,0,0.4)',
                }}
              >
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span 
              className="text-xs font-bold capitalize"
              style={{ color: colors.text }}
            >
              {colorKey}
            </span>
            {player.status === 'ready' && (
              <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
                <Signal className="w-3 h-3" />
                {ping}ms
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div 
          className="px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: player.status === 'ready'
              ? 'linear-gradient(135deg, rgba(76,175,80,0.2) 0%, rgba(46,125,50,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(255,193,7,0.2) 0%, rgba(255,143,0,0.15) 100%)',
            border: player.status === 'ready'
              ? '1px solid rgba(76,175,80,0.4)'
              : '1px solid rgba(255,193,7,0.4)',
            color: player.status === 'ready' ? '#4CAF50' : '#FFC107',
          }}
        >
          {player.status === 'ready' ? '✓ Ready' : 'Joining...'}
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
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, rgba(20,18,15,1) 0%, rgba(12,10,8,1) 100%)',
      }}
    >
      {/* Premium Header */}
      <div 
        className="sticky top-0 z-10"
        style={{
          background: 'linear-gradient(180deg, rgba(30,28,25,0.98) 0%, rgba(25,23,20,0.95) 100%)',
          borderBottom: '1px solid rgba(255,215,0,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center relative"
                style={{
                  background: 'linear-gradient(135deg, #FFD54F 0%, #FF8F00 100%)',
                  boxShadow: '0 4px 15px rgba(255,152,0,0.4)',
                }}
              >
                <Gamepad2 className="w-5 h-5 text-amber-900" />
              </div>
              <div>
                <h1 
                  className="font-display font-black text-lg tracking-wide"
                  style={{
                    background: 'linear-gradient(135deg, #FFE082 0%, #FFD54F 50%, #FF8F00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Finding Match
                </h1>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3 text-white/50" />
                  <span className="text-white/60 font-medium">{formatTime(searchTime)}</span>
                  <span className="text-white/20">•</span>
                  <motion.div 
                    className="flex items-center gap-1"
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <motion.div 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: '#4CAF50' }}
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-green-400 font-bold">LIVE</span>
                  </motion.div>
                </div>
              </div>
            </div>
            
            <div 
              className="text-right px-3 py-2 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(46,125,50,0.1) 100%)',
                border: '1px solid rgba(76,175,80,0.3)',
              }}
            >
              <div className="flex items-center gap-1.5 text-green-400">
                <Globe className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Online</span>
              </div>
              <p className="font-black text-white">{onlinePlayers.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Radar Animation */}
        <PremiumRadarPulse />

        {/* Premium Match Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(239,83,80,0.12) 0%, rgba(198,40,40,0.08) 100%)',
              border: '2px solid rgba(239,83,80,0.3)',
              boxShadow: '0 4px 20px rgba(239,83,80,0.15)',
            }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
            
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(239,83,80,0.3) 0%, rgba(198,40,40,0.2) 100%)',
                border: '1px solid rgba(239,83,80,0.4)',
              }}
            >
              <Zap className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-xs text-white/50 font-medium mb-1">Entry Fee</p>
            <p 
              className="text-3xl font-display font-black"
              style={{
                background: 'linear-gradient(135deg, #EF5350 0%, #FFCDD2 50%, #EF5350 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ₹{entryAmount}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(76,175,80,0.12) 0%, rgba(46,125,50,0.08) 100%)',
              border: '2px solid rgba(76,175,80,0.3)',
              boxShadow: '0 4px 20px rgba(76,175,80,0.15)',
            }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, delay: 0.5, repeat: Infinity, repeatDelay: 2 }}
            />
            
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(76,175,80,0.3) 0%, rgba(46,125,50,0.2) 100%)',
                border: '1px solid rgba(76,175,80,0.4)',
              }}
            >
              <Crown className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-xs text-white/50 font-medium mb-1">Win Prize</p>
            <p 
              className="text-3xl font-display font-black"
              style={{
                background: 'linear-gradient(135deg, #4CAF50 0%, #A5D6A7 50%, #4CAF50 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ₹{rewardAmount}
            </p>
          </motion.div>
        </div>

        {/* Players Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div 
                className="p-1.5 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Users className="w-4 h-4 text-white/60" />
              </div>
              <span className="text-sm font-bold text-white">
                Players ({readyCount}/{totalPlayers})
              </span>
            </div>
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(46,125,50,0.1) 100%)',
                border: '1px solid rgba(76,175,80,0.3)',
                color: '#4CAF50',
              }}
            >
              <Shield className="w-3.5 h-3.5" />
              Secure Match
            </div>
          </div>

          <div className="space-y-3">
            {slots.map((player, idx) => (
              <PremiumPlayerSlot 
                key={idx} 
                player={player || undefined} 
                index={idx}
                totalPlayers={totalPlayers}
              />
            ))}
          </div>
        </div>

        {/* Premium Progress Bar */}
        <div className="space-y-4">
          <div 
            className="h-3 rounded-full overflow-hidden relative"
            style={{
              background: 'linear-gradient(180deg, rgba(40,38,35,0.8) 0%, rgba(30,28,25,0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            <motion.div
              className="h-full relative"
              style={{
                background: 'linear-gradient(90deg, #FFD54F 0%, #4CAF50 50%, #2E7D32 100%)',
                boxShadow: '0 0 20px rgba(76,175,80,0.5)',
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${(readyCount / totalPlayers) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
              />
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {allReady ? (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-white relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 50%, #1B5E20 100%)',
                    boxShadow: '0 8px 30px rgba(76,175,80,0.5), inset 0 2px 4px rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                    }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <Sparkles className="w-6 h-6 relative z-10" />
                  <span className="relative z-10 tracking-wide">Starting Game...</span>
                </motion.div>
              </motion.div>
            ) : (
              <motion.p
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <motion.span
                  className="text-sm text-white/50 font-medium"
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
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
