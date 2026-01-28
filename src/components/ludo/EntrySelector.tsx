import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Coins, Users, Crown, Swords, Sparkles, TrendingUp } from 'lucide-react';

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
    <div className="space-y-5">
      {/* Game Mode Selection - Premium Cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-primary/50" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Game Mode
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPlayerModeChange(2)}
            className={cn(
              'relative p-4 rounded-2xl transition-all duration-300 overflow-hidden group',
              playerMode === 2
                ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/50 shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]'
                : 'bg-card/50 border border-border/50 hover:border-border hover:bg-card/80'
            )}
          >
            {/* Animated background glow */}
            {playerMode === 2 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            
            <div className="relative z-10">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-all',
                playerMode === 2 
                  ? 'bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30' 
                  : 'bg-muted'
              )}>
                <Swords className={cn(
                  'w-6 h-6 transition-colors',
                  playerMode === 2 ? 'text-primary-foreground' : 'text-muted-foreground'
                )} />
              </div>
              <p className={cn(
                'font-display font-bold text-lg transition-colors',
                playerMode === 2 ? 'text-foreground' : 'text-muted-foreground'
              )}>
                1 vs 1
              </p>
              <p className={cn(
                'text-xs transition-colors',
                playerMode === 2 ? 'text-primary' : 'text-muted-foreground'
              )}>
                Head to Head
              </p>
            </div>

            {/* Selection indicator */}
            {playerMode === 2 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-[10px] text-primary-foreground">✓</span>
              </motion.div>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPlayerModeChange(4)}
            className={cn(
              'relative p-4 rounded-2xl transition-all duration-300 overflow-hidden group',
              playerMode === 4
                ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/50 shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]'
                : 'bg-card/50 border border-border/50 hover:border-border hover:bg-card/80'
            )}
          >
            {playerMode === 4 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            
            <div className="relative z-10">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-all',
                playerMode === 4 
                  ? 'bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30' 
                  : 'bg-muted'
              )}>
                <Crown className={cn(
                  'w-6 h-6 transition-colors',
                  playerMode === 4 ? 'text-primary-foreground' : 'text-muted-foreground'
                )} />
              </div>
              <p className={cn(
                'font-display font-bold text-lg transition-colors',
                playerMode === 4 ? 'text-foreground' : 'text-muted-foreground'
              )}>
                2 vs 2
              </p>
              <p className={cn(
                'text-xs transition-colors',
                playerMode === 4 ? 'text-primary' : 'text-muted-foreground'
              )}>
                4 Players
              </p>
            </div>

            {playerMode === 4 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-[10px] text-primary-foreground">✓</span>
              </motion.div>
            )}
          </motion.button>
        </div>
      </div>

      {/* Entry Amount Selection - Premium Chips */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-green-500 to-green-500/50" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Entry Amount
          </span>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {amounts.map((amount, idx) => (
            <motion.button
              key={amount}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(amount)}
              className={cn(
                'relative py-3 px-2 rounded-xl transition-all duration-300 overflow-hidden',
                selectedAmount === amount
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                  : 'bg-card/50 border border-border/50 hover:border-green-500/30 hover:bg-card/80'
              )}
            >
              {selectedAmount === amount && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent"
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              
              <div className="relative z-10">
                <p className={cn(
                  'font-display font-bold text-base transition-colors',
                  selectedAmount === amount ? 'text-green-400' : 'text-foreground'
                )}>
                  ₹{amount}
                </p>
              </div>

              {/* Popular badge */}
              {amount === 200 && (
                <div className="absolute -top-1 -right-1 z-20">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-[8px] text-black font-bold px-1.5 py-0.5 rounded-full shadow-lg"
                  >
                    HOT
                  </motion.div>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reward Preview - Premium Card */}
      <motion.div
        key={selectedAmount}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        {/* Background with animated gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.08) 50%, rgba(5,150,105,0.05) 100%)',
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.2) 0%, transparent 60%)',
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Content */}
        <div className="relative z-10 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30"
              >
                <Crown className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  Winner Gets
                </p>
                <motion.p 
                  className="font-display text-3xl font-bold text-green-400"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ₹{rewardAmount}
                </motion.p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3 text-green-500" />
                Multiplier
              </div>
              <p className="text-lg font-bold text-foreground">{rewardMultiplier}x</p>
            </div>
          </div>
        </div>

        {/* Border glow */}
        <div className="absolute inset-0 rounded-2xl border border-green-500/30 pointer-events-none" />
      </motion.div>
    </div>
  );
};

export default EntrySelector;
