import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

import MatchCard from '@/components/MatchCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNow } from '@/hooks/useNow';
import { useGameBan } from '@/hooks/useGameBan';
import { Database } from '@/integrations/supabase/types';

import bgmiCard from '@/assets/bgmi-card.jpg';
import bgmiHeroBanner from '@/assets/bgmi-hero-banner.jpg';
import tdmBanner from '@/assets/bgmi-tdm-banner.jpg';
import classicBanner from '@/assets/bgmi-classic-banner.jpg';

type Match = Database['public']['Tables']['matches']['Row'];
type MatchType = Database['public']['Enums']['match_type'];

const tabs = ['TDM Matches', 'Classic Matches'] as const;

const BGMIPage = () => {
  const { user } = useAuth();
  const nowMs = useNow(1000);
  const { isBanned, isLoading: isBanLoading } = useGameBan('bgmi');
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('TDM Matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Show banned message
  if (isBanned && !isBanLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container mx-auto px-4 pt-20 text-center">
          <div className="glass-card p-8 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <Ban className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2 text-destructive">Access Restricted</h1>
            <p className="text-muted-foreground mb-4">
              You have been banned from playing BGMI matches. Please contact support if you believe this is an error.
            </p>
            <Link to="/" className="text-primary hover:underline text-sm">
              ← Back to Home
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const fetchMatches = async () => {
    setIsLoading(true);
    
    const matchTypes: MatchType[] = activeTab === 'TDM Matches' 
      ? ['tdm_1v1', 'tdm_2v2', 'tdm_4v4'] 
      : ['classic'];
    
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('game', 'bgmi')
      .in('match_type', matchTypes)
      .in('status', ['upcoming', 'live'])
      .order('match_time', { ascending: true });

    if (!error && data) {
      setMatches(data);
    }
    setIsLoading(false);
  };

  const fetchUserRegistrations = async () => {
    if (!user) {
      setUserRegistrations([]);
      return;
    }

    const { data } = await supabase
      .from('match_registrations')
      .select('match_id')
      .eq('user_id', user.id);

    if (data) {
      setUserRegistrations(data.map((r) => r.match_id));
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [activeTab]);

  useEffect(() => {
    fetchUserRegistrations();
  }, [user]);

  const handleRegistrationChange = () => {
    fetchMatches();
    fetchUserRegistrations();
  };

  const currentBanner = activeTab === 'TDM Matches' ? tdmBanner : classicBanner;
  const currentBannerTitle = activeTab === 'TDM Matches' ? 'TDM Matches' : 'Classic Erangel';

  const getMatchMode = (match: Match) => {
    switch (match.match_type) {
      case 'tdm_1v1': return '1 vs 1';
      case 'tdm_2v2': return '2 vs 2';
      case 'tdm_4v4': return '4 vs 4';
      case 'classic': return '100 Players';
      default: return match.match_type;
    }
  };

  const getMatchStatus = (match: Match): 'open' | 'filling' | 'full' => {
    const percentage = (match.filled_slots / match.max_slots) * 100;
    if (percentage >= 100) return 'full';
    if (percentage >= 70) return 'filling';
    return 'open';
  };

  const formatMatchTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return 'Started';
    if (diffMins < 60) return `Starting in ${diffMins} min`;
    if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return date.toLocaleDateString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      {/* Hero Banner */}
      <section className="relative pt-16">
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img 
            src={bgmiHeroBanner}
            alt="BGMI Tournaments"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          {/* Back button */}
          <Link 
            to="/" 
            className="absolute top-4 left-4 flex items-center gap-2 text-sm text-foreground/80 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          {/* Title */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-3">
              <img 
                src={bgmiCard} 
                alt="BGMI" 
                className="w-12 h-12 rounded-lg object-cover border border-primary/30"
              />
              <div>
                <h1 className="font-display text-2xl font-bold">BGMI</h1>
                <p className="text-xs text-muted-foreground">Battlegrounds Mobile India</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 py-3 px-4 rounded-lg font-display text-xs uppercase tracking-wider transition-all duration-300 ${
                  activeTab === tab
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/30"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Map Banner Section */}
      <section className="container mx-auto px-4 py-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative h-40 md:h-52 rounded-2xl overflow-hidden"
        >
          <img 
            src={currentBanner}
            alt={currentBannerTitle}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground drop-shadow-lg">
              {currentBannerTitle}
            </h2>
            <p className="text-sm text-foreground/80 mt-1">
              {activeTab === 'TDM Matches' 
                ? 'Fast-paced close combat action' 
                : 'Battle royale survival mode'}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Matches Grid */}
      <section className="container mx-auto px-4 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No matches available right now</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later for new matches!</p>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {matches.map((match, index) => (
              <MatchCard
                key={match.id}
                id={match.id}
                title={match.title}
                mode={getMatchMode(match)}
                map={match.map_name || 'TBD'}
                entryFee={match.entry_fee}
                prize={match.prize_pool}
                prizePerKill={match.prize_per_kill || 0}
                firstPlacePrize={match.first_place_prize || 0}
                secondPlacePrize={(match as any).second_place_prize || 0}
                thirdPlacePrize={(match as any).third_place_prize || 0}
                slots={{ current: match.filled_slots, total: match.max_slots }}
                time={match.match_time}
                nowMs={nowMs}
                status={getMatchStatus(match)}
                roomId={match.room_id}
                roomPassword={match.room_password}
                isRegistered={userRegistrations.includes(match.id)}
                isFreeMatch={match.is_free}
                isClassicMatch={match.match_type === 'classic'}
                onRegister={handleRegistrationChange}
                delay={index * 0.05}
              />
            ))}
          </motion.div>
        )}
      </section>

      <BottomNav />
    </div>
  );
};

export default BGMIPage;
