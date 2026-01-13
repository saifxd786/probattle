import { motion } from 'framer-motion';
import { Activity, ArrowLeft } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ReferralSection from '@/components/ReferralSection';
import { useAuth } from '@/contexts/AuthContext';

const ActivityPage = () => {
  const { user, isLoading } = useAuth();

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
              Daily rewards & referral bonuses
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-md">
          <ReferralSection />
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default ActivityPage;
