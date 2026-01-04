import { motion } from 'framer-motion';
import { Wallet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThimbleEntrySelectorProps {
  minAmount: number;
  selectedAmount: number;
  walletBalance: number;
  onSelectAmount: (amount: number) => void;
  onProceed: () => void;
}

const ENTRY_AMOUNTS = [10, 20, 50, 100, 200, 500];

const ThimbleEntrySelector = ({
  minAmount,
  selectedAmount,
  walletBalance,
  onSelectAmount,
  onProceed,
}: ThimbleEntrySelectorProps) => {
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
            const meetsMin = amount >= minAmount;
            
            return (
              <motion.button
                key={amount}
                onClick={() => isAffordable && meetsMin && onSelectAmount(amount)}
                disabled={!isAffordable || !meetsMin}
                className={cn(
                  'relative p-4 rounded-xl border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20'
                    : isAffordable && meetsMin
                    ? 'border-border bg-card hover:border-primary/50 hover:bg-card/80'
                    : 'border-border/50 bg-card/50 opacity-50 cursor-not-allowed'
                )}
                whileHover={isAffordable && meetsMin ? { scale: 1.02 } : {}}
                whileTap={isAffordable && meetsMin ? { scale: 0.98 } : {}}
              >
                {amount === 50 && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-black">
                    POPULAR
                  </span>
                )}
                <p className={cn('font-display text-lg font-bold', isSelected ? 'text-primary' : 'text-foreground')}>
                  ₹{amount}
                </p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Play Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          onClick={onProceed}
          disabled={!canPlay}
          className="w-full h-14 text-lg font-display font-bold relative overflow-hidden gap-2"
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
            {canPlay ? 'Continue' : 'Insufficient Balance'}
          </motion.span>
          {canPlay && <ArrowRight className="w-5 h-5" />}
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