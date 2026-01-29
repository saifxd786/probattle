import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Dices, Wallet, Trophy, Users, Zap, UserPlus, Info, 
  Crown, Gamepad2, Star, TrendingUp, Play, Sparkles,
  ChevronRight, Shield, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import EntrySelector from './EntrySelector';

interface LudoLobbyProps {
  user: any;
  walletBalance: number;
  entryAmount: number;
  setEntryAmount: (amount: number) => void;
  playerMode: 2 | 4;
  setPlayerMode: (mode: 2 | 4) => void;
  settings: {
    minEntryAmount: number;
    rewardMultiplier: number;
  };
  liveUsers: string;
  startMatchmaking: () => void;
  onPlayWithFriend: () => void;
}

const ENTRY_AMOUNTS = [100, 200, 500, 1000];

const LudoLobby = ({
  user,
  walletBalance,
  entryAmount,
  setEntryAmount,
  playerMode,
  setPlayerMode,
  settings,
  liveUsers,
  startMatchmaking,
  onPlayWithFriend,
}: LudoLobbyProps) => {
  const rewardAmount = entryAmount * settings.rewardMultiplier;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse at 20% 0%, rgba(79, 70, 229, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 100%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
            linear-gradient(180deg, hsl(var(--background)) 0%, hsl(220, 35%, 4%) 100%)
          `,
        }}
      />

      {/* Floating particles */}
      <div className="fixed inset-0 -z-5 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 px-4 pt-4 pb-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          {/* Logo */}
          <motion.div
            className="relative inline-block mb-4"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div 
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #FFD54F 0%, #FF8F00 50%, #E65100 100%)',
                boxShadow: '0 10px 40px rgba(255, 152, 0, 0.4), inset 0 2px 10px rgba(255, 255, 255, 0.3)',
              }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              <Dices className="w-10 h-10 text-amber-900" />
            </div>
            
            {/* Crown badge */}
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.5)',
                }}
              >
                <Crown className="w-4 h-4 text-amber-900" />
              </div>
            </motion.div>
          </motion.div>

          <h1 className="font-display text-3xl font-black tracking-tight mb-1">
            <span 
              style={{
                background: 'linear-gradient(135deg, #FFD54F 0%, #FFFFFF 50%, #FFD54F 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              LUDO KING
            </span>
          </h1>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-500" />
            Play & Win Real Cash
          </p>
        </motion.div>

        {/* Live Stats Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-6 mb-6"
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-sm text-muted-foreground">
              <span className="text-green-400 font-bold">{liveUsers}</span> Online
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">
              <span className="text-yellow-400 font-bold">₹50L+</span> Won
            </span>
          </div>
        </motion.div>

        {/* Wallet Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 p-4 rounded-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your Balance</p>
                <p className="font-display font-bold text-2xl text-foreground">
                  ₹{walletBalance.toFixed(0)}
                </p>
              </div>
            </div>
            <Link to="/wallet">
              <Button 
                size="sm" 
                className="h-10 px-5 font-bold rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                }}
              >
                + ADD
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Play Buttons */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3 mb-6"
          >
            {/* Play vs Bot */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={startMatchmaking}
              disabled={walletBalance < entryAmount}
              className="relative h-16 rounded-2xl overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: walletBalance >= entryAmount
                  ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)'
                  : 'linear-gradient(135deg, #4B5563 0%, #374151 100%)',
                boxShadow: walletBalance >= entryAmount
                  ? '0 8px 30px rgba(var(--primary-rgb), 0.3)'
                  : 'none',
              }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
              <div className="relative z-10 flex items-center justify-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary-foreground" />
                <span className="font-bold text-primary-foreground">VS BOT</span>
              </div>
            </motion.button>

            {/* Play with Friend */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPlayWithFriend}
              className="relative h-16 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
                boxShadow: '0 8px 30px rgba(139, 92, 246, 0.3)',
              }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
              />
              <div className="relative z-10 flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5 text-white" />
                <span className="font-bold text-white">WITH FRIEND</span>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Login Prompt */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Link to="/auth">
              <Button 
                className="w-full h-14 text-sm font-bold rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)',
                  boxShadow: '0 8px 30px rgba(var(--primary-rgb), 0.3)',
                }}
              >
                <Play className="w-5 h-5 mr-2" />
                Login to Play
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Entry Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <EntrySelector
            amounts={ENTRY_AMOUNTS.filter(a => a >= settings.minEntryAmount)}
            selectedAmount={entryAmount}
            onSelect={setEntryAmount}
            rewardMultiplier={settings.rewardMultiplier}
            playerMode={playerMode}
            onPlayerModeChange={setPlayerMode}
          />
        </motion.div>

        {/* Insufficient Balance Warning */}
        {user && walletBalance < entryAmount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239, 68, 68, 0.2)' }}
              >
                <Wallet className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-red-400 text-sm font-medium">Insufficient Balance</p>
                <p className="text-xs text-muted-foreground">
                  Add ₹{(entryAmount - walletBalance).toFixed(0)} more to play
                </p>
              </div>
              <Link to="/wallet">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Add
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { icon: Shield, label: 'Fair Play', color: '#10B981' },
            { icon: Timer, label: 'Instant Pay', color: '#8B5CF6' },
            { icon: Star, label: '24/7 Support', color: '#F59E0B' },
          ].map((feature, idx) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className="p-3 rounded-xl text-center"
              style={{
                background: `linear-gradient(135deg, ${feature.color}10 0%, ${feature.color}05 100%)`,
                border: `1px solid ${feature.color}20`,
              }}
            >
              <feature.icon 
                className="w-5 h-5 mx-auto mb-1.5" 
                style={{ color: feature.color }} 
              />
              <p className="text-xs text-muted-foreground font-medium">{feature.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Friends Card */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-6"
          >
            <Link to="/friends">
              <motion.div
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                className="p-4 rounded-2xl cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)',
                        boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                      }}
                    >
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Friends</p>
                      <p className="text-xs text-muted-foreground">Invite & play together</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-cyan-400" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        )}

        {/* Rules Link */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Link 
            to="/ludo/rules" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-4 h-4" />
            Rules & Fair Play
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default LudoLobby;
