import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Dices, Wallet, Trophy, Users, Zap, UserPlus, Info, 
  Gamepad2, Star, Play, ChevronRight, Shield, Timer, Gift, Flame
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
    <div className="min-h-screen bg-[#0A0A0F] relative overflow-hidden">
      {/* Subtle gradient background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 100% 100%, rgba(236, 72, 153, 0.06) 0%, transparent 40%),
            #0A0A0F
          `,
        }}
      />

      {/* Dot pattern overlay */}
      <div 
        className="fixed inset-0 -z-5 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 px-4 pt-6 pb-28">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* Game Icon */}
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            }}
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Dices className="w-8 h-8 text-white" />
          </motion.div>

          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
            Ludo Arena
          </h1>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            Win up to ₹{rewardAmount.toFixed(0)}
          </p>
        </motion.div>

        {/* Live Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-6 mb-8"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-gray-400">
              <span className="text-green-400 font-semibold">{liveUsers}</span> playing
            </span>
          </div>
          <div className="h-3 w-px bg-gray-800" />
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-gray-400">
              <span className="text-amber-400 font-semibold">₹50L+</span> won
            </span>
          </div>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 p-4 rounded-2xl bg-gray-900/50 border border-gray-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">Balance</p>
                <p className="font-bold text-xl text-white">₹{walletBalance.toFixed(0)}</p>
              </div>
            </div>
            <Link to="/wallet">
              <Button 
                size="sm" 
                className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl border-0"
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Add Cash
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Play Modes */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3 mb-6"
          >
            {/* VS Bot */}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={startMatchmaking}
              disabled={walletBalance < entryAmount}
              className="relative h-[72px] rounded-2xl overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed group"
              style={{
                background: walletBalance >= entryAmount
                  ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                  : '#1F2937',
              }}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1">
                <Gamepad2 className="w-5 h-5 text-white" />
                <span className="font-semibold text-white text-sm">Play Now</span>
              </div>
            </motion.button>

            {/* With Friend */}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPlayWithFriend}
              className="relative h-[72px] rounded-2xl overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
              }}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1">
                <UserPlus className="w-5 h-5 text-white" />
                <span className="font-semibold text-white text-sm">With Friend</span>
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
                className="w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-2xl border-0"
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

        {/* Insufficient Balance */}
        {user && walletBalance < entryAmount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-red-400 text-sm font-medium">Low Balance</p>
                <p className="text-xs text-gray-500">
                  Need ₹{(entryAmount - walletBalance).toFixed(0)} more
                </p>
              </div>
              <Link to="/wallet">
                <Button 
                  size="sm" 
                  className="h-8 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg"
                >
                  Add
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-2 mb-6"
        >
          {[
            { icon: Shield, label: 'Fair Play', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { icon: Timer, label: 'Quick Pay', color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { icon: Gift, label: 'Rewards', color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((feature, idx) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className={`p-3 rounded-xl ${feature.bg} text-center`}
            >
              <feature.icon className={`w-4 h-4 mx-auto mb-1.5 ${feature.color}`} />
              <p className="text-[10px] text-gray-400 font-medium">{feature.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-2 mb-6"
        >
          {/* Friends */}
          {user && (
            <Link to="/friends">
              <motion.div
                whileHover={{ x: 4 }}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-900/50 border border-gray-800 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Friends</p>
                    <p className="text-[10px] text-gray-500">Invite & earn bonus</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </motion.div>
            </Link>
          )}

          {/* Leaderboard */}
          <motion.div
            whileHover={{ x: 4 }}
            className="flex items-center justify-between p-4 rounded-xl bg-gray-900/50 border border-gray-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">Leaderboard</p>
                <p className="text-[10px] text-gray-500">Top winners today</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                LIVE
              </span>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </div>
          </motion.div>
        </motion.div>

        {/* Rules Link */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Link 
            to="/ludo/rules" 
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Rules & Fair Play Policy
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default LudoLobby;
