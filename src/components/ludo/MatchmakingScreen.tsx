import { motion } from 'framer-motion';
import { Users, Loader2 } from 'lucide-react';
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

const StatusBadge = ({ status }: { status: Player['status'] }) => {
  const statusConfig = {
    searching: { text: 'Searching...', color: 'text-yellow-400', animate: true },
    connecting: { text: 'Connecting...', color: 'text-blue-400', animate: true },
    ready: { text: 'Ready', color: 'text-green-400', animate: false }
  };

  const config = statusConfig[status];

  return (
    <span className={cn('text-xs font-medium', config.color, config.animate && 'animate-pulse')}>
      {config.text}
    </span>
  );
};

const PlayerSlot = ({ player, index }: { player?: Player; index: number }) => {
  const colors = ['red', 'green', 'yellow', 'blue'];
  const colorClasses = {
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30'
  };

  const color = colors[index] as keyof typeof colorClasses;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.2 }}
      className={cn(
        'relative p-4 rounded-xl border bg-gradient-to-br',
        colorClasses[color]
      )}
    >
      {player ? (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
            {player.avatar ? (
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-white">
                {player.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{player.name}</p>
            <StatusBadge status={player.status} />
          </div>
          {player.status === 'ready' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
            >
              <span className="text-white text-xs">✓</span>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center animate-pulse">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-muted-foreground">Finding player...</p>
            <span className="text-xs text-muted-foreground/70">Searching</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const MatchmakingScreen = ({ players, totalPlayers, entryAmount, rewardAmount }: MatchmakingScreenProps) => {
  const slots = Array.from({ length: totalPlayers }, (_, i) => players[i] || null);
  const allReady = players.length === totalPlayers && players.every(p => p.status === 'ready');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-flex p-4 rounded-full bg-primary/10 mb-4"
          >
            <Users className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="font-display text-2xl font-bold mb-2">Finding Match</h1>
          <p className="text-muted-foreground">
            {players.length}/{totalPlayers} players found
          </p>
        </div>

        {/* Match Info */}
        <div className="glass-card p-4 rounded-xl mb-6">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Entry</p>
              <p className="font-bold text-lg">₹{entryAmount}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Reward</p>
              <p className="font-bold text-lg text-green-400">₹{rewardAmount}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Players</p>
              <p className="font-bold text-lg">{totalPlayers}</p>
            </div>
          </div>
        </div>

        {/* Player Slots */}
        <div className="space-y-3 mb-6">
          {slots.map((player, idx) => (
            <PlayerSlot key={idx} player={player || undefined} index={idx} />
          ))}
        </div>

        {/* Status */}
        <div className="text-center">
          {allReady ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-400 font-medium"
            >
              Starting match...
            </motion.div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for players...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MatchmakingScreen;
export { BOT_NAMES };