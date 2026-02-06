import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Dices, Wallet, Trophy, Users, Zap, UserPlus, Info, 
  ChevronRight, Shield, Timer, Gift, Flame, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LudoAvatarPicker from './LudoAvatarPicker';
import FindMatchChallenges from './FindMatchChallenges';

interface BotChallenge {
  id: string;
  bot: { name: string; avatar: string };
  entryAmount: number;
  playerMode: 2 | 3 | 4;
  isHot: boolean;
  waitingTime: number;
}

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
  startMatchmaking: (challenge?: BotChallenge) => void;
  onPlayWithFriend: () => void;
  selectedAvatar: string | null;
  onSelectAvatar: (avatar: string | null) => void;
  userAvatar?: string | null;
}

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

  const handleAcceptChallenge = (challenge: BotChallenge) => {
    setEntryAmount(challenge.entryAmount);
    setPlayerMode(challenge.playerMode);
    // Small delay to update state then start
    setTimeout(() => startMatchmaking(challenge), 100);
  };

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

      <div className="relative z-10 px-4 pt-4 pb-2 flex-1 flex flex-col min-h-0">
        {/* Header - Compact with Back Button and Avatar Picker */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
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
                  Accept a challenge below
                </p>
              </div>
            </div>

            {/* Avatar Picker - Top Right */}
            {user && (
              <LudoAvatarPicker
                userAvatar={userAvatar}
                selectedAvatar={selectedAvatar}
                onSelectAvatar={onSelectAvatar}
              />
            )}
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

        {/* Find Match Challenges - Main Section */}
        {user ? (
          <div className="flex-1 min-h-0 overflow-hidden mb-2">
            <FindMatchChallenges
              minEntryAmount={settings.minEntryAmount}
              walletBalance={walletBalance}
              rewardMultiplier={settings.rewardMultiplier}
              onAcceptChallenge={handleAcceptChallenge}
            />
          </div>
        ) : (
          <div className="mb-3">
            <Link to="/auth">
              <Button 
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl border-0"
              >
                Login to Play
              </Button>
            </Link>
          </div>
        )}

        {/* Bottom Fixed Section */}
        <div className="flex-shrink-0 space-y-2">
          {/* With Friend Button */}
          {user && (
            <button
              onClick={onPlayWithFriend}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
              }}
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span className="font-semibold text-white text-sm">Play With Friend</span>
            </button>
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
        <div className="text-center mt-auto pt-2 pb-2">
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
