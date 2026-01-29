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
    <div className="h-screen bg-[#0A0A0F] relative overflow-hidden flex flex-col">
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

      <div className="relative z-10 px-4 pt-4 pb-24 flex-1 flex flex-col">
        {/* Header - Compact */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-3"
        >
          <div className="flex items-center justify-center gap-3">
            <motion.div
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              }}
            >
              <Dices className="w-5 h-5 text-white" />
            </motion.div>
            <div className="text-left">
              <h1 className="text-lg font-bold text-white tracking-tight">Ludo Arena</h1>
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                Win up to ₹{rewardAmount.toFixed(0)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Live Stats - Compact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-4 mb-3"
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            <span className="text-[10px] text-gray-400">
              <span className="text-green-400 font-semibold">{liveUsers}</span> playing
            </span>
          </div>
          <div className="h-2.5 w-px bg-gray-800" />
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] text-gray-400">
              <span className="text-amber-400 font-semibold">₹50L+</span> won
            </span>
          </div>
        </motion.div>

        {/* Balance Card - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-3 rounded-xl bg-gray-900/50 border border-gray-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-gray-500">Balance</p>
                <p className="font-bold text-lg text-white">₹{walletBalance.toFixed(0)}</p>
              </div>
            </div>
            <Link to="/wallet">
              <Button 
                size="sm" 
                className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg border-0"
              >
                <Zap className="w-3 h-3 mr-1" />
                Add Cash
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Entry Selector - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
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

        {/* Play Modes - Compact */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-2 mb-3"
          >
            {/* VS Bot */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={startMatchmaking}
              disabled={walletBalance < entryAmount}
              className="relative h-14 rounded-xl overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed group"
              style={{
                background: walletBalance >= entryAmount
                  ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                  : '#1F2937',
              }}
            >
              <div className="relative z-10 flex items-center justify-center h-full gap-2">
                <Gamepad2 className="w-4 h-4 text-white" />
                <span className="font-semibold text-white text-sm">Play Now</span>
              </div>
            </motion.button>

            {/* With Friend */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onPlayWithFriend}
              className="relative h-14 rounded-xl overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
              }}
            >
              <div className="relative z-10 flex items-center justify-center h-full gap-2">
                <UserPlus className="w-4 h-4 text-white" />
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
            className="mb-3"
          >
            <Link to="/auth">
              <Button 
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl border-0"
              >
                <Play className="w-4 h-4 mr-2" />
                Login to Play
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Insufficient Balance - Compact */}
        {user && walletBalance < entryAmount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-red-400" />
              <p className="text-red-400 text-xs font-medium flex-1">
                Need ₹{(entryAmount - walletBalance).toFixed(0)} more
              </p>
              <Link to="/wallet">
                <Button 
                  size="sm" 
                  className="h-7 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs"
                >
                  Add
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Features - Compact Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 gap-2 mb-3"
        >
          {[
            { icon: Shield, label: 'Fair Play', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { icon: Timer, label: 'Quick Pay', color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { icon: Gift, label: 'Rewards', color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((feature) => (
            <div
              key={feature.label}
              className={`p-2 rounded-lg ${feature.bg} flex items-center justify-center gap-1.5`}
            >
              <feature.icon className={`w-3.5 h-3.5 ${feature.color}`} />
              <p className="text-[10px] text-gray-400 font-medium">{feature.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Quick Links - Compact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-2 mb-2"
        >
          {user && (
            <Link to="/friends" className="flex-1">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-900/50 border border-gray-800">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="font-medium text-white text-xs">Friends</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600 ml-auto" />
              </div>
            </Link>
          )}
          <div className={`${user ? 'flex-1' : 'w-full'}`}>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-900/50 border border-gray-800">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="font-medium text-white text-xs">Leaderboard</span>
              <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full font-medium ml-auto">
                LIVE
              </span>
            </div>
          </div>
        </motion.div>

        {/* Rules Link */}
        <div className="text-center mt-auto">
          <Link 
            to="/ludo/rules" 
            className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-400"
          >
            <Info className="w-3 h-3" />
            Rules & Fair Play
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LudoLobby;
