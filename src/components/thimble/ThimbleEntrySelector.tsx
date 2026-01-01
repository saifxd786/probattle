import { motion } from 'framer-motion';
import { Wallet, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThimbleEntrySelectorProps {
  minAmount: number;
  selectedAmount: number;
  walletBalance: number;
  rewardMultiplier: number;
  onSelectAmount: (amount: number) => void;
  onStartGame: () => void;
}

const ENTRY_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const ThimbleEntrySelector = ({
  minAmount,
  selectedAmount,
  walletBalance,
  rewardMultiplier,
  onSelectAmount,
  onStartGame
}: ThimbleEntrySelectorProps) => {
  const rewardAmount = selectedAmount * rewardMultiplier;
  const canPlay = walletBalance >= selectedAmount && selectedAmount >= minAmount;

  return (
    <div className="space-y-6">
      {/* Wallet Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="font-display text-lg font-bold text-foreground">₹{walletBalance.toFixed(2)}</p>
          </div>
        </div>
      </motion.div>

      {/* Entry Amount Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="text-sm text-muted-foreground font-medium">Select Entry Amount</h3>
        <div className="grid grid-cols-3 gap-3">
          {ENTRY_AMOUNTS.map((amount) => {
            const isSelected = selectedAmount === amount;
            const isAffordable = walletBalance >= amount;
            
            return (
              <motion.button
                key={amount}
                onClick={() => isAffordable && onSelectAmount(amount)}
                disabled={!isAffordable}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20'
                    : isAffordable
                    ? 'border-border bg-card hover:border-primary/50 hover:bg-card/80'
                    : 'border-border/50 bg-card/50 opacity-50 cursor-not-allowed'
                }`}
                whileHover={isAffordable ? { scale: 1.02 } : {}}
                whileTap={isAffordable ? { scale: 0.98 } : {}}
              >
                {amount === 500 && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-black">
                    POPULAR
                  </span>
                )}
                <p className={`font-display text-lg font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  ₹{amount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Win ₹{(amount * rewardMultiplier).toFixed(0)}
                </p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Reward Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4 border border-primary/30 bg-primary/5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Win Amount ({rewardMultiplier}x)</p>
              <p className="font-display text-xl font-bold text-gradient">₹{rewardAmount.toFixed(0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-medium">Instant</span>
          </div>
        </div>
      </motion.div>

      {/* Play Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={onStartGame}
          disabled={!canPlay}
          className="w-full h-14 text-lg font-display font-bold relative overflow-hidden"
          style={{
            background: canPlay 
              ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(185 100% 40%) 100%)'
              : undefined
          }}
        >
          <motion.span
            animate={canPlay ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            {canPlay ? `Play for ₹${selectedAmount}` : 'Insufficient Balance'}
          </motion.span>
          {canPlay && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            />
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default ThimbleEntrySelector;
