import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import MatchCard from '@/components/MatchCard';

import bgmiCard from '@/assets/bgmi-card.jpg';
import tdmBanner from '@/assets/tdm-banner.jpg';
import classicBanner from '@/assets/classic-banner.jpg';

const tabs = ['TDM Matches', 'Classic Matches'] as const;

const tdmMatches = [
  { id: '1', mode: '1 vs 1', map: 'Warehouse', entryFee: 0, prize: 0, slots: { current: 1, total: 2 }, time: 'Starting in 5 min', status: 'open' as const },
  { id: '2', mode: '1 vs 1', map: 'Warehouse', entryFee: 10, prize: 18, slots: { current: 2, total: 2 }, time: 'Starting in 10 min', status: 'full' as const },
  { id: '3', mode: '2 vs 2', map: 'Santorini', entryFee: 20, prize: 70, slots: { current: 3, total: 4 }, time: 'Starting in 15 min', status: 'filling' as const },
  { id: '4', mode: '2 vs 2', map: 'Ruins', entryFee: 0, prize: 0, slots: { current: 2, total: 4 }, time: 'Starting in 20 min', status: 'open' as const },
  { id: '5', mode: '4 vs 4', map: 'Warehouse', entryFee: 50, prize: 350, slots: { current: 6, total: 8 }, time: 'Starting in 30 min', status: 'filling' as const },
  { id: '6', mode: '4 vs 4', map: 'Santorini', entryFee: 25, prize: 175, slots: { current: 4, total: 8 }, time: 'Starting in 45 min', status: 'open' as const },
];

const classicMatches = [
  { id: '7', mode: '100 Players', map: 'Erangel', entryFee: 30, prize: 2500, slots: { current: 78, total: 100 }, time: '8:00 PM Today', status: 'filling' as const },
  { id: '8', mode: '100 Players', map: 'Miramar', entryFee: 0, prize: 0, slots: { current: 45, total: 100 }, time: '9:00 PM Today', status: 'open' as const },
  { id: '9', mode: '100 Players', map: 'Sanhok', entryFee: 50, prize: 4000, slots: { current: 92, total: 100 }, time: '10:00 PM Today', status: 'filling' as const },
  { id: '10', mode: '100 Players', map: 'Vikendi', entryFee: 20, prize: 1500, slots: { current: 100, total: 100 }, time: '11:00 PM Today', status: 'full' as const },
];

const BGMIPage = () => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('TDM Matches');

  const currentBanner = activeTab === 'TDM Matches' ? tdmBanner : classicBanner;
  const currentMatches = activeTab === 'TDM Matches' ? tdmMatches : classicMatches;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      {/* Hero Banner */}
      <section className="relative pt-16">
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img 
            src={currentBanner}
            alt={activeTab}
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

      {/* Matches Grid */}
      <section className="container mx-auto px-4 py-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {currentMatches.map((match, index) => (
            <MatchCard key={match.id} {...match} delay={index * 0.05} />
          ))}
        </motion.div>

        {currentMatches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No matches available right now</p>
          </div>
        )}
      </section>

      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default BGMIPage;
