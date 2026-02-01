import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gem, Bomb, Shield, Zap, Trophy, Users, Coins } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import MinesGame from '@/components/mines/MinesGame';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useDynamicStats, formatNumber, formatCurrency } from '@/hooks/useDynamicStats';
import { useGameBan } from '@/hooks/useGameBan';
import minesBanner from '@/assets/mines-banner.jpg';

const howToPlay = [
  'Select your bet amount and number of mines (1-24)',
  'Click "Start Game" to begin',
  'Click on tiles to reveal gems - each gem increases your multiplier',
  'Cash out anytime to secure your winnings',
  'Hit a mine and you lose your bet!'
];

const MinesPage = () => {
  const navigate = useNavigate();
  const { winnersToday, playingNow, distributedToday } = useDynamicStats();
  const { isBanned, banReason } = useGameBan('mines');

  if (isBanned) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container mx-auto px-4 pt-20">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="p-4 rounded-full bg-destructive/10 mb-4">
              <Shield className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
            <p className="text-muted-foreground mb-4">
              {banReason || 'You have been banned from playing Mines.'}
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <Header />
      
      <main className="flex-1 container mx-auto px-3 pt-16 pb-16 overflow-hidden">
        {/* Game */}
        <MinesGame />
      </main>

      <BottomNav />
    </div>
  );
};

export default MinesPage;
