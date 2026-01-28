import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Coins, Users, Crown, Swords, Sparkles, TrendingUp, Zap, Trophy } from 'lucide-react';

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
      {/* Premium Game Mode Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-1.5 h-5 rounded-full"
            style={{
              background: 'linear-gradient(180deg, #FFD54F 0%, #FF8F00 100%)',
              boxShadow: '0 0 10px rgba(255,152,0,0.4)',
            }}
          />
          <span 
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Game Mode
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* 1v1 Mode Card */}
          <motion.button
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPlayerModeChange(2)}
            className="relative p-5 rounded-2xl transition-all duration-300 overflow-hidden"
            style={{
              background: playerMode === 2
                ? 'linear-gradient(135deg, rgba(239,83,80,0.15) 0%, rgba(198,40,40,0.08) 100%)'
                : 'linear-gradient(135deg, rgba(40,38,35,0.6) 0%, rgba(30,28,25,0.5) 100%)',
              border: playerMode === 2
                ? '2px solid rgba(239,83,80,0.5)'
                : '2px solid rgba(255,255,255,0.08)',
              boxShadow: playerMode === 2
                ? '0 0 35px rgba(239,83,80,0.25), inset 0 1px 2px rgba(255,255,255,0.1)'
                : 'inset 0 1px 2px rgba(255,255,255,0.05)',
            }}
          >
            {/* Animated background pulse */}
            {playerMode === 2 && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 50% 30%, rgba(239,83,80,0.2) 0%, transparent 60%)',
                }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            )}
            
            <div className="relative z-10">
              <motion.div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{
                  background: playerMode === 2 
                    ? 'linear-gradient(135deg, #EF5350 0%, #C62828 100%)'
                    : 'linear-gradient(135deg, rgba(60,55,50,0.8) 0%, rgba(45,40,35,0.6) 100%)',
                  boxShadow: playerMode === 2 
                    ? '0 6px 20px rgba(239,83,80,0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
                    : 'inset 0 1px 2px rgba(255,255,255,0.1)',
                  border: playerMode === 2
                    ? '2px solid rgba(255,255,255,0.2)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
                animate={playerMode === 2 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Swords className={cn(
                  'w-7 h-7 transition-colors drop-shadow-lg',
                  playerMode === 2 ? 'text-white' : 'text-white/30'
                )} />
              </motion.div>
              
              <p 
                className="font-display font-black text-xl transition-colors tracking-wide"
                style={{ 
                  color: playerMode === 2 ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                }}
              >
                1 vs 1
              </p>
              <p 
                className="text-xs font-semibold mt-0.5"
                style={{ 
                  color: playerMode === 2 ? '#EF5350' : 'rgba(255,255,255,0.3)',
                }}
              >
                Head to Head
              </p>
            </div>

            {/* Selection checkmark */}
            <AnimatePresence>
              {playerMode === 2 && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EF5350 0%, #C62828 100%)',
                    boxShadow: '0 3px 10px rgba(239,83,80,0.5)',
                    border: '2px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <span className="text-[10px] text-white font-black">✓</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* 2v2 Mode Card */}
          <motion.button
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPlayerModeChange(4)}
            className="relative p-5 rounded-2xl transition-all duration-300 overflow-hidden"
            style={{
              background: playerMode === 4
                ? 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,143,0,0.08) 100%)'
                : 'linear-gradient(135deg, rgba(40,38,35,0.6) 0%, rgba(30,28,25,0.5) 100%)',
              border: playerMode === 4
                ? '2px solid rgba(255,193,7,0.5)'
                : '2px solid rgba(255,255,255,0.08)',
              boxShadow: playerMode === 4
                ? '0 0 35px rgba(255,193,7,0.25), inset 0 1px 2px rgba(255,255,255,0.1)'
                : 'inset 0 1px 2px rgba(255,255,255,0.05)',
            }}
          >
            {playerMode === 4 && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 50% 30%, rgba(255,193,7,0.2) 0%, transparent 60%)',
                }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            )}
            
            <div className="relative z-10">
              <motion.div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{
                  background: playerMode === 4 
                    ? 'linear-gradient(135deg, #FFD54F 0%, #FF8F00 100%)'
                    : 'linear-gradient(135deg, rgba(60,55,50,0.8) 0%, rgba(45,40,35,0.6) 100%)',
                  boxShadow: playerMode === 4 
                    ? '0 6px 20px rgba(255,152,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)'
                    : 'inset 0 1px 2px rgba(255,255,255,0.1)',
                  border: playerMode === 4
                    ? '2px solid rgba(255,255,255,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
                animate={playerMode === 4 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Crown className={cn(
                  'w-7 h-7 transition-colors drop-shadow-lg',
                  playerMode === 4 ? 'text-amber-900' : 'text-white/30'
                )} />
              </motion.div>
              
              <p 
                className="font-display font-black text-xl transition-colors tracking-wide"
                style={{ 
                  color: playerMode === 4 ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                }}
              >
                2 vs 2
              </p>
              <p 
                className="text-xs font-semibold mt-0.5"
                style={{ 
                  color: playerMode === 4 ? '#FFC107' : 'rgba(255,255,255,0.3)',
                }}
              >
                4 Players
              </p>
            </div>

            <AnimatePresence>
              {playerMode === 4 && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #FFD54F 0%, #FF8F00 100%)',
                    boxShadow: '0 3px 10px rgba(255,152,0,0.5)',
                    border: '2px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <span className="text-[10px] text-amber-900 font-black">✓</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Premium Entry Amount Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-1.5 h-5 rounded-full"
            style={{
              background: 'linear-gradient(180deg, #4CAF50 0%, #2E7D32 100%)',
              boxShadow: '0 0 10px rgba(76,175,80,0.4)',
            }}
          />
          <span 
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Entry Amount
          </span>
        </div>
        
        <div className="grid grid-cols-4 gap-2.5">
          {amounts.map((amount, idx) => {
            const isSelected = selectedAmount === amount;
            const isHot = amount === 200;
            
            return (
              <motion.button
                key={amount}
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 300 }}
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(amount)}
                className="relative py-3.5 px-2 rounded-xl transition-all duration-300 overflow-hidden"
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(76,175,80,0.2) 0%, rgba(46,125,50,0.12) 100%)'
                    : 'linear-gradient(135deg, rgba(40,38,35,0.6) 0%, rgba(30,28,25,0.5) 100%)',
                  border: isSelected
                    ? '2px solid rgba(76,175,80,0.6)'
                    : '2px solid rgba(255,255,255,0.08)',
                  boxShadow: isSelected
                    ? '0 0 25px rgba(76,175,80,0.3), inset 0 1px 2px rgba(255,255,255,0.1)'
                    : 'inset 0 1px 2px rgba(255,255,255,0.05)',
                }}
              >
                {/* Selection glow */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 50% 50%, rgba(76,175,80,0.25) 0%, transparent 70%)',
                    }}
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                
                <div className="relative z-10">
                  <p 
                    className="font-display font-black text-lg tracking-wide"
                    style={{
                      background: isSelected 
                        ? 'linear-gradient(135deg, #4CAF50 0%, #A5D6A7 50%, #4CAF50 100%)'
                        : 'linear-gradient(135deg, #FFFFFF 0%, #B0B0B0 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    ₹{amount}
                  </p>
                </div>

                {/* HOT badge */}
                {isHot && (
                  <div className="absolute -top-1.5 -right-1.5 z-20">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5"
                      style={{
                        background: 'linear-gradient(135deg, #FF6B00 0%, #FF8F00 50%, #FFB300 100%)',
                        boxShadow: '0 3px 10px rgba(255,107,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      <Zap className="w-2.5 h-2.5 text-white" />
                      <span className="text-[8px] text-white font-black tracking-wide">HOT</span>
                    </motion.div>
                  </div>
                )}

                {/* Selection indicator ring */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ border: '2px solid rgba(76,175,80,0.4)' }}
                    animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.3, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Premium Reward Preview Card */}
      <motion.div
        key={selectedAmount}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30,28,25,0.95) 0%, rgba(20,18,15,0.98) 100%)',
          border: '2px solid rgba(76,175,80,0.4)',
          boxShadow: '0 0 40px rgba(76,175,80,0.2), 0 10px 30px rgba(0,0,0,0.4)',
        }}
      >
        {/* Animated background glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 50%, rgba(76,175,80,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(255,193,7,0.1) 0%, transparent 50%)',
          }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
          }}
          animate={{ x: ['-150%', '150%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        />
        
        {/* Content */}
        <div className="relative z-10 p-5">
          <div className="flex items-center justify-between">
            {/* Left - Winner Gets */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-14 h-14 rounded-xl flex items-center justify-center relative"
                style={{
                  background: 'linear-gradient(135deg, #FFE082 0%, #FFD54F 25%, #FFCA28 50%, #FFB300 75%, #FF8F00 100%)',
                  boxShadow: '0 6px 25px rgba(255,152,0,0.5), inset 0 2px 4px rgba(255,255,255,0.4)',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              >
                {/* Inner highlight */}
                <div 
                  className="absolute inset-1 rounded-lg opacity-30 pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 50%)',
                  }}
                />
                <Trophy className="w-7 h-7 text-amber-900 drop-shadow relative z-10" />
              </motion.div>
              
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Winner Gets
                </p>
                <motion.p 
                  className="font-display text-4xl font-black tracking-wide"
                  style={{
                    background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 30%, #FFFFFF 50%, #81C784 70%, #4CAF50 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 30px rgba(76,175,80,0.5)',
                  }}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ₹{rewardAmount}
                </motion.p>
              </div>
            </div>
            
            {/* Right - Multiplier */}
            <div 
              className="text-right px-4 py-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(46,125,50,0.1) 100%)',
                border: '1px solid rgba(76,175,80,0.3)',
              }}
            >
              <div className="flex items-center justify-end gap-1 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                Multiplier
              </div>
              <p 
                className="text-2xl font-black"
                style={{
                  background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {rewardMultiplier}x
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EntrySelector;
