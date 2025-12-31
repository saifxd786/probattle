import { motion } from 'framer-motion';
import { Users, Loader2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  name: string;
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
  'Vikram', 'Suresh', 'Deepak', 'Rahul', 'Pradeep', 'Mohit', 'Ankur'
];

const COLORS = {
  red: { bg: 'from-red-500 to-red-700', border: 'border-red-400', text: 'text-red-400' },
  green: { bg: 'from-green-500 to-green-700', border: 'border-green-400', text: 'text-green-400' },
  yellow: { bg: 'from-yellow-500 to-yellow-700', border: 'border-yellow-400', text: 'text-yellow-400' },
  blue: { bg: 'from-blue-500 to-blue-700', border: 'border-blue-400', text: 'text-blue-400' }
};

const PlayerSlot = ({ player, index, total }: { player?: Player; index: number; total: number }) => {
  const colorKeys = ['red', 'green', 'yellow', 'blue'];
  const colorKey = colorKeys[index] as keyof typeof COLORS;
  const colors = COLORS[colorKey];

  // Calculate position in circle
  const angle = (index / total) * 360 - 90;
  const radius = total === 2 ? 80 : 100;
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.2, type: 'spring', stiffness: 200 }}
      className="absolute"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <div
        className={cn(
          'relative w-20 h-20 rounded-full flex items-center justify-center',
          player ? `bg-gradient-to-br ${colors.bg} shadow-lg` : 'bg-gray-800/50 border-2 border-dashed border-gray-600'
        )}
      >
        {player ? (
          <>
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              {player.avatar ? (
                <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Status indicator */}
            {player.status === 'ready' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center"
              >
                <Loader2 className="w-3 h-3 text-white" />
              </motion.div>
            )}

            {/* Name tag */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <p className="text-xs font-medium text-white bg-black/50 px-2 py-0.5 rounded-full">
                {player.name}
              </p>
            </div>
          </>
        ) : (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

const MatchmakingScreen = ({ players, totalPlayers, entryAmount, rewardAmount }: MatchmakingScreenProps) => {
  const slots = Array.from({ length: totalPlayers }, (_, i) => players[i] || null);
  const allReady = players.length === totalPlayers && players.every(p => p.status === 'ready');

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: 'radial-gradient(circle at center, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
      }}
    >
      {/* Background animation */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-yellow-500/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 relative z-10"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex p-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/10 mb-4"
        >
          <Crown className="w-10 h-10 text-yellow-500" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Finding Match</h1>
        <p className="text-gray-400">
          <span className="text-yellow-500 font-bold">{players.length}</span>
          <span className="text-gray-500">/</span>
          <span className="text-white">{totalPlayers}</span> players found
        </p>
      </motion.div>

      {/* Players Circle */}
      <div className="relative w-64 h-64 flex items-center justify-center mb-8">
        {/* Center VS or Prize */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute z-10 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-2xl"
          style={{
            boxShadow: '0 0 40px rgba(255,165,0,0.4)',
          }}
        >
          <div className="text-center">
            <p className="text-[10px] text-white/80 uppercase tracking-wide">Prize</p>
            <p className="text-xl font-bold text-white">₹{rewardAmount}</p>
          </div>
        </motion.div>

        {/* Player slots in circle */}
        {slots.map((player, idx) => (
          <PlayerSlot key={idx} player={player || undefined} index={idx} total={totalPlayers} />
        ))}

        {/* Connecting lines animation */}
        <svg className="absolute inset-0 w-full h-full" style={{ transform: 'translate(50%, 50%)' }}>
          {slots.map((_, i) => {
            const nextIdx = (i + 1) % totalPlayers;
            const angle1 = (i / totalPlayers) * 360 - 90;
            const angle2 = (nextIdx / totalPlayers) * 360 - 90;
            const radius = totalPlayers === 2 ? 80 : 100;
            const x1 = Math.cos((angle1 * Math.PI) / 180) * radius;
            const y1 = Math.sin((angle1 * Math.PI) / 180) * radius;
            const x2 = Math.cos((angle2 * Math.PI) / 180) * radius;
            const y2 = Math.sin((angle2 * Math.PI) / 180) * radius;

            return (
              <motion.line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,165,0,0.2)"
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: i * 0.2 }}
              />
            );
          })}
        </svg>
      </div>

      {/* Match Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-6 mb-6"
      >
        <div className="text-center px-6 py-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Entry</p>
          <p className="text-xl font-bold text-white">₹{entryAmount}</p>
        </div>
        <div className="text-center px-6 py-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30">
          <p className="text-xs text-green-400 uppercase tracking-wide">Win</p>
          <p className="text-xl font-bold text-green-400">₹{rewardAmount}</p>
        </div>
      </motion.div>

      {/* Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center"
      >
        {allReady ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 text-green-400 font-medium"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              🎮
            </motion.span>
            Starting game...
          </motion.div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Users className="w-4 h-4" />
            </motion.div>
            <span>Waiting for players...</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MatchmakingScreen;
export { BOT_NAMES };
