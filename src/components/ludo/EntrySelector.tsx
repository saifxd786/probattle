import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Coins, Users, Crown, Swords } from 'lucide-react';

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
        <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          Select Mode
        </p>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPlayerModeChange(2)}
            className={cn(
              'p-4 rounded-xl border-2 transition-all relative overflow-hidden',
              playerMode === 2
                ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 to-orange-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            )}
          >
            {playerMode === 2 && (
              <motion.div
                layoutId="modeSelector"
                className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/5"
              />
            )}
            <div className="relative z-10">
              <Swords className={cn('w-6 h-6 mx-auto mb-2', playerMode === 2 ? 'text-yellow-400' : 'text-gray-500')} />
              <p className={cn('font-bold text-lg', playerMode === 2 ? 'text-white' : 'text-gray-400')}>1v1</p>
              <p className="text-xs text-gray-500">Head to Head</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPlayerModeChange(4)}
            className={cn(
              'p-4 rounded-xl border-2 transition-all relative overflow-hidden',
              playerMode === 4
                ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 to-orange-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            )}
          >
            {playerMode === 4 && (
              <motion.div
                layoutId="modeSelector"
                className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/5"
              />
            )}
            <div className="relative z-10">
              <Crown className={cn('w-6 h-6 mx-auto mb-2', playerMode === 4 ? 'text-yellow-400' : 'text-gray-500')} />
              <p className={cn('font-bold text-lg', playerMode === 4 ? 'text-white' : 'text-gray-400')}>4 Players</p>
              <p className="text-xs text-gray-500">Battle Royale</p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Entry Amount Selection */}
      <div>
        <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          Select Entry Amount
        </p>
        <div className="grid grid-cols-2 gap-3">
          {amounts.map((amount, idx) => (
            <motion.button
              key={amount}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(amount)}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all overflow-hidden',
                selectedAmount === amount
                  ? 'border-green-500/50 bg-gradient-to-br from-green-500/20 to-emerald-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              )}
            >
              {selectedAmount === amount && (
                <motion.div
                  layoutId="amountSelector"
                  className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5"
                />
              )}
              <div className="relative z-10">
                <p className={cn(
                  'font-bold text-2xl',
                  selectedAmount === amount ? 'text-green-400' : 'text-white'
                )}>
                  ₹{amount}
                </p>
                <p className="text-xs text-gray-500 mt-1">Entry Fee</p>
              </div>
              {/* Popular badge for middle amounts */}
              {amount === 200 && (
                <div className="absolute top-1 right-1 bg-yellow-500 text-[8px] text-black font-bold px-1.5 py-0.5 rounded-full">
                  POPULAR
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reward Preview */}
      <motion.div
        key={selectedAmount}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative p-5 rounded-2xl text-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.05) 100%)',
          border: '1px solid rgba(34,197,94,0.3)',
        }}
      >
        {/* Animated background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(34,197,94,0.1) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        <div className="relative z-10">
          <p className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-1">
            <Crown className="w-4 h-4 text-yellow-500" />
            Winner Gets
          </p>
          <motion.p 
            className="text-4xl font-bold text-green-400"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ₹{rewardAmount}
          </motion.p>
          <p className="text-xs text-gray-500 mt-2">{rewardMultiplier}x your entry • Instant withdrawal</p>
        </div>
      </motion.div>
    </div>
  );
};

export default EntrySelector;
