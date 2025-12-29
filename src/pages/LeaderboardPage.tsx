import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Coins, Users, Target } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Fake Indian names leaderboard data
const FAKE_PLAYERS = [
  { id: 1, name: 'Arjun Sharma', username: 'ArjunOP', wins: 147, earnings: 45600, referrals: 23, avatar: 'A' },
  { id: 2, name: 'Priya Patel', username: 'PriyaGamer', wins: 132, earnings: 38900, referrals: 18, avatar: 'P' },
  { id: 3, name: 'Rahul Singh', username: 'RahulKing', wins: 128, earnings: 35200, referrals: 31, avatar: 'R' },
  { id: 4, name: 'Sneha Reddy', username: 'SnehaQueen', wins: 119, earnings: 32100, referrals: 15, avatar: 'S' },
  { id: 5, name: 'Vikram Yadav', username: 'VikramPro', wins: 108, earnings: 29800, referrals: 27, avatar: 'V' },
  { id: 6, name: 'Ananya Gupta', username: 'AnanyaStar', wins: 98, earnings: 27500, referrals: 12, avatar: 'A' },
  { id: 7, name: 'Karthik Nair', username: 'KarthikBeast', wins: 94, earnings: 25100, referrals: 19, avatar: 'K' },
  { id: 8, name: 'Divya Joshi', username: 'DivyaFire', wins: 89, earnings: 23400, referrals: 8, avatar: 'D' },
  { id: 9, name: 'Rohit Kumar', username: 'RohitLegend', wins: 85, earnings: 21800, referrals: 22, avatar: 'R' },
  { id: 10, name: 'Meera Iyer', username: 'MeeraAce', wins: 81, earnings: 19600, referrals: 14, avatar: 'M' },
  { id: 11, name: 'Aditya Verma', username: 'AdityaSniper', wins: 77, earnings: 18200, referrals: 9, avatar: 'A' },
  { id: 12, name: 'Kavitha Pillai', username: 'KavithaX', wins: 73, earnings: 16900, referrals: 16, avatar: 'K' },
  { id: 13, name: 'Suresh Menon', username: 'SureshGod', wins: 69, earnings: 15400, referrals: 11, avatar: 'S' },
  { id: 14, name: 'Lakshmi Rao', username: 'LakshmiPro', wins: 65, earnings: 14100, referrals: 7, avatar: 'L' },
  { id: 15, name: 'Naveen Hegde', username: 'NaveenElite', wins: 61, earnings: 12800, referrals: 20, avatar: 'N' },
];

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return null;
};

const getRankBg = (rank: number) => {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
  if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30';
  if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-600/30';
  return 'bg-secondary/30 border-border/50';
};

type TabType = 'wins' | 'earnings' | 'referrals';

const LeaderboardPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('wins');

  const getSortedPlayers = (tab: TabType) => {
    return [...FAKE_PLAYERS].sort((a, b) => b[tab] - a[tab]);
  };

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'wins': return <Target className="w-4 h-4" />;
      case 'earnings': return <Coins className="w-4 h-4" />;
      case 'referrals': return <Users className="w-4 h-4" />;
    }
  };

  const getTabValue = (player: typeof FAKE_PLAYERS[0], tab: TabType) => {
    switch (tab) {
      case 'wins': return `${player.wins} Wins`;
      case 'earnings': return `₹${player.earnings.toLocaleString()}`;
      case 'referrals': return `${player.referrals} Referrals`;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="font-display text-3xl font-bold text-gradient">Leaderboard</h1>
          </div>
          <p className="text-muted-foreground">Top players competing for glory</p>
        </motion.div>

        {/* Top 3 Podium */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center items-end gap-4 mb-8"
        >
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-400/20 border-2 border-gray-400 flex items-center justify-center mb-2">
              <span className="font-display text-xl font-bold text-gray-400">
                {getSortedPlayers(activeTab)[1]?.avatar}
              </span>
            </div>
            <Medal className="w-6 h-6 text-gray-400 mb-1" />
            <p className="font-medium text-sm text-center">{getSortedPlayers(activeTab)[1]?.username}</p>
            <p className="text-xs text-muted-foreground">{getTabValue(getSortedPlayers(activeTab)[1], activeTab)}</p>
            <div className="w-20 h-16 bg-gray-400/20 rounded-t-lg mt-2" />
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center -mb-4">
            <div className="w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center mb-2 relative">
              <span className="font-display text-2xl font-bold text-yellow-500">
                {getSortedPlayers(activeTab)[0]?.avatar}
              </span>
              <Crown className="w-6 h-6 text-yellow-500 absolute -top-3" />
            </div>
            <p className="font-display font-bold text-center">{getSortedPlayers(activeTab)[0]?.username}</p>
            <p className="text-sm text-primary font-medium">{getTabValue(getSortedPlayers(activeTab)[0], activeTab)}</p>
            <div className="w-24 h-24 bg-yellow-500/20 rounded-t-lg mt-2" />
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-amber-600/20 border-2 border-amber-600 flex items-center justify-center mb-2">
              <span className="font-display text-xl font-bold text-amber-600">
                {getSortedPlayers(activeTab)[2]?.avatar}
              </span>
            </div>
            <Medal className="w-6 h-6 text-amber-600 mb-1" />
            <p className="font-medium text-sm text-center">{getSortedPlayers(activeTab)[2]?.username}</p>
            <p className="text-xs text-muted-foreground">{getTabValue(getSortedPlayers(activeTab)[2], activeTab)}</p>
            <div className="w-20 h-12 bg-amber-600/20 rounded-t-lg mt-2" />
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="wins" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Wins</span>
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-2">
              <Coins className="w-4 h-4" />
              <span className="hidden sm:inline">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Referrals</span>
            </TabsTrigger>
          </TabsList>

          {(['wins', 'earnings', 'referrals'] as TabType[]).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="space-y-3">
                {getSortedPlayers(tab).map((player, index) => {
                  const rank = index + 1;
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`glass-card p-4 flex items-center gap-4 border ${getRankBg(rank)}`}
                    >
                      {/* Rank */}
                      <div className="w-10 text-center">
                        {getRankIcon(rank) || (
                          <span className="font-display text-lg font-bold text-muted-foreground">
                            #{rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${
                        rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                        rank === 2 ? 'bg-gray-400/20 text-gray-400' :
                        rank === 3 ? 'bg-amber-600/20 text-amber-600' :
                        'bg-primary/20 text-primary'
                      }`}>
                        {player.avatar}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{player.name}</p>
                        <p className="text-sm text-muted-foreground">@{player.username}</p>
                      </div>

                      {/* Stats */}
                      <div className="text-right">
                        <p className={`font-display font-bold ${
                          rank <= 3 ? 'text-primary' : ''
                        }`}>
                          {getTabValue(player, tab)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default LeaderboardPage;
