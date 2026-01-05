import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Users, Coins, HelpCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import ThimbleGame from '@/components/thimble/ThimbleGame';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useDynamicStats, formatNumber, formatCurrency } from '@/hooks/useDynamicStats';
import thimbleBanner from '@/assets/thimble-banner.jpg';

const howToPlay = [
  { step: 1, title: 'Select Amount', description: 'Choose how much you want to play with (₹10 - ₹500)' },
  { step: 2, title: 'Pick Difficulty', description: 'Easy (10s, 1.5x) • Normal (5s, 2x) • Hard (2s, 3x)' },
  { step: 3, title: 'Track the Shuffle', description: 'Watch carefully as the cups shuffle!' },
  { step: 4, title: 'Pick & Win!', description: 'Select the cup with the ball to win!' },
];

const ThimblePage = () => {
  const navigate = useNavigate();
  const dynamicStats = useDynamicStats();

  const stats = [
    { icon: Trophy, label: 'Winners Today', value: formatNumber(dynamicStats.winnersToday) },
    { icon: Users, label: 'Playing Now', value: formatNumber(dynamicStats.playingNow) },
    { icon: Coins, label: 'Distributed Today', value: formatCurrency(dynamicStats.distributedToday) },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/matches')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
        </motion.div>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-6"
        >
          <img 
            src={thimbleBanner} 
            alt="Thimble Game" 
            className="w-full h-40 md:h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            <h1 className="font-display text-2xl md:text-4xl font-bold mb-1">
              <span className="text-gradient">Thimble</span> Game
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Track the ball, pick the right cup, win up to 3x instantly!
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {stats.map((stat, i) => (
            <div key={i} className="glass-card p-3 text-center">
              <stat.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <motion.p 
                key={stat.value}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="font-display text-lg font-bold text-foreground"
              >
                {stat.value}
              </motion.p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Game Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 mb-6"
        >
          <ThimbleGame />
        </motion.div>

        {/* How to Play */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">How to Play</h2>
          </div>
          
          <div className="space-y-4">
            {howToPlay.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex gap-4"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="font-display font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Fair Play */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-400" />
            <h2 className="font-display text-lg font-bold text-foreground">100% Fair Play</h2>
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="fair-1" className="border-border">
              <AccordionTrigger className="text-foreground hover:no-underline">
                Is the game fair?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! The ball position is randomly generated before the shuffle starts and cannot be changed afterward. Your skill in tracking determines your win.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="fair-2" className="border-border">
              <AccordionTrigger className="text-foreground hover:no-underline">
                How does difficulty affect the game?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Difficulty affects shuffle speed, selection time, and reward multiplier. Easy gives you 10 seconds with 1.5x reward, Normal gives 5 seconds with 2x, and Hard gives 2 seconds with 3x reward.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="fair-3" className="border-border">
              <AccordionTrigger className="text-foreground hover:no-underline">
                When do I get my winnings?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Winnings are credited instantly to your wallet after a successful guess. You can withdraw anytime!
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

export default ThimblePage;
