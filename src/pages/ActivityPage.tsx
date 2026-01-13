import { motion } from 'framer-motion';
import { Activity, ArrowLeft, Trophy, Target, Flame, Users, Star, Gift } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ReferralSection from '@/components/ReferralSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyBonus } from '@/hooks/useDailyBonus';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  target: number;
  unlocked: boolean;
  reward: string;
};

const ActivityPage = () => {
  const { user, isLoading } = useAuth();
  const { bonusData } = useDailyBonus();
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchReferralCount();
    }
  }, [user]);

  const fetchReferralCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id);
    setReferralCount(count || 0);
  };

  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'First Steps',
      description: 'Complete your first login',
      icon: <Star className="w-5 h-5" />,
      progress: bonusData?.streak || 0 > 0 ? 1 : 0,
      target: 1,
      unlocked: (bonusData?.streak || 0) > 0,
      reward: '+10 Coins',
    },
    {
      id: '2',
      title: 'Week Warrior',
      description: '7-day login streak',
      icon: <Flame className="w-5 h-5" />,
      progress: Math.min(bonusData?.streak || 0, 7),
      target: 7,
      unlocked: (bonusData?.streak || 0) >= 7,
      reward: '+50 Coins',
    },
    {
      id: '3',
      title: 'Streak Master',
      description: '30-day login streak',
      icon: <Trophy className="w-5 h-5" />,
      progress: Math.min(bonusData?.streak || 0, 30),
      target: 30,
      unlocked: (bonusData?.streak || 0) >= 30,
      reward: '+200 Coins',
    },
    {
      id: '4',
      title: 'Social Star',
      description: 'Refer 5 friends',
      icon: <Users className="w-5 h-5" />,
      progress: Math.min(referralCount, 5),
      target: 5,
      unlocked: referralCount >= 5,
      reward: '+₹50',
    },
    {
      id: '5',
      title: 'Influencer',
      description: 'Refer 10 friends',
      icon: <Gift className="w-5 h-5" />,
      progress: Math.min(referralCount, 10),
      target: 10,
      unlocked: referralCount >= 10,
      reward: '+₹100',
    },
    {
      id: '6',
      title: 'Ambassador',
      description: 'Refer 25 friends',
      icon: <Target className="w-5 h-5" />,
      progress: Math.min(referralCount, 25),
      target: 25,
      unlocked: referralCount >= 25,
      reward: '+₹300',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-20 pb-6 px-4">
        <div className="container mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
            
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <h1 className="font-display text-2xl font-bold mb-1">
              Your <span className="text-gradient">Activity</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Daily rewards, referrals & achievements
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-md space-y-6">
          {/* Referral Section */}
          <ReferralSection />

          {/* Achievements Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-xl border transition-all ${
                      achievement.unlocked 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-secondary/30 border-border/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        achievement.unlocked 
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' 
                          : 'bg-secondary text-muted-foreground'
                      }`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-display font-bold text-sm truncate">
                            {achievement.title}
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            achievement.unlocked 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {achievement.reward}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                              transition={{ duration: 0.5, delay: index * 0.05 }}
                              className={`h-full rounded-full ${
                                achievement.unlocked 
                                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                                  : 'bg-primary'
                              }`}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {achievement.progress}/{achievement.target}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default ActivityPage;
