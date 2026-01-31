import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Coins, Users, Swords, Trophy, Check } from 'lucide-react';

// Entry amounts starting from ₹10
const ENTRY_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000, 5000];

interface EntrySelectorProps {
  amounts?: number[];
  selectedAmount: number;
  onSelect: (amount: number) => void;
  rewardMultiplier: number;
  playerMode: 2 | 4;
  onPlayerModeChange: (mode: 2 | 4) => void;
}

const EntrySelector = ({ 
  amounts = ENTRY_AMOUNTS, 
  selectedAmount, 
  onSelect, 
  rewardMultiplier,
  playerMode,
  onPlayerModeChange
}: EntrySelectorProps) => {
  // 4v4 mode gets 2x multiplier, 1v1 uses settings multiplier
  const actualMultiplier = playerMode === 4 ? 2 : rewardMultiplier;
  const rewardAmount = selectedAmount * actualMultiplier;
  const isHighStake = selectedAmount > 100;

  return (
    <div className="space-y-4">
      {/* Game Mode Selection - Compact */}
      <div className="space-y-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          Game Mode
        </span>
        
        <div className="grid grid-cols-2 gap-2">
          {/* 1v1 Mode */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onPlayerModeChange(2)}
            className={cn(
              "relative p-3 rounded-xl transition-all duration-200 flex items-center gap-2",
              playerMode === 2
                ? "bg-rose-500/10 border-rose-500/40"
                : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
            )}
            style={{ border: '1px solid' }}
          >
            <div 
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                playerMode === 2 ? "bg-rose-500" : "bg-gray-800"
              )}
            >
              <Swords className="w-4 h-4 text-white" />
            </div>
            
            <div className="text-left flex-1">
              <p className={cn(
                "font-bold text-sm",
                playerMode === 2 ? "text-white" : "text-gray-400"
              )}>
                1 vs 1
              </p>
              <p className={cn(
                "text-[10px]",
                playerMode === 2 ? "text-rose-400" : "text-gray-500"
              )}>
                Head to Head
              </p>
            </div>

            {playerMode === 2 && (
              <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </motion.button>

          {/* 4 Player Mode */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onPlayerModeChange(4)}
            className={cn(
              "relative p-3 rounded-xl transition-all duration-200 flex items-center gap-2",
              playerMode === 4
                ? "bg-amber-500/10 border-amber-500/40"
                : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
            )}
            style={{ border: '1px solid' }}
          >
            <div 
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                playerMode === 4 ? "bg-amber-500" : "bg-gray-800"
              )}
            >
              <Users className="w-4 h-4 text-white" />
            </div>
            
            <div className="text-left flex-1">
              <p className={cn(
                "font-bold text-sm",
                playerMode === 4 ? "text-white" : "text-gray-400"
              )}>
                4 Player
              </p>
              <p className={cn(
                "text-[10px]",
                playerMode === 4 ? "text-amber-400" : "text-gray-500"
              )}>
                Battle Royale
              </p>
            </div>

            {playerMode === 4 && (
              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            
            {/* NEW badge */}
            <div className="absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[7px] font-bold text-white">
              NEW
            </div>
          </motion.button>
        </div>
      </div>

      {/* Entry Amount Selection - Compact */}
      <div className="space-y-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          Entry Amount
        </span>
        
        <div className="grid grid-cols-4 gap-2">
          {amounts.map((amount) => {
            const isSelected = selectedAmount === amount;
            const isPopular = amount === 200;
            
            return (
              <motion.button
                key={amount}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(amount)}
                className={cn(
                  "relative py-2.5 px-2 rounded-xl transition-all duration-200",
                  isSelected
                    ? "bg-emerald-500/15 border-emerald-500/50"
                    : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
                )}
                style={{ border: '1px solid' }}
              >
                <p className={cn(
                  "font-bold text-sm",
                  isSelected ? "text-emerald-400" : "text-gray-300"
                )}>
                  ₹{amount}
                </p>

                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded-full bg-orange-500 text-[7px] font-bold text-white">
                    HOT
                  </div>
                )}

                {/* Selection dot */}
                {isSelected && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Reward Preview - Compact */}
      <motion.div
        key={selectedAmount}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 rounded-xl bg-gray-900/50 border border-gray-800"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-gray-500">Winner Gets</p>
              <p className="font-bold text-xl text-emerald-400">₹{rewardAmount}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-[9px] text-gray-500">Multiplier</p>
            <p className="font-bold text-sm text-white">{actualMultiplier}x</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EntrySelector;
