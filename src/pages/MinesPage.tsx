import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gem, Bomb, Shield, Zap } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import MinesGame from '@/components/mines/MinesGame';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useDynamicStats } from '@/hooks/useDynamicStats';
import { useGameBan } from '@/hooks/useGameBan';

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
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate('/matches')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Games
        </Button>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-emerald-600/30 via-emerald-500/20 to-background border border-emerald-500/20"
        >
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
          <div className="relative p-6 md:p-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <Gem className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">Mines</h1>
            </div>
            <p className="text-muted-foreground max-w-md">
              Navigate the minefield to find gems! The more gems you reveal, the higher your multiplier. 
              But watch out for mines!
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium">{winnersToday} Winners Today</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium">{playingNow} Playing Now</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-sm font-medium">₹{distributedToday} Won Today</span>
              </div>
            </div>
          </div>
        </motion.div>

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
      <TelegramFloat />
    </div>
  );
};

export default MinesPage;
