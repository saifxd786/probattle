import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import GameCard from '@/components/GameCard';

import bgmiCard from '@/assets/bgmi-card.jpg';
import freefireCard from '@/assets/freefire-card.jpg';
import clashCard from '@/assets/clash-card.jpg';
import ludoCard from '@/assets/ludo-card.jpg';

const games = [
  { title: 'BGMI', image: bgmiCard, status: 'active' as const, path: '/bgmi' },
  { title: 'Ludo', image: ludoCard, status: 'active' as const, path: '/ludo' },
  { title: 'Free Fire', image: freefireCard, status: 'coming-soon' as const, path: '/freefire' },
  { title: 'Clash Royale', image: clashCard, status: 'coming-soon' as const, path: '/clash' },
];

const MatchesPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">All Matches</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a game to view available matches
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {games.map((game, index) => (
            <GameCard key={game.title} {...game} delay={index * 0.1} />
          ))}
        </div>
      </main>

      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default MatchesPage;
