import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, XCircle, Sparkles, ArrowRight, Volume2, VolumeX, RotateCcw, Crown, Coins, Star, Zap, Users, Timer, Target, Home, Heart, Flame, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
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

// Ultra Premium golden confetti particles with more variety
const PremiumConfetti = () => {
  const particles = useMemo(() => 
    Array.from({ length: 100 }).map((_, i) => {
      const colors = [
        'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        'linear-gradient(135deg, #FFE082 0%, #FFB300 100%)',
        'linear-gradient(135deg, #FFFFFF 0%, #E0E0E0 100%)',
        'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)',
        'linear-gradient(135deg, #81C784 0%, #388E3C 100%)',
        'linear-gradient(135deg, #F48FB1 0%, #C2185B 100%)',
        'linear-gradient(135deg, #BA68C8 0%, #7B1FA2 100%)',
      ];
      const shapes = ['circle', 'square', 'star', 'ribbon'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      
      return {
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 12 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape,
        delay: Math.random() * 1.5,
        duration: 4 + Math.random() * 3,
        rotateAmount: Math.random() * 1440 - 720,
        xDrift: (Math.random() - 0.5) * 150,
      };
    }), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.shape === 'ribbon' ? p.size * 2.5 : p.size,
            background: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'ribbon' ? '2px' : '3px',
            clipPath: p.shape === 'star' 
              ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
              : undefined,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
          initial={{ y: -30, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: '130vh',
            opacity: [1, 1, 0.9, 0.7, 0],
            rotate: p.rotateAmount,
            scale: [1, 1.3, 0.8, 0.4],
            x: [0, p.xDrift * 0.3, p.xDrift * 0.7, p.xDrift],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 1.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        />
      ))}
    </div>
  );
};

// Premium floating coins with 3D spin effect
const PremiumFloatingCoins = () => {
  const coins = useMemo(() => 
    Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: 5 + Math.random() * 90,
      size: 22 + Math.random() * 14,
      delay: i * 0.12,
      duration: 3 + Math.random() * 2,
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {coins.map((c) => (
        <motion.div
          key={c.id}
          className="absolute"
          style={{ 
            left: `${c.left}%`,
            fontSize: c.size,
          }}
          initial={{ y: '120vh', opacity: 0, rotateY: 0, scale: 0.5 }}
          animate={{
            y: '-15vh',
            opacity: [0, 1, 1, 0.8, 0],
            rotateY: [0, 360, 720, 1080, 1440],
            scale: [0.5, 1.3, 1.1, 0.8, 0.4],
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        >
          <span className="drop-shadow-xl" style={{ filter: 'drop-shadow(0 3px 6px rgba(255,200,0,0.4))' }}>🪙</span>
        </motion.div>
      ))}
    </div>
  );
};

// Ultra premium firework bursts with more particles
const PremiumFireworks = () => {
  const bursts = useMemo(() => 
    Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      left: 10 + i * 15,
      top: 15 + Math.random() * 30,
      delay: i * 0.35,
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {bursts.map((burst) => (
        <motion.div
          key={burst.id}
          className="absolute"
          style={{
            left: `${burst.left}%`,
            top: `${burst.top}%`,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: 1.8,
            delay: burst.delay,
            repeat: Infinity,
            repeatDelay: 2.5,
          }}
        >
          {Array.from({ length: 16 }).map((_, sparkIdx) => {
            const angle = (sparkIdx * 22.5 * Math.PI) / 180;
            const distance = 45 + Math.random() * 30;
            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF69B4', '#00FF00', '#FFA500', '#FF1493', '#00BFFF'];
            const color = colors[sparkIdx % colors.length];
            
            return (
              <motion.div
                key={sparkIdx}
                className="absolute rounded-full"
                style={{
                  width: 4 + Math.random() * 4,
                  height: 4 + Math.random() * 4,
                  background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                  boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1.5 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  opacity: [1, 0.9, 0],
                  scale: [1.5, 1, 0],
                }}
                transition={{
                  duration: 1,
                  delay: burst.delay,
                  repeat: Infinity,
                  repeatDelay: 2.5 + 0.8,
                }}
              />
            );
          })}
        </motion.div>
      ))}
    </div>
  );
};

// Radiant light rays - Enhanced
const LightRays = () => (
  <motion.div 
    className="absolute inset-0 pointer-events-none"
    style={{
      background: `
        conic-gradient(
          from 0deg,
          transparent 0deg,
          rgba(255,215,0,0.15) 5deg,
          transparent 10deg,
          transparent 20deg,
          rgba(255,215,0,0.1) 25deg,
          transparent 30deg,
          transparent 40deg,
          rgba(255,215,0,0.15) 45deg,
          transparent 50deg,
          transparent 60deg,
          rgba(255,215,0,0.1) 65deg,
          transparent 70deg,
          transparent 80deg,
          rgba(255,215,0,0.15) 85deg,
          transparent 90deg
        )
      `,
    }}
    animate={{ rotate: [0, 360] }}
    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
  />
);

// Shooting stars effect
const ShootingStars = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 8 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute h-0.5 rounded-full"
        style={{
          width: 60 + Math.random() * 40,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.8) 50%, #FFD700 100%)',
          top: `${10 + Math.random() * 50}%`,
          left: '-10%',
          boxShadow: '0 0 10px rgba(255,215,0,0.6)',
        }}
        animate={{
          x: ['0%', '150vw'],
          y: ['0%', '20%'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 1.5 + Math.random() * 0.5,
          delay: i * 0.8 + Math.random() * 2,
          repeat: Infinity,
          repeatDelay: 4 + Math.random() * 3,
          ease: 'linear',
        }}
      />
    ))}
  </div>
);

// Sparkle stars - Enhanced
const SparkleStars = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        initial={{ scale: 0, opacity: 0, rotate: 0 }}
        animate={{
          scale: [0, 1.5, 0],
          opacity: [0, 1, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 1.2,
          delay: i * 0.15,
          repeat: Infinity,
          repeatDelay: 2.5,
        }}
      >
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-300" style={{ filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))' }} />
      </motion.div>
    ))}
  </div>
);

// Floating hearts for victory
const FloatingHearts = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          left: `${10 + Math.random() * 80}%`,
          bottom: '-5%',
        }}
        animate={{
          y: [0, -window.innerHeight - 100],
          x: [0, (Math.random() - 0.5) * 80],
          rotate: [0, (Math.random() - 0.5) * 60],
          scale: [0.5, 1.2, 0.8],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 4 + Math.random() * 2,
          delay: i * 0.3,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        <Heart className="w-6 h-6 text-pink-400 fill-pink-400" style={{ filter: 'drop-shadow(0 2px 4px rgba(236,72,153,0.5))' }} />
      </motion.div>
    ))}
  </div>
);

// Victory ribbon banner
const VictoryRibbon = () => (
  <motion.div
    className="absolute top-0 left-0 right-0 overflow-hidden pointer-events-none"
    initial={{ y: -100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
  >
    <div 
      className="relative mx-auto w-[85%] max-w-sm py-3 text-center"
      style={{
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FF8C00 75%, #FFD700 100%)',
        clipPath: 'polygon(0 0, 100% 0, 95% 50%, 100% 100%, 0 100%, 5% 50%)',
        boxShadow: '0 6px 20px rgba(255,152,0,0.4)',
      }}
    >
      <motion.span 
        className="text-sm font-black text-amber-900 uppercase tracking-widest"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🏆 CHAMPION 🏆
      </motion.span>
    </div>
    {/* Ribbon tails */}
    <div className="absolute top-full left-[7.5%] w-4 h-8" style={{ background: 'linear-gradient(180deg, #FFA500 0%, #E65100 100%)', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
    <div className="absolute top-full right-[7.5%] w-4 h-8" style={{ background: 'linear-gradient(180deg, #FFA500 0%, #E65100 100%)', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
  </motion.div>
);

// Premium shimmer effect
const ShimmerEffect = ({ className }: { className?: string }) => (
  <motion.div
    className={cn("absolute inset-0 -translate-x-full overflow-hidden", className)}
    animate={{ translateX: ['100%', '-100%'] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
  >
    <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12" />
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
          ? 'radial-gradient(ellipse at 50% 20%, rgba(255,215,0,0.15) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(255,107,107,0.08) 0%, transparent 40%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)'
          : 'radial-gradient(ellipse at 50% 50%, rgba(100,100,100,0.08) 0%, transparent 50%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)',
      }}
    >
      {/* Background effects for winner - Enhanced */}
      {isWinner && <LightRays />}
      {isWinner && <ShootingStars />}
      {isWinner && <PremiumConfetti />}
      {isWinner && <PremiumFloatingCoins />}
      {isWinner && <PremiumFireworks />}
      {isWinner && <SparkleStars />}
      {isWinner && <FloatingHearts />}
      {isWinner && <VictoryRibbon />}
      
      {/* Sound toggle button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={toggleSound}
        className="absolute top-16 right-4 p-3 rounded-xl backdrop-blur-md transition-all z-50 bg-card/80 border border-border/50 hover:border-primary/50"
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
            initial={{ scale: 0.2, opacity: 0, y: 80, rotateX: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 14, delay: 0.15 }}
            className="w-full max-w-sm relative z-10"
            style={{ perspective: '1000px' }}
          >
            {/* Premium Result Card */}
            <motion.div
              className="relative rounded-3xl overflow-hidden"
              initial={{ rotateY: -10 }}
              animate={{ rotateY: 0 }}
              transition={{ delay: 0.3, type: 'spring' }}
              style={{
                boxShadow: isWinner
                  ? '0 0 100px rgba(255,215,0,0.3), 0 30px 80px rgba(0,0,0,0.5)'
                  : '0 25px 60px rgba(0,0,0,0.4)',
              }}
            >
              {/* Outer gradient border - Animated */}
              <motion.div 
                className="absolute inset-0 rounded-3xl"
                animate={isWinner ? { 
                  background: [
                    'linear-gradient(0deg, #FFD700 0%, #FF8C00 50%, #FFD700 100%)',
                    'linear-gradient(180deg, #FFD700 0%, #FF8C00 50%, #FFD700 100%)',
                    'linear-gradient(360deg, #FFD700 0%, #FF8C00 50%, #FFD700 100%)',
                  ]
                } : {}}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  background: isWinner
                    ? 'linear-gradient(135deg, #FFD700 0%, #FF8C00 25%, #FFD700 50%, #FF6B00 75%, #FFD700 100%)'
                    : 'linear-gradient(135deg, hsl(var(--border)) 0%, hsl(var(--muted)) 50%, hsl(var(--border)) 100%)',
                  padding: '3px',
                }}
              />
              
              {/* Animated border shimmer */}
              {isWinner && (
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-60"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                  }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 0.3 }}
                />
              )}
              
              <div className="relative m-[3px] rounded-[21px] bg-card/95 backdrop-blur-xl p-6 overflow-hidden">
                {/* Inner gradient glow */}
                <div 
                  className="absolute inset-0 opacity-50 pointer-events-none"
                  style={{
                    background: isWinner 
                      ? 'radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.25) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(255,107,0,0.1) 0%, transparent 40%)'
                      : 'radial-gradient(ellipse at 50% 0%, hsl(var(--muted)/0.3) 0%, transparent 50%)',
                  }}
                />

                {/* Result Icon */}
                <motion.div
                  initial={{ y: -80, rotate: -15, scale: 0.3 }}
                  animate={{ y: 0, rotate: 0, scale: 1 }}
                  transition={{ delay: 0.25, type: 'spring', stiffness: 120, damping: 10 }}
                  className="text-center mb-5 relative"
                >
                  {isWinner ? (
                    <motion.div className="relative inline-block">
                      {/* Multiple pulsing glow rings */}
                      <motion.div
                        className="absolute -inset-5 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.25) 0%, transparent 70%)' }}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute -inset-8 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)' }}
                        animate={{ scale: [1.3, 1, 1.3], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2.2, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="absolute -inset-12 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)' }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 2.8, repeat: Infinity, delay: 0.4 }}
                      />
                      
                      {/* Trophy container with enhanced 3D effect */}
                      <motion.div
                        animate={{ 
                          scale: [1, 1.05, 1], 
                          rotate: [0, -3, 3, 0],
                          y: [0, -3, 0],
                        }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        className="relative inline-flex p-6 rounded-2xl"
                        style={{
                          background: 'linear-gradient(180deg, #FFF59D 0%, #FFE082 15%, #FFD54F 30%, #FFCA28 50%, #FFB300 70%, #FF8F00 85%, #E65100 100%)',
                          boxShadow: '0 12px 50px rgba(255,152,0,0.6), inset 0 3px 15px rgba(255,255,255,0.6), inset 0 -5px 15px rgba(0,0,0,0.25)',
                          border: '2px solid rgba(255,255,255,0.3)',
                        }}
                      >
                        {/* Animated highlight */}
                        <motion.div
                          className="absolute inset-0 rounded-2xl pointer-events-none"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
                          }}
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        
                        {/* Floating crown on top */}
                        <motion.div
                          className="absolute -top-5 left-1/2 -translate-x-1/2"
                          animate={{ 
                            y: [0, -6, 0],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Crown 
                            className="w-10 h-10 text-yellow-200 fill-yellow-100" 
                            style={{ filter: 'drop-shadow(0 3px 8px rgba(255,200,0,0.6))' }} 
                          />
                        </motion.div>
                        
                        {/* Medal decorations on sides */}
                        <motion.div
                          className="absolute -left-3 top-1/2 -translate-y-1/2"
                          animate={{ rotate: [0, 10, 0], scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                        >
                          <Medal className="w-6 h-6 text-amber-300" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                        </motion.div>
                        <motion.div
                          className="absolute -right-3 top-1/2 -translate-y-1/2"
                          animate={{ rotate: [0, -10, 0], scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        >
                          <Medal className="w-6 h-6 text-amber-300" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                        </motion.div>
                        
                        <Trophy className="w-14 h-14 text-white relative z-10" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))' }} />
                        
                        {/* Enhanced sparkles around trophy */}
                        {[...Array(8)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute"
                            style={{
                              left: `${10 + (i % 4) * 25}%`,
                              top: `${15 + Math.floor(i / 4) * 55}%`,
                            }}
                            animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0], rotate: [0, 180, 360] }}
                            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity, repeatDelay: 1.5 }}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-100" />
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
