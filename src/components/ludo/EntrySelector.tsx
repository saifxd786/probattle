import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Coins, Users } from 'lucide-react';

interface EntrySelectorProps {
  amounts: number[];
  selectedAmount: number;
  onSelect: (amount: number) => void;
  rewardMultiplier: number;
  playerMode: 2 | 4;
  onPlayerModeChange: (mode: 2 | 4) => void;
}

const EntrySelector = ({ 
  amounts, 
  selectedAmount, 
  onSelect, 
  rewardMultiplier,
  playerMode,
  onPlayerModeChange
}: EntrySelectorProps) => {
  const rewardAmount = selectedAmount * rewardMultiplier;

  return (
    <div className="space-y-6">
      {/* Player Mode Selection */}
      <div>
        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Select Mode
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[2, 4].map((mode) => (
            <motion.button
              key={mode}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPlayerModeChange(mode as 2 | 4)}
              className={cn(
                'p-4 rounded-xl border-2 transition-all',
                playerMode === mode
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <p className="font-bold text-lg">{mode} Players</p>
              <p className="text-xs text-muted-foreground">
                {mode === 2 ? '1v1 Match' : '4-Player Battle'}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Entry Amount Selection */}
      <div>
        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Coins className="w-4 h-4" />
          Select Entry Amount
        </p>
        <div className="grid grid-cols-2 gap-3">
          {amounts.map((amount, idx) => (
            <motion.button
              key={amount}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(amount)}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all overflow-hidden',
                selectedAmount === amount
                  ? 'border-primary bg-gradient-to-br from-primary/20 to-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              {selectedAmount === amount && (
                <motion.div
                  layoutId="selectedEntry"
                  className="absolute inset-0 bg-primary/10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <p className="font-bold text-2xl">₹{amount}</p>
                <p className="text-xs text-muted-foreground mt-1">Entry</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reward Preview */}
      <motion.div
        key={selectedAmount}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-4 rounded-xl text-center"
      >
        <p className="text-sm text-muted-foreground mb-1">Win & Get</p>
        <p className="text-3xl font-bold text-green-400">₹{rewardAmount}</p>
        <p className="text-xs text-muted-foreground mt-1">{rewardMultiplier}x Reward</p>
      </motion.div>
    </div>
  );
};

export default EntrySelector;