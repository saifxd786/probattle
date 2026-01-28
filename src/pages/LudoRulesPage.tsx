import { motion } from 'framer-motion';
import { ArrowLeft, Dices, Shield, Clock, Coins, Users, Target, Sparkles, Crown, Zap, Trophy, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';

const rules = [
  {
    icon: Coins,
    title: 'Entry & Rewards',
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    iconColor: 'text-amber-400',
    points: [
      'Minimum entry amount is ₹100',
      'Choose from ₹100, ₹200, ₹500, or ₹1000 entry',
      'Winner receives 1.5x of entry amount as reward',
      'Example: ₹100 entry → ₹150 reward on winning'
    ]
  },
  {
    icon: Users,
    title: 'Game Modes',
    gradient: 'from-primary to-cyan-500',
    bgGradient: 'from-primary/10 to-cyan-500/10',
    iconColor: 'text-primary',
    points: [
      '2-Player Mode: 1v1 quick matches',
      '4-Player Mode: Battle Royale style',
      'Matched with real-time opponents',
      'Each player gets 4 tokens of their color'
    ]
  },
  {
    icon: Clock,
    title: 'Gameplay',
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'from-violet-500/10 to-purple-500/10',
    iconColor: 'text-violet-400',
    points: [
      'Roll dice on your turn',
      'Roll 6 to bring a token out of home',
      'Move tokens based on dice value',
      'Roll 6 to get an extra turn',
      'First to get all 4 tokens home wins'
    ]
  },
  {
    icon: Target,
    title: 'Winning',
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
    iconColor: 'text-green-400',
    points: [
      'Move all 4 tokens to the center home area',
      'Tokens must reach home with exact count',
      'Capture opponent tokens to send them back',
      'Winner takes the full reward amount'
    ]
  },
  {
    icon: Shield,
    title: 'Fair Play',
    gradient: 'from-rose-500 to-pink-500',
    bgGradient: 'from-rose-500/10 to-pink-500/10',
    iconColor: 'text-rose-400',
    points: [
      'Random dice rolls ensure fairness',
      'Anti-cheat systems in place',
      'Matches are monitored for integrity',
      'Rewards credited instantly to wallet'
    ]
  }
];

// Premium shimmer effect
const ShimmerEffect = () => (
  <motion.div
    className="absolute inset-0 -translate-x-full"
    animate={{ translateX: ['100%', '-100%'] }}
    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
  >
    <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />
  </motion.div>
);

// Floating particles background
const FloatingParticles = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(15)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-primary/20"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [-20, 20, -20],
          x: [-10, 10, -10],
          opacity: [0.2, 0.5, 0.2],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 4 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
      />
    ))}
  </div>
);

const LudoRulesPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20 relative">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.05),transparent_50%)] pointer-events-none" />
      <FloatingParticles />
      
      <Header />
      
      <main className="container mx-auto px-4 pt-20 relative z-10">
        {/* Premium Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link 
            to="/ludo" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-all group"
          >
            <motion.div
              className="p-2 rounded-lg bg-card/50 border border-border/50 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all"
              whileHover={{ x: -3 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.div>
            <span className="text-sm font-medium">Back to Ludo</span>
          </Link>
        </motion.div>

        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          {/* Animated Icon */}
          <motion.div 
            className="relative inline-block mb-6"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
            <motion.div
              className="absolute -inset-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <motion.div
                  key={deg}
                  className="absolute w-2 h-2 rounded-full bg-primary/40"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${deg}deg) translateY(-30px)`,
                  }}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: deg / 360 }}
                />
              ))}
            </motion.div>
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary),0.4)]">
              <Dices className="w-10 h-10 text-primary-foreground" />
            </div>
          </motion.div>

          <motion.h1 
            className="font-display text-3xl font-bold mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              LUDO RULES
            </span>
          </motion.h1>
          <motion.p 
            className="text-muted-foreground flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            How to play & win big
            <Sparkles className="w-4 h-4 text-primary" />
          </motion.p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {[
            { icon: Zap, label: 'Min Entry', value: '₹100', color: 'text-amber-400' },
            { icon: Trophy, label: 'Win Rate', value: '1.5x', color: 'text-green-400' },
            { icon: Crown, label: 'Players', value: '2-4', color: 'text-primary' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              className="relative rounded-xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <div className="absolute inset-[1px] rounded-xl bg-card/80 backdrop-blur-sm" />
              <div className="relative p-3 text-center">
                <stat.icon className={cn("w-5 h-5 mx-auto mb-1", stat.color)} />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Premium Rules Cards */}
        <div className="space-y-4">
          {rules.map((section, idx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
              className="relative rounded-2xl overflow-hidden group"
            >
              {/* Card border gradient */}
              <div className={cn("absolute inset-0 bg-gradient-to-r", section.gradient, "opacity-20")} />
              <div className="absolute inset-[1px] rounded-2xl bg-card/90 backdrop-blur-sm" />
              <ShimmerEffect />
              
              <div className="relative p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <motion.div 
                    className={cn(
                      "relative w-12 h-12 rounded-xl flex items-center justify-center",
                      "bg-gradient-to-br", section.bgGradient
                    )}
                    whileHover={{ scale: 1.05, rotate: 5 }}
                  >
                    <div className={cn("absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity", section.gradient)} style={{ opacity: 0.2 }} />
                    <section.icon className={cn("w-6 h-6 relative z-10", section.iconColor)} />
                  </motion.div>
                  <div className="flex-1">
                    <h2 className="font-display text-lg font-bold">{section.title}</h2>
                    <div className={cn("h-0.5 w-12 rounded-full bg-gradient-to-r mt-1", section.gradient)} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                  </div>
                </div>
                
                {/* Points */}
                <ul className="space-y-3">
                  {section.points.map((point, i) => (
                    <motion.li 
                      key={i} 
                      className="flex items-start gap-3 text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 + i * 0.05 }}
                    >
                      <div className={cn(
                        "mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                        "bg-gradient-to-br", section.bgGradient
                      )}>
                        <ChevronRight className={cn("w-3 h-3", section.iconColor)} />
                      </div>
                      <span className="text-muted-foreground leading-relaxed">{point}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pro Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 relative rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-cyan-500/20 to-primary/20" />
          <div className="absolute inset-[1px] rounded-2xl bg-card/95 backdrop-blur-sm" />
          <ShimmerEffect />
          
          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg">Pro Tips</h3>
            </div>
            <div className="grid gap-3">
              {[
                'Always keep one token safe near home',
                'Capture opponents when possible for strategic advantage',
                'Use the extra turn from rolling 6 wisely',
                'Block opponent paths to slow them down'
              ].map((tip, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{tip}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Premium Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 relative rounded-xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10" />
          <div className="absolute inset-[1px] rounded-xl bg-card/80" />
          
          <div className="relative p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              This game involves financial risk. Play responsibly. 
              By playing, you agree to our terms and conditions. 
              Must be 18+ to play.
            </p>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default LudoRulesPage;
