import { motion } from 'framer-motion';
import { ArrowLeft, Dices, Shield, Clock, Coins, Users, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

const rules = [
  {
    icon: Coins,
    title: 'Entry & Rewards',
    points: [
      'Minimum entry amount is ₹100',
      'Choose from ₹100, ₹200, ₹500, or ₹1000 entry',
      'Winner receives 1.5x of entry amount as reward',
      'Example: ₹100 entry → ₹150 reward on winning'
    ]
  },
  {
    icon: Users,
    title: 'Game Modes',
    points: [
      '2-Player Mode: 1v1 quick matches',
      '4-Player Mode: Battle Royale style',
      'Matched with real-time opponents',
      'Each player gets 4 tokens of their color'
    ]
  },
  {
    icon: Clock,
    title: 'Gameplay',
    points: [
      'Roll dice on your turn',
      'Roll 6 to bring a token out of home',
      'Move tokens based on dice value',
      'Roll 6 to get an extra turn',
      'First to get all 4 tokens home wins'
    ]
  },
  {
    icon: Target,
    title: 'Winning',
    points: [
      'Move all 4 tokens to the center home area',
      'Tokens must reach home with exact count',
      'Capture opponent tokens to send them back',
      'Winner takes the full reward amount'
    ]
  },
  {
    icon: Shield,
    title: 'Fair Play',
    points: [
      'Random dice rolls ensure fairness',
      'Anti-cheat systems in place',
      'Matches are monitored for integrity',
      'Rewards credited instantly to wallet'
    ]
  }
];

const LudoRulesPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        {/* Back Button */}
        <Link 
          to="/ludo" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Ludo
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
            <Dices className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Ludo Rules</h1>
          <p className="text-muted-foreground">How to play & win</p>
        </motion.div>

        {/* Rules */}
        <div className="space-y-6">
          {rules.map((section, idx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-5 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-display text-lg font-bold">{section.title}</h2>
              </div>
              <ul className="space-y-2">
                {section.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-1">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
        >
          <p className="text-xs text-yellow-200/80 text-center">
            This game involves financial risk. Play responsibly. 
            By playing, you agree to our terms and conditions.
          </p>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default LudoRulesPage;