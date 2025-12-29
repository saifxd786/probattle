import { motion } from 'framer-motion';
import { Trophy, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const MyGamesPage = () => {
  // Sample data - would come from backend
  const hasGames = false;

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
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">My Games</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Track your match history and results
          </p>
        </motion.div>

        {!hasGames ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="font-display text-lg font-bold mb-2">No Games Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Join your first match to start building your history
            </p>
            <Link to="/matches">
              <Button variant="neon">Browse Matches</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Sample game history items */}
            {[1, 2, 3].map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${index === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {index === 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold">BGMI - TDM 1v1</h4>
                      <p className="text-xs text-muted-foreground">Warehouse</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-display text-sm font-bold ${index === 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {index === 0 ? '+₹18' : '-₹10'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      2h ago
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default MyGamesPage;
