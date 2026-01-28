import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, XCircle, Sparkles, ArrowRight, Volume2, VolumeX, RotateCcw, Crown, Coins, Star, Zap } from 'lucide-react';
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
    {Array.from({ length: 100 }).map((_, i) => {
      const colors = [
        'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        'linear-gradient(135deg, #FFE082 0%, #FFB300 100%)',
        'linear-gradient(135deg, #FFFFFF 0%, #E0E0E0 100%)',
        'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)',
        'linear-gradient(135deg, #81C784 0%, #388E3C 100%)',
        'linear-gradient(135deg, #F48FB1 0%, #C2185B 100%)',
      ];
      const isCircle = Math.random() > 0.6;
      const isStar = Math.random() > 0.8;
      
      return (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            width: isStar ? 16 : Math.random() * 12 + 6,
            height: isStar ? 16 : Math.random() * 12 + 6,
            background: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: isCircle ? '50%' : isStar ? '0' : '3px',
            clipPath: isStar ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : undefined,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          initial={{ y: -30, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: '130vh',
            opacity: [1, 1, 0.9, 0],
            rotate: Math.random() * 1440 - 720,
            scale: [1, 1.4, 0.5],
            x: [0, (Math.random() - 0.5) * 150],
          }}
          transition={{
            duration: 4.5 + Math.random() * 2.5,
            delay: Math.random() * 1.2,
            repeat: Infinity,
            repeatDelay: Math.random() * 2.5,
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
    {Array.from({ length: 25 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{ 
          left: `${3 + Math.random() * 94}%`,
          fontSize: 24 + Math.random() * 16,
        }}
        initial={{ y: '110vh', opacity: 0, rotateY: 0 }}
        animate={{
          y: '-15vh',
          opacity: [0, 1, 1, 0.8, 0],
          rotateY: [0, 360, 720, 1080],
          scale: [0.7, 1.3, 1, 0.8],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          delay: i * 0.12,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        <span className="drop-shadow-lg">🪙</span>
      </motion.div>
    ))}
  </div>
);

// Premium firework bursts with trails
const PremiumFireworks = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 6 }).map((_, burstIdx) => (
      <motion.div
        key={burstIdx}
        className="absolute"
        style={{
          left: `${10 + burstIdx * 15}%`,
          top: `${15 + Math.random() * 35}%`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }}
        transition={{
          duration: 1.8,
          delay: burstIdx * 0.35,
          repeat: Infinity,
          repeatDelay: 2.5,
        }}
      >
        {Array.from({ length: 16 }).map((_, sparkIdx) => {
          const angle = (sparkIdx * 22.5 * Math.PI) / 180;
          const distance = 50 + Math.random() * 30;
          const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF69B4', '#00FF00', '#FFA500', '#00CED1'];
          
          return (
            <motion.div
              key={sparkIdx}
              className="absolute rounded-full"
              style={{
                width: 4 + Math.random() * 4,
                height: 4 + Math.random() * 4,
                background: `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]} 0%, transparent 70%)`,
                boxShadow: `0 0 6px ${colors[Math.floor(Math.random() * colors.length)]}`,
              }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                opacity: [1, 1, 0],
                scale: [1.5, 0.8, 0],
              }}
              transition={{
                duration: 1,
                delay: burstIdx * 0.35,
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

// Radiant light rays behind trophy
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

// Premium sparkle stars
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
          rotate: [0, 180],
        }}
        transition={{
          duration: 1.2,
          delay: i * 0.15,
          repeat: Infinity,
          repeatDelay: 2.5,
        }}
      >
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-300 drop-shadow-lg" />
      </motion.div>
    ))}
  </div>
);

const GameResult = ({ isWinner, rewardAmount, entryAmount, playerName, onPlayAgain, onGoHome, showRematch, onRematch }: GameResultProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Delay content reveal for dramatic effect
    const timer = setTimeout(() => setShowContent(true), 300);
    
    // Play result sound and haptic
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
          ? 'radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.15) 0%, transparent 50%), linear-gradient(180deg, rgba(15,12,8,0.98) 0%, rgba(10,8,5,0.99) 100%)'
          : 'radial-gradient(ellipse at 50% 50%, rgba(100,100,100,0.1) 0%, transparent 50%), linear-gradient(180deg, rgba(15,15,18,0.98) 0%, rgba(8,8,10,0.99) 100%)',
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
        className="absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all z-50"
        style={{
          background: 'linear-gradient(135deg, rgba(50,50,50,0.8) 0%, rgba(30,30,30,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        }}
      >
        {soundEnabled ? (
          <Volume2 className="w-5 h-5 text-white/80" />
        ) : (
          <VolumeX className="w-5 h-5 text-white/40" />
        )}
      </motion.button>
      
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
            className="w-full max-w-sm relative z-10"
          >
            {/* Premium Result Card */}
            <motion.div
              className="relative rounded-3xl p-1 overflow-hidden"
              style={{
                background: isWinner
                  ? 'linear-gradient(135deg, #FFD700 0%, #FF8C00 25%, #FFD700 50%, #FF6B00 75%, #FFD700 100%)'
                  : 'linear-gradient(135deg, #4A4A4A 0%, #2A2A2A 50%, #4A4A4A 100%)',
                boxShadow: isWinner
                  ? '0 0 60px rgba(255,215,0,0.4), 0 20px 50px rgba(0,0,0,0.5)'
                  : '0 20px 50px rgba(0,0,0,0.5)',
              }}
            >
              {/* Animated border shimmer */}
              {isWinner && (
                <motion.div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                  }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                />
              )}
              
              <div 
                className="relative rounded-[22px] p-6 overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(25,22,18,0.98) 0%, rgba(18,15,12,0.99) 100%)',
                }}
              >
                {/* Inner glow */}
                {isWinner && (
                  <div 
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.3) 0%, transparent 60%)',
                    }}
                  />
                )}

                {/* Result Icon */}
                <motion.div
                  initial={{ y: -80, rotate: -15, scale: 0.5 }}
                  animate={{ y: 0, rotate: 0, scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 150, damping: 12 }}
                  className="text-center mb-6 relative"
                >
                  {isWinner ? (
                    <motion.div className="relative inline-block">
                      {/* Outer glow ring */}
                      <motion.div
                        className="absolute -inset-4 rounded-full"
                        style={{
                          background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
                        }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      
                      {/* Trophy container */}
                      <motion.div
                        animate={{ 
                          scale: [1, 1.05, 1],
                          rotate: [0, -3, 3, -2, 0],
                        }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        className="relative inline-flex p-5 rounded-full"
                        style={{
                          background: `
                            linear-gradient(180deg, 
                              #FFE082 0%, 
                              #FFD54F 20%,
                              #FFCA28 40%, 
                              #FFB300 60%,
                              #FF8F00 80%,
                              #E65100 100%
                            )
                          `,
                          boxShadow: `
                            0 8px 30px rgba(255,152,0,0.5),
                            0 4px 15px rgba(0,0,0,0.3),
                            inset 0 2px 10px rgba(255,255,255,0.5),
                            inset 0 -4px 10px rgba(0,0,0,0.2)
                          `,
                        }}
                      >
                        {/* Crown on top */}
                        <motion.div
                          className="absolute -top-3 left-1/2 -translate-x-1/2"
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Crown className="w-8 h-8 text-yellow-300 fill-yellow-200 drop-shadow-lg" />
                        </motion.div>
                        
                        <Trophy className="w-14 h-14 text-white drop-shadow-lg" />
                        
                        {/* Sparkle effects around trophy */}
                        {[...Array(8)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute"
                            style={{
                              left: `${10 + (i % 4) * 25}%`,
                              top: `${15 + Math.floor(i / 4) * 60}%`,
                            }}
                            animate={{
                              scale: [0, 1.2, 0],
                              opacity: [0, 1, 0],
                              rotate: [0, 180],
                            }}
                            transition={{
                              duration: 1.2,
                              delay: i * 0.15,
                              repeat: Infinity,
                              repeatDelay: 1.5,
                            }}
                          >
                            <Sparkles className="w-4 h-4 text-yellow-200" />
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="inline-flex p-5 rounded-full relative"
                      style={{
                        background: 'linear-gradient(180deg, #5A5A5A 0%, #3A3A3A 50%, #2A2A2A 100%)',
                        boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.1), 0 8px 25px rgba(0,0,0,0.4)',
                      }}
                      animate={{ scale: [1, 0.97, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      <XCircle className="w-14 h-14 text-gray-400" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Result Text */}
                <div className="text-center mb-6">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={cn(
                      'font-display text-3xl font-black mb-2 tracking-wider',
                    )}
                    style={{
                      background: isWinner 
                        ? 'linear-gradient(135deg, #FFE082 0%, #FFD54F 30%, #FFFFFF 50%, #FFD54F 70%, #FF8F00 100%)'
                        : 'linear-gradient(135deg, #888 0%, #666 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: isWinner ? '0 0 30px rgba(255,215,0,0.5)' : 'none',
                    }}
                  >
                    {isWinner ? '🎉 VICTORY! 🎉' : 'GAME OVER'}
                  </motion.h1>
                  
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/60 text-sm"
                  >
                    {isWinner 
                      ? 'Congratulations! You dominated the board!' 
                      : 'Better luck next time, champion!'}
                  </motion.p>
                </div>

                {/* Premium Reward Display */}
                <motion.div
                  initial={{ scale: 0, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                  className="mb-6"
                >
                  <div
                    className={cn(
                      'relative p-5 rounded-2xl overflow-hidden',
                    )}
                    style={{
                      background: isWinner
                        ? 'linear-gradient(135deg, rgba(34,139,34,0.2) 0%, rgba(0,100,0,0.3) 100%)'
                        : 'linear-gradient(135deg, rgba(139,0,0,0.2) 0%, rgba(100,0,0,0.3) 100%)',
                      border: isWinner 
                        ? '2px solid rgba(76,175,80,0.4)'
                        : '2px solid rgba(239,83,80,0.3)',
                      boxShadow: isWinner
                        ? 'inset 0 0 30px rgba(76,175,80,0.1), 0 4px 20px rgba(0,0,0,0.3)'
                        : 'inset 0 0 30px rgba(239,83,80,0.1), 0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    {/* Shimmer effect */}
                    {isWinner && (
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                        }}
                        animate={{ x: ['-150%', '150%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                      />
                    )}
                    
                    <div className="relative flex items-center justify-center gap-3">
                      {isWinner ? (
                        <>
                          <motion.div
                            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.8, delay: 0.7 }}
                          >
                            <Coins className="w-8 h-8 text-yellow-400" />
                          </motion.div>
                          <motion.span 
                            className="text-4xl font-black"
                            style={{
                              background: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              textShadow: '0 0 20px rgba(74,222,128,0.5)',
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.3, 1] }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                          >
                            +₹{rewardAmount}
                          </motion.span>
                          <motion.div
                            animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.8, delay: 0.7 }}
                          >
                            <Zap className="w-7 h-7 text-yellow-400 fill-yellow-300" />
                          </motion.div>
                        </>
                      ) : (
                        <span 
                          className="text-3xl font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #EF5350 0%, #E53935 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          -₹{entryAmount}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-center text-xs text-white/50 mt-2 font-medium">
                      {isWinner ? '💰 Added to your wallet!' : 'Entry fee deducted'}
                    </p>
                  </div>
                </motion.div>

                {/* Premium Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-3"
                >
                  {showRematch && onRematch ? (
                    <motion.button
                      onClick={() => {
                        soundManager.playClick();
                        hapticManager.buttonTap();
                        onRematch();
                      }}
                      className="w-full relative rounded-xl font-bold py-4 overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, #FFE082 0%, #FFD54F 25%, #FFCA28 50%, #FFB300 75%, #FF8F00 100%)',
                        boxShadow: '0 6px 25px rgba(255,152,0,0.4), inset 0 2px 4px rgba(255,255,255,0.5)',
                        border: '2px solid #F57C00',
                      }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
                        }}
                        animate={{ x: ['-150%', '150%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                      />
                      <span className="relative flex items-center justify-center gap-2 text-amber-900 font-black tracking-wide">
                        <RotateCcw className="w-5 h-5" />
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
                      className="w-full relative rounded-xl font-bold py-4 overflow-hidden"
                      style={{
                        background: isWinner 
                          ? 'linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%)'
                          : 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)',
                        boxShadow: isWinner 
                          ? '0 6px 25px rgba(34,197,94,0.4), inset 0 2px 4px rgba(255,255,255,0.3)'
                          : '0 6px 25px rgba(59,130,246,0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
                        border: isWinner ? '2px solid #15803D' : '2px solid #1D4ED8',
                      }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                        }}
                        animate={{ x: ['-150%', '150%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                      />
                      <span className="relative flex items-center justify-center gap-2 text-white font-black tracking-wide">
                        PLAY AGAIN
                        <ArrowRight className="w-5 h-5" />
                      </span>
                    </motion.button>
                  )}
                  
                  <motion.button
                    onClick={() => {
                      soundManager.playClick();
                      hapticManager.buttonTap();
                      onGoHome();
                    }}
                    className="w-full rounded-xl font-semibold py-4 transition-all"
                    style={{
                      background: 'linear-gradient(180deg, rgba(60,60,60,0.8) 0%, rgba(40,40,40,0.9) 100%)',
                      border: '2px solid rgba(100,100,100,0.4)',
                      boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1), 0 4px 15px rgba(0,0,0,0.3)',
                    }}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(70,70,70,0.9)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-white/70 tracking-wide">Back to Home</span>
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
