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
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        {/* Game */}
        <MinesGame />

        {/* How to Play */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <Accordion type="single" collapsible>
            <AccordionItem value="how-to-play" className="border rounded-xl px-4">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Gem className="w-5 h-5 text-emerald-400" />
                  How to Play
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-2">
                  {howToPlay.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fair-play" className="border rounded-xl px-4 mt-2">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Fair Play
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Provably Fair:</strong> Mine positions are determined 
                    before each game starts and cannot be changed.
                  </p>
                  <p>
                    <strong className="text-foreground">Transparent Odds:</strong> More mines = higher risk = 
                    higher potential rewards. The multiplier is calculated based on the probability of finding gems.
                  </p>
                  <p>
                    <strong className="text-foreground">No Manipulation:</strong> All games are logged and 
                    can be verified for fairness.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default MinesPage;
