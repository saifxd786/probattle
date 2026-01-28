import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, XCircle, Sparkles, ArrowRight, Volume2, VolumeX, RotateCcw, Crown, Coins, Star, Zap, Users, Timer, Target, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { soundManager } from '@/utils/soundManager';
import { hapticManager } from '@/utils/hapticManager';

interface GameResultProps {
  isWinner: boolean;
  rewardAmount: number;
  entryAmount: number;
  playerName: string;
  onPlayAgain: () => void;
  onGoHome: () => void;
  showRematch?: boolean;
  onRematch?: () => void;
}

// Premium golden confetti particles
const PremiumConfetti = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 80 }).map((_, i) => {
      const colors = [
        'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        'linear-gradient(135deg, #FFE082 0%, #FFB300 100%)',
        'linear-gradient(135deg, #FFFFFF 0%, #E0E0E0 100%)',
        'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)',
        'linear-gradient(135deg, #81C784 0%, #388E3C 100%)',
        'linear-gradient(135deg, #F48FB1 0%, #C2185B 100%)',
      ];
      const isCircle = Math.random() > 0.6;
      const isStar = Math.random() > 0.85;
      
      return (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            width: isStar ? 14 : Math.random() * 10 + 5,
            height: isStar ? 14 : Math.random() * 10 + 5,
            background: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: isCircle ? '50%' : isStar ? '0' : '2px',
            clipPath: isStar ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : undefined,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
          initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: '120vh',
            opacity: [1, 1, 0.8, 0],
            rotate: Math.random() * 1080 - 540,
            scale: [1, 1.2, 0.6],
            x: [0, (Math.random() - 0.5) * 120],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            delay: Math.random() * 1,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
            ease: 'easeOut'
          }}
        />
      );
    })}
  </div>
);

// Premium floating coins with 3D effect
const PremiumFloatingCoins = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{ 
          left: `${5 + Math.random() * 90}%`,
          fontSize: 20 + Math.random() * 12,
        }}
        initial={{ y: '110vh', opacity: 0, rotateY: 0 }}
        animate={{
          y: '-10vh',
          opacity: [0, 1, 1, 0.6, 0],
          rotateY: [0, 360, 720, 1080],
          scale: [0.6, 1.2, 1, 0.7],
        }}
        transition={{
          duration: 3.5 + Math.random() * 1.5,
          delay: i * 0.15,
          repeat: Infinity,
          repeatDelay: 2.5,
        }}
      >
        <span className="drop-shadow-lg">🪙</span>
      </motion.div>
    ))}
  </div>
);

// Premium firework bursts
const PremiumFireworks = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 5 }).map((_, burstIdx) => (
      <motion.div
        key={burstIdx}
        className="absolute"
        style={{
          left: `${15 + burstIdx * 18}%`,
          top: `${20 + Math.random() * 25}%`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.8, 0], opacity: [0, 1, 0] }}
        transition={{
          duration: 1.5,
          delay: burstIdx * 0.4,
          repeat: Infinity,
          repeatDelay: 3,
        }}
      >
        {Array.from({ length: 12 }).map((_, sparkIdx) => {
          const angle = (sparkIdx * 30 * Math.PI) / 180;
          const distance = 40 + Math.random() * 25;
          const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF69B4', '#00FF00', '#FFA500'];
          
          return (
            <motion.div
              key={sparkIdx}
              className="absolute rounded-full"
              style={{
                width: 3 + Math.random() * 3,
                height: 3 + Math.random() * 3,
                background: `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]} 0%, transparent 70%)`,
                boxShadow: `0 0 5px ${colors[Math.floor(Math.random() * colors.length)]}`,
              }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                opacity: [1, 0.8, 0],
                scale: [1.2, 0.6, 0],
              }}
              transition={{
                duration: 0.8,
                delay: burstIdx * 0.4,
                repeat: Infinity,
                repeatDelay: 3 + 0.7,
              }}
            />
          );
        })}
      </motion.div>
    ))}
  </div>
);

// Radiant light rays
const LightRays = () => (
  <motion.div 
    className="absolute inset-0 pointer-events-none"
    style={{
      background: `
        conic-gradient(
          from 0deg,
          transparent 0deg,
          rgba(255,215,0,0.12) 5deg,
          transparent 10deg,
          transparent 25deg,
          rgba(255,215,0,0.08) 30deg,
          transparent 35deg,
          transparent 50deg,
          rgba(255,215,0,0.12) 55deg,
          transparent 60deg,
          transparent 75deg,
          rgba(255,215,0,0.08) 80deg,
          transparent 85deg
        )
      `,
    }}
    animate={{ rotate: [0, 360] }}
    transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
  />
);

// Sparkle stars
const SparkleStars = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 15 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        initial={{ scale: 0, opacity: 0, rotate: 0 }}
        animate={{
          scale: [0, 1.2, 0],
          opacity: [0, 1, 0],
          rotate: [0, 180],
        }}
        transition={{
          duration: 1,
          delay: i * 0.2,
          repeat: Infinity,
          repeatDelay: 3,
        }}
      >
        <Star className="w-4 h-4 text-yellow-400 fill-yellow-300 drop-shadow-lg" />
      </motion.div>
    ))}
  </div>
);

// Premium shimmer effect
const ShimmerEffect = ({ className }: { className?: string }) => (
  <motion.div
    className={cn("absolute inset-0 -translate-x-full", className)}
    animate={{ translateX: ['100%', '-100%'] }}
    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
  >
    <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
  </motion.div>
);

const GameResult = ({ isWinner, rewardAmount, entryAmount, playerName, onPlayAgain, onGoHome, showRematch, onRematch }: GameResultProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    
    if (isWinner) {
      soundManager.playWin();
      hapticManager.gameWin();
    } else {
      soundManager.playLose();
      hapticManager.gameLose();
    }
    
    return () => clearTimeout(timer);
  }, [isWinner]);

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    soundManager.setEnabled(!soundEnabled);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
      style={{
        background: isWinner 
          ? 'radial-gradient(ellipse at 50% 20%, rgba(255,215,0,0.12) 0%, transparent 50%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)'
          : 'radial-gradient(ellipse at 50% 50%, rgba(100,100,100,0.08) 0%, transparent 50%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)',
      }}
    >
      {/* Background effects for winner */}
      {isWinner && <LightRays />}
      {isWinner && <PremiumConfetti />}
      {isWinner && <PremiumFloatingCoins />}
      {isWinner && <PremiumFireworks />}
      {isWinner && <SparkleStars />}
      
      {/* Sound toggle button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={toggleSound}
        className="absolute top-4 right-4 p-3 rounded-xl backdrop-blur-md transition-all z-50 bg-card/80 border border-border/50 hover:border-primary/50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {soundEnabled ? (
          <Volume2 className="w-5 h-5 text-foreground/80" />
        ) : (
          <VolumeX className="w-5 h-5 text-muted-foreground" />
        )}
      </motion.button>
      
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 16, delay: 0.1 }}
            className="w-full max-w-sm relative z-10"
          >
            {/* Premium Result Card */}
            <motion.div
              className="relative rounded-3xl overflow-hidden"
              style={{
                boxShadow: isWinner
                  ? '0 0 80px rgba(255,215,0,0.25), 0 25px 60px rgba(0,0,0,0.4)'
                  : '0 25px 60px rgba(0,0,0,0.4)',
              }}
            >
              {/* Outer gradient border */}
              <div 
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: isWinner
                    ? 'linear-gradient(135deg, #FFD700 0%, #FF8C00 25%, #FFD700 50%, #FF6B00 75%, #FFD700 100%)'
                    : 'linear-gradient(135deg, hsl(var(--border)) 0%, hsl(var(--muted)) 50%, hsl(var(--border)) 100%)',
                  padding: '2px',
                }}
              />
              
              {/* Animated border shimmer */}
              {isWinner && (
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-50"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                  }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 0.5 }}
                />
              )}
              
              <div className="relative m-[2px] rounded-[22px] bg-card/95 backdrop-blur-xl p-6 overflow-hidden">
                {/* Inner gradient glow */}
                <div 
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    background: isWinner 
                      ? 'radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.2) 0%, transparent 50%)'
                      : 'radial-gradient(ellipse at 50% 0%, hsl(var(--muted)/0.3) 0%, transparent 50%)',
                  }}
                />

                {/* Result Icon */}
                <motion.div
                  initial={{ y: -60, rotate: -10, scale: 0.5 }}
                  animate={{ y: 0, rotate: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 150, damping: 12 }}
                  className="text-center mb-5 relative"
                >
                  {isWinner ? (
                    <motion.div className="relative inline-block">
                      {/* Pulsing glow rings */}
                      <motion.div
                        className="absolute -inset-6 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)' }}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute -inset-10 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%)' }}
                        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                      />
                      
                      {/* Trophy container */}
                      <motion.div
                        animate={{ scale: [1, 1.03, 1], rotate: [0, -2, 2, 0] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                        className="relative inline-flex p-5 rounded-2xl"
                        style={{
                          background: 'linear-gradient(180deg, #FFE082 0%, #FFD54F 20%, #FFCA28 40%, #FFB300 60%, #FF8F00 80%, #E65100 100%)',
                          boxShadow: '0 10px 40px rgba(255,152,0,0.5), inset 0 2px 10px rgba(255,255,255,0.5), inset 0 -4px 10px rgba(0,0,0,0.2)',
                        }}
                      >
                        {/* Crown on top */}
                        <motion.div
                          className="absolute -top-4 left-1/2 -translate-x-1/2"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Crown className="w-9 h-9 text-yellow-200 fill-yellow-100 drop-shadow-lg" />
                        </motion.div>
                        
                        <Trophy className="w-12 h-12 text-white drop-shadow-lg" />
                        
                        {/* Sparkles around trophy */}
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute"
                            style={{
                              left: `${15 + (i % 3) * 30}%`,
                              top: `${20 + Math.floor(i / 3) * 50}%`,
                            }}
                            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 180] }}
                            transition={{ duration: 1, delay: i * 0.2, repeat: Infinity, repeatDelay: 2 }}
                          >
                            <Sparkles className="w-3 h-3 text-yellow-200" />
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="inline-flex p-5 rounded-2xl relative bg-gradient-to-b from-muted to-muted/80"
                      style={{ boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.1), 0 8px 20px rgba(0,0,0,0.3)' }}
                      animate={{ scale: [1, 0.98, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      <XCircle className="w-12 h-12 text-muted-foreground" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Result Text */}
                <div className="text-center mb-5">
                  <motion.h1
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="font-display text-2xl font-black mb-1.5 tracking-wider"
                    style={{
                      background: isWinner 
                        ? 'linear-gradient(135deg, #FFE082 0%, #FFD54F 30%, #FFFFFF 50%, #FFD54F 70%, #FF8F00 100%)'
                        : 'linear-gradient(135deg, hsl(var(--muted-foreground)) 0%, hsl(var(--foreground)/0.6) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {isWinner ? '🎉 VICTORY! 🎉' : 'GAME OVER'}
                  </motion.h1>
                  
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="text-muted-foreground text-sm"
                  >
                    {isWinner ? 'Congratulations! You dominated the board!' : 'Better luck next time, champion!'}
                  </motion.p>
                </div>

                {/* Premium Reward Card */}
                <motion.div
                  initial={{ scale: 0, rotate: -5 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 180 }}
                  className="mb-5"
                >
                  <div
                    className="relative p-4 rounded-xl overflow-hidden"
                    style={{
                      background: isWinner
                        ? 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.2) 100%)'
                        : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.18) 100%)',
                      border: isWinner 
                        ? '1px solid rgba(34,197,94,0.3)'
                        : '1px solid rgba(239,68,68,0.25)',
                    }}
                  >
                    {isWinner && <ShimmerEffect />}
                    
                    <div className="relative flex items-center justify-center gap-3">
                      {isWinner ? (
                        <>
                          <motion.div animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }} transition={{ duration: 0.7, delay: 0.6 }}>
                            <Coins className="w-7 h-7 text-amber-400" />
                          </motion.div>
                          <motion.span 
                            className="text-3xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent"
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ delay: 0.6, duration: 0.4 }}
                          >
                            +₹{rewardAmount}
                          </motion.span>
                          <motion.div animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.15, 1] }} transition={{ duration: 0.7, delay: 0.6 }}>
                            <Zap className="w-6 h-6 text-amber-400 fill-amber-300" />
                          </motion.div>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-red-400">-₹{entryAmount}</span>
                      )}
                    </div>
                    
                    <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                      {isWinner ? (
                        <>
                          <span className="inline-block">💰</span> Added to your wallet!
                        </>
                      ) : (
                        'Entry fee deducted'
                      )}
                    </p>
                  </div>
                </motion.div>

                {/* Game Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="grid grid-cols-3 gap-2 mb-5"
                >
                  {[
                    { icon: Target, label: 'Entry', value: `₹${entryAmount}`, color: 'text-amber-400' },
                    { icon: Trophy, label: 'Prize', value: `₹${rewardAmount}`, color: isWinner ? 'text-green-400' : 'text-muted-foreground' },
                    { icon: Zap, label: 'Multiplier', value: '1.5x', color: 'text-primary' },
                  ].map((stat, idx) => (
                    <motion.div
                      key={stat.label}
                      className="relative rounded-lg overflow-hidden"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.65 + idx * 0.08 }}
                    >
                      <div className="absolute inset-0 bg-muted/30" />
                      <div className="relative p-2.5 text-center">
                        <stat.icon className={cn("w-4 h-4 mx-auto mb-1", stat.color)} />
                        <p className="text-xs font-bold">{stat.value}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Premium Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 }}
                  className="space-y-2.5"
                >
                  {showRematch && onRematch ? (
                    <motion.button
                      onClick={() => {
                        soundManager.playClick();
                        hapticManager.buttonTap();
                        onRematch();
                      }}
                      className="w-full relative rounded-xl font-bold py-3.5 overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
                      style={{
                        boxShadow: '0 6px 25px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                      }}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ShimmerEffect />
                      <span className="relative flex items-center justify-center gap-2 text-white font-black tracking-wide text-sm">
                        <RotateCcw className="w-4 h-4" />
                        REMATCH
                      </span>
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={() => {
                        soundManager.playClick();
                        hapticManager.buttonTap();
                        onPlayAgain();
                      }}
                      className={cn(
                        "w-full relative rounded-xl font-bold py-3.5 overflow-hidden",
                        isWinner 
                          ? "bg-gradient-to-r from-green-500 via-emerald-500 to-green-500"
                          : "bg-gradient-to-r from-primary via-cyan-500 to-primary"
                      )}
                      style={{
                        boxShadow: isWinner 
                          ? '0 6px 25px rgba(34,197,94,0.35), inset 0 1px 0 rgba(255,255,255,0.3)'
                          : '0 6px 25px rgba(var(--primary),0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                      }}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ShimmerEffect />
                      <span className="relative flex items-center justify-center gap-2 text-white font-black tracking-wide text-sm">
                        PLAY AGAIN
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </motion.button>
                  )}
                  
                  <motion.button
                    onClick={() => {
                      soundManager.playClick();
                      hapticManager.buttonTap();
                      onGoHome();
                    }}
                    className="w-full rounded-xl font-semibold py-3.5 transition-all bg-muted/50 border border-border/50 hover:border-border hover:bg-muted/70"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                      <Home className="w-4 h-4" />
                      Back to Home
                    </span>
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameResult;
