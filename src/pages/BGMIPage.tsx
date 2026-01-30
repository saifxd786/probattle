import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Ban, MapPin, Clock, User, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';

import MatchCard from '@/components/MatchCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNow } from '@/hooks/useNow';
import { useGameBan } from '@/hooks/useGameBan';
import { Database } from '@/integrations/supabase/types';

import bgmiCard from '@/assets/bgmi-card.jpg';
import tdmBanner from '@/assets/bgmi-tdm-banner.jpg';

// Map-specific banners
import erangelBanner from '@/assets/map-erangel.jpg';
import miramarBanner from '@/assets/map-miramar.jpg';
import sanhokBanner from '@/assets/map-sanhok.jpg';
import vikendiBanner from '@/assets/map-vikendi.jpg';
import livikBanner from '@/assets/map-livik.jpg';

type Match = Database['public']['Tables']['matches']['Row'];
type MatchType = Database['public']['Enums']['match_type'];

const tabs = ['TDM Matches', 'Classic Matches'] as const;
const filterTabs = ['Upcoming', 'My Matches', 'Results'] as const;

// Map configurations with banners and colors
const CLASSIC_MAPS = [
  { id: 'all', name: 'All Maps', banner: erangelBanner, color: 'from-emerald-500/20' },
  { id: 'Erangel', name: 'Erangel', banner: erangelBanner, color: 'from-green-500/20' },
  { id: 'Miramar', name: 'Miramar', banner: miramarBanner, color: 'from-amber-500/20' },
  { id: 'Sanhok', name: 'Sanhok', banner: sanhokBanner, color: 'from-lime-500/20' },
  { id: 'Vikendi', name: 'Vikendi', banner: vikendiBanner, color: 'from-cyan-500/20' },
  { id: 'Livik', name: 'Livik', banner: livikBanner, color: 'from-purple-500/20' },
] as const;

const BGMIPage = () => {
  const { user } = useAuth();
  const nowMs = useNow(1000);
  const { isBanned, isLoading: isBanLoading } = useGameBan('bgmi');
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('TDM Matches');
  const [activeFilter, setActiveFilter] = useState<typeof filterTabs[number]>('Upcoming');
  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [matches, setMatches] = useState<Match[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current map config for Classic mode
  const currentMapConfig = CLASSIC_MAPS.find(m => m.id === selectedMap) || CLASSIC_MAPS[0];

  // Show banned message
  if (isBanned && !isBanLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="container mx-auto px-4 pt-6 text-center">
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
    
    // Build query based on active filter
    let query = supabase
      .from('matches')
      .select('*')
      .eq('game', 'bgmi')
      .in('match_type', matchTypes);
    
    if (activeFilter === 'Upcoming') {
      query = query.in('status', ['upcoming', 'live']);
    } else if (activeFilter === 'Results') {
      query = query.eq('status', 'completed');
    }
    // For 'My Matches', we'll filter client-side based on registrations
    
    const { data, error } = await query.order('match_time', { ascending: activeFilter !== 'Results' });

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
  }, [activeTab, activeFilter]);

  useEffect(() => {
    fetchUserRegistrations();
  }, [user]);

  const handleRegistrationChange = () => {
    fetchMatches();
    fetchUserRegistrations();
  };

  // Filter matches by map for Classic mode and by user registration for My Matches
  let filteredMatches = matches;
  
  if (activeFilter === 'My Matches') {
    filteredMatches = matches.filter(m => userRegistrations.includes(m.id));
  }
  
  if (activeTab === 'Classic Matches' && selectedMap !== 'all') {
    filteredMatches = filteredMatches.filter(m => m.map_name === selectedMap);
  }

  // Dynamic banner based on tab and selected map
  const currentBanner = activeTab === 'TDM Matches' ? tdmBanner : currentMapConfig.banner;
  const currentBannerTitle = activeTab === 'TDM Matches' ? 'TDM Matches' : `Classic - ${currentMapConfig.name}`;
  const bannerSubtitle = activeTab === 'TDM Matches' 
    ? 'Fast-paced close combat action' 
    : currentMapConfig.id === 'all' 
      ? 'Battle royale survival mode' 
      : `Survive in ${currentMapConfig.name}`;

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
      {/* Hero Banner - Changes based on selected tab and map */}
      <section className="relative">
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${activeTab}-${selectedMap}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative h-44 md:h-56 overflow-hidden"
          >
            <img 
              src={currentBanner}
              alt={currentBannerTitle}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent`} />
            
            {/* Back button */}
            <Link 
              to="/" 
              className="absolute top-4 left-4 flex items-center gap-2 text-sm text-foreground/80 hover:text-primary transition-colors z-10"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>

            {/* Title - Mode specific */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-3">
                <img 
                  src={bgmiCard} 
                  alt="BGMI" 
                  className="w-12 h-12 rounded-lg object-cover border border-primary/30"
                />
                <div>
                  <h1 className="font-display text-2xl font-bold drop-shadow-lg">
                    {currentBannerTitle}
                  </h1>
                  <p className="text-xs text-foreground/80">
                    {bannerSubtitle}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Filter Tabs - Upcoming, My Matches, Results */}
      <section className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-2">
            {filterTabs.map((filter) => {
              const icons = {
                'Upcoming': <Clock className="w-4 h-4" />,
                'My Matches': <User className="w-4 h-4" />,
                'Results': <Trophy className="w-4 h-4" />
              };
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`relative flex-1 py-2.5 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all duration-300 ${
                    activeFilter === filter
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {icons[filter]}
                  {filter}
                  {activeFilter === filter && (
                    <motion.div
                      layoutId="activeFilter"
                      className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/30"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Game Mode Tabs - TDM / Classic */}
      <section className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'TDM Matches') setSelectedMap('all');
                }}
                className={`relative flex-1 py-2.5 px-4 rounded-lg font-display text-xs uppercase tracking-wider transition-all duration-300 ${
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

      {/* Map Selector - Only for Classic Matches */}
      <AnimatePresence>
        {activeTab === 'Classic Matches' && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-background/80 backdrop-blur-sm border-b border-border/30"
          >
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Map</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {CLASSIC_MAPS.map((map) => (
                  <button
                    key={map.id}
                    onClick={() => setSelectedMap(map.id)}
                    className={`relative flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedMap === map.id
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {map.name}
                    {selectedMap === map.id && (
                      <motion.div
                        layoutId="selectedMap"
                        className="absolute inset-0 bg-primary rounded-lg -z-10"
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Matches Grid */}
      <section className="container mx-auto px-4 pb-6 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {selectedMap !== 'all' 
                ? `No ${selectedMap} matches available right now` 
                : 'No matches available right now'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Check back later for new matches!</p>
          </div>
        ) : (
          <motion.div
            key={`${activeTab}-${selectedMap}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredMatches.map((match, index) => (
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
                gunCategory={(match as any).gun_category}
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
