import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import Footer from '@/components/Footer';
import GameCard from '@/components/GameCard';
import HowItWorks from '@/components/HowItWorks';
import TrustSection from '@/components/TrustSection';

import heroBanner from '@/assets/hero-banner.jpg';
import bgmiCard from '@/assets/bgmi-card.jpg';
import freefireCard from '@/assets/freefire-card.jpg';
import clashCard from '@/assets/clash-card.jpg';
import ludoCard from '@/assets/ludo-card.jpg';

const games = [
  { title: 'BGMI', image: bgmiCard, status: 'active' as const, path: '/bgmi' },
  { title: 'Free Fire', image: freefireCard, status: 'coming-soon' as const, path: '/freefire' },
  { title: 'Clash Royale', image: clashCard, status: 'coming-soon' as const, path: '/clash' },
  { title: 'Ludo', image: ludoCard, status: 'coming-soon' as const, path: '/ludo' },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-16 min-h-[85vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={heroBanner} 
            alt="ProScims Gaming" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
          <div className="absolute inset-0 cyber-grid" />
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
              Join Competitive
              <br />
              <span className="text-gradient">Scrims & Tournaments</span>
            </h1>
            
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
              Play. Compete. Win Real Matches.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/matches">
                <Button variant="neon" size="xl">
                  Browse Matches
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="xl">
                  Create Account
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto"
          >
            {[
              { value: '10K+', label: 'Players' },
              { value: '500+', label: 'Daily Matches' },
              { value: '₹5L+', label: 'Prize Pool' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-display text-2xl md:text-3xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-primary/50 flex justify-center pt-2">
            <div className="w-1 h-2 bg-primary rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Featured Games */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Featured <span className="text-gradient">Games</span>
            </h2>
            <p className="text-muted-foreground text-sm">
              Choose your battleground
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {games.map((game, index) => (
              <GameCard key={game.title} {...game} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />
      <TrustSection />
      <Footer />
      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default Index;
