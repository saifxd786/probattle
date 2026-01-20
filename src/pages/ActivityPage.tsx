import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowLeft, Users, Gift, Coins } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ReferralSection from '@/components/ReferralSection';
import DailyLoginReward from '@/components/DailyLoginReward';
import SpinWheel from '@/components/SpinWheel';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ActivityPage = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('referral');

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
      <section className="pt-20 pb-4 px-4">
        <div className="container mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4"
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
              Earn rewards, invite friends & spin to win
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Tabs */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-md">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50 mb-4">
              <TabsTrigger 
                value="referral" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
              >
                <Users className="w-4 h-4" />
                Refer & Earn
              </TabsTrigger>
              <TabsTrigger 
                value="rewards" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
              >
                <Gift className="w-4 h-4" />
                Rewards
              </TabsTrigger>
            </TabsList>

            {/* Referral Tab - Main Focus */}
            <TabsContent value="referral" className="space-y-4 mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ReferralSection />
              </motion.div>
            </TabsContent>

            {/* Rewards Tab - Daily Login & Spin */}
            <TabsContent value="rewards" className="space-y-4 mt-0">
              {/* Daily Login */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <DailyLoginReward />
              </motion.div>

              {/* Spin Wheel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SpinWheel />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default ActivityPage;