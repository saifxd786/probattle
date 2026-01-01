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

const stats = [
  { icon: Trophy, label: 'Winners Today', value: '1,245' },
  { icon: Users, label: 'Playing Now', value: '89' },
  { icon: Coins, label: 'Distributed Today', value: '₹45,000' },
];

const howToPlay = [
  { step: 1, title: 'Watch the Ball', description: 'A ball is placed under one of the three cups' },
  { step: 2, title: 'Track the Shuffle', description: 'Cups will shuffle - keep your eyes on the ball!' },
  { step: 3, title: 'Pick the Cup', description: 'Select the cup you think has the ball' },
  { step: 4, title: 'Win 1.5x', description: 'Correct guess wins 1.5x your entry!' },
];

const ThimblePage = () => {
  const navigate = useNavigate();

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

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative glass-card p-6 mb-6 overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <svg viewBox="0 0 100 80" className="w-full h-full">
              <path
                d="M 15 0 L 85 0 L 75 70 C 75 75 70 80 50 80 C 30 80 25 75 25 70 L 15 0"
                fill="currentColor"
                className="text-primary"
              />
            </svg>
          </div>

          <div className="relative z-10">
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
              <span className="text-gradient">Thimble</span> Game
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Track the ball, pick the right cup, win 1.5x instantly!
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
              <p className="font-display text-lg font-bold text-foreground">{stat.value}</p>
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
                Difficulty only affects shuffle speed and selection time. It does NOT affect the outcome - if you track correctly, you win regardless of difficulty.
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
