import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Dices, Wallet, Trophy, Users, Zap, UserPlus, Info, 
  ChevronRight, Flame, ArrowLeft, Swords, Crown, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LudoAvatarPicker from './LudoAvatarPicker';
import { cn } from '@/lib/utils';

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

const ENTRY_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000, 2000];

const getModeLabel = (mode: 2 | 3 | 4) => {
  switch (mode) {
    case 2: return '1v1';
    case 3: return '1v1v1';
    case 4: return '1v1v1v1';
  }
};

const getModeIcon = (mode: 2 | 3 | 4) => {
  switch (mode) {
    case 2: return Swords;
    case 3: return Users;
    case 4: return Crown;
  }
};

const getMultiplier = (mode: 2 | 3 | 4, baseMultiplier: number) => {
  switch (mode) {
    case 2: return baseMultiplier; // 1.5x for 1v1
    case 3: return 2.5; // 2.5x for 1v1v1
    case 4: return 3.5; // 3.5x for 1v1v1v1
  }
};

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
  const validAmounts = ENTRY_AMOUNTS.filter(a => a >= settings.minEntryAmount);
  const multiplier = getMultiplier(playerMode, settings.rewardMultiplier);
  const potentialWin = entryAmount * multiplier;
  const canAfford = walletBalance >= entryAmount;

  return (
    <div className="h-[100dvh] bg-[#0A0A0F] relative overflow-hidden flex flex-col">
      {/* Subtle gradient background */}
      <div 
        className="fixed inset-0 -z-10 pointer-events-none"
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
        className="fixed inset-0 -z-5 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 px-4 pt-4 pb-4 flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Back Button */}
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
                  Play & Win Real Cash
                </p>
              </div>
            </div>

            {/* Avatar Picker */}
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

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-gray-900/50 border border-gray-800"
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

        {user ? (
          <>
            {/* Entry Amount Selector */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-4"
            >
              <p className="text-xs text-gray-400 mb-2 font-medium">Select Entry Amount</p>
              <div className="grid grid-cols-4 gap-2">
                {validAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setEntryAmount(amount)}
                    disabled={walletBalance < amount}
                    className={cn(
                      "py-2.5 rounded-xl text-sm font-bold transition-all border",
                      entryAmount === amount
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-lg shadow-indigo-500/20"
                        : walletBalance >= amount
                        ? "bg-gray-900/60 text-white border-gray-700 hover:border-gray-600"
                        : "bg-gray-900/30 text-gray-600 border-gray-800 cursor-not-allowed"
                    )}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Player Mode Selector */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4"
            >
              <p className="text-xs text-gray-400 mb-2 font-medium">Select Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map((mode) => {
                  const ModeIcon = getModeIcon(mode);
                  const modeMultiplier = getMultiplier(mode, settings.rewardMultiplier);
                  return (
                    <button
                      key={mode}
                      onClick={() => setPlayerMode(mode)}
                      className={cn(
                        "py-3 px-2 rounded-xl transition-all border flex flex-col items-center gap-1",
                        playerMode === mode
                          ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/50 text-white"
                          : "bg-gray-900/60 border-gray-700 text-gray-300 hover:border-gray-600"
                      )}
                    >
                      <ModeIcon className={cn(
                        "w-5 h-5",
                        playerMode === mode ? "text-amber-400" : "text-gray-500"
                      )} />
                      <span className="font-bold text-sm">{getModeLabel(mode)}</span>
                      <span className={cn(
                        "text-[10px] font-semibold",
                        playerMode === mode ? "text-amber-400" : "text-gray-500"
                      )}>
                        {modeMultiplier}x
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Potential Win Display */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400">Entry Fee</p>
                  <p className="text-lg font-bold text-white">₹{entryAmount}</p>
                </div>
                <div className="text-2xl text-gray-600">→</div>
                <div className="text-right">
                  <p className="text-[10px] text-amber-400">Win Up To</p>
                  <p className="text-xl font-bold text-amber-400">₹{potentialWin.toFixed(0)}</p>
                </div>
              </div>
            </motion.div>

            {/* Find a Match Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-3"
            >
              <button
                onClick={() => startMatchmaking()}
                disabled={!canAfford}
                className={cn(
                  "w-full h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all",
                  canAfford
                    ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                )}
              >
                <Play className="w-5 h-5" />
                Find a Match
              </button>
              {!canAfford && (
                <p className="text-center text-xs text-red-400 mt-1">Insufficient balance</p>
              )}
            </motion.div>

            {/* Play With Friend Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-4"
            >
              <button
                onClick={onPlayWithFriend}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                }}
              >
                <UserPlus className="w-4 h-4 text-white" />
                <span className="font-semibold text-white text-sm">Play With Friend</span>
              </button>
            </motion.div>

            {/* Quick Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex gap-2"
            >
              <Link to="/friends" className="flex-1">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-white text-sm">Friends</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 ml-auto" />
                </div>
              </Link>
              <Link to="/ludo/rules" className="flex-1">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                  <Info className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-white text-sm">Rules</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 ml-auto" />
                </div>
              </Link>
            </motion.div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Link to="/auth" className="w-full">
              <Button 
                className="w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-lg rounded-xl border-0"
              >
                Login to Play
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default LudoLobby;
