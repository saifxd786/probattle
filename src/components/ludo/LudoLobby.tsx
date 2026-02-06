import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Dices, Wallet, Trophy, Users, Zap, UserPlus, Info, 
  ChevronRight, Shield, Timer, Gift, Flame, ArrowLeft, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LudoAvatarPicker from './LudoAvatarPicker';

interface LudoLobbyProps {
  user: any;
  walletBalance: number;
  entryAmount: number;
  setEntryAmount: (amount: number) => void;
  playerMode: 2 | 3 | 4;
  setPlayerMode: (mode: 2 | 3 | 4) => void;
  settings: {
    minEntryAmount: number;
    rewardMultiplier: number;
  };
  liveUsers: string;
  startMatchmaking: () => void;
  onPlayWithFriend: () => void;
  selectedAvatar: string | null;
  onSelectAvatar: (avatar: string | null) => void;
  userAvatar?: string | null;
}

const ENTRY_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000, 5000];
const HOT_AMOUNT = 200;

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
  selectedAvatar,
  onSelectAvatar,
  userAvatar,
}: LudoLobbyProps) => {
  const navigate = useNavigate();

  // Calculate reward based on mode
  const getMultiplier = () => {
    switch (playerMode) {
      case 2: return 1.5;
      case 3: return 2.5;
      case 4: return 3.5;
      default: return 1.5;
    }
  };

  const winAmount = Math.floor(entryAmount * getMultiplier());

  return (
    <div className="h-[100dvh] bg-[#0A0A0F] relative overflow-hidden flex flex-col">
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

      <div className="relative z-10 px-4 pt-4 pb-4 flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="w-9 h-9 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
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
                  Win up to ₹{winAmount}
                </p>
              </div>
            </div>

            {user && (
              <LudoAvatarPicker
                userAvatar={userAvatar}
                selectedAvatar={selectedAvatar}
                onSelectAvatar={onSelectAvatar}
              />
            )}
          </div>
        </motion.div>

        {/* Live Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-4 mb-4"
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            <span className="text-[11px] text-gray-400">
              <span className="text-green-400 font-semibold">{liveUsers}</span> playing
            </span>
          </div>
          <div className="h-3 w-px bg-gray-800" />
          <div className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] text-gray-400">
              <span className="text-amber-400 font-semibold">₹50L+</span> won
            </span>
          </div>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3.5 rounded-xl bg-gray-900/60 border border-gray-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Balance</p>
                <p className="font-bold text-xl text-white">₹{walletBalance.toFixed(0)}</p>
              </div>
            </div>
            <Link to="/wallet">
              <Button 
                size="sm" 
                className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg border-0"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                ADD CASH
              </Button>
            </Link>
          </div>
        </motion.div>

        {user ? (
          <>
            {/* Game Mode */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-4"
            >
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Game Mode</p>
              <div className="grid grid-cols-2 gap-3">
                {/* 1 vs 1 */}
                <button
                  onClick={() => setPlayerMode(2)}
                  className={`relative p-3.5 rounded-xl border transition-all ${
                    playerMode === 2
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      playerMode === 2 ? 'bg-emerald-500/20' : 'bg-gray-800'
                    }`}>
                      <Dices className={`w-5 h-5 ${playerMode === 2 ? 'text-emerald-400' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">1 vs 1</p>
                      <p className="text-[10px] text-emerald-400">Head to Head</p>
                    </div>
                  </div>
                  {playerMode === 2 && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>

                {/* 4 Player */}
                <button
                  onClick={() => setPlayerMode(4)}
                  className={`relative p-3.5 rounded-xl border transition-all ${
                    playerMode === 4
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-emerald-500 rounded text-[8px] font-bold text-white">
                    NEW
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      playerMode === 4 ? 'bg-emerald-500/20' : 'bg-gray-800'
                    }`}>
                      <Users className={`w-5 h-5 ${playerMode === 4 ? 'text-emerald-400' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">4 Player</p>
                      <p className="text-[10px] text-gray-500">Battle Royale</p>
                    </div>
                  </div>
                  {playerMode === 4 && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Entry Amount */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4"
            >
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Entry Amount</p>
              <div className="grid grid-cols-4 gap-2">
                {ENTRY_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setEntryAmount(amount)}
                    className={`relative py-3 px-2 rounded-xl border transition-all ${
                      entryAmount === amount
                        ? 'bg-emerald-500/15 border-emerald-500/50'
                        : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {amount === HOT_AMOUNT && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-pink-500 rounded text-[7px] font-bold text-white">
                        HOT
                      </div>
                    )}
                    <span className={`font-bold text-sm ${
                      entryAmount === amount ? 'text-emerald-400' : 'text-white'
                    }`}>
                      ₹{amount}
                    </span>
                    {entryAmount === amount && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Winner Gets */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-4 p-3.5 rounded-xl bg-gray-900/60 border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Winner Gets</p>
                    <p className="font-bold text-xl text-emerald-400">₹{winAmount}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">Multiplier</p>
                  <p className="font-bold text-lg text-white">{getMultiplier()}x</p>
                </div>
              </div>
            </motion.div>

            {/* Play Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="grid grid-cols-2 gap-3 mb-4"
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={startMatchmaking}
                disabled={walletBalance < entryAmount}
                className="h-12 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: walletBalance >= entryAmount 
                    ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                    : '#374151',
                }}
              >
                <Dices className="w-4 h-4" />
                Play Now
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onPlayWithFriend}
                className="h-12 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                }}
              >
                <UserPlus className="w-4 h-4" />
                With Friend
              </motion.button>
            </motion.div>

            {/* Features Row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-3 gap-2 mb-4"
            >
              {[
                { icon: Shield, label: 'Fair Play', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { icon: Timer, label: 'Quick Pay', color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { icon: Gift, label: 'Rewards', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className={`p-2.5 rounded-xl ${feature.bg} flex items-center justify-center gap-1.5 border border-gray-800/50`}
                >
                  <feature.icon className={`w-3.5 h-3.5 ${feature.color}`} />
                  <p className="text-[10px] text-gray-400 font-medium">{feature.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex gap-2"
            >
              <Link to="/friends" className="flex-1">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-900/50 border border-gray-800">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <span className="font-medium text-white text-xs">Friends</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 ml-auto" />
                </div>
              </Link>
              <div className="flex-1">
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
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <Link to="/auth">
              <Button 
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl border-0"
              >
                Login to Play
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Rules Link */}
        <div className="text-center mt-auto pt-4">
          <Link 
            to="/ludo/rules" 
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50"
          >
            <Info className="w-3.5 h-3.5" />
            Rules & Fair Play
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LudoLobby;
