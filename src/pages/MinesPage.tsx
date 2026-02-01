import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import MinesGame from '@/components/mines/MinesGame';
import { Button } from '@/components/ui/button';
import { useGameBan } from '@/hooks/useGameBan';

const MinesPage = () => {
  const navigate = useNavigate();
  const { isBanned, banReason } = useGameBan('mines');

  if (isBanned) {
    return (
      <div className="min-h-screen bg-background pb-20">
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
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Custom Header with Back Button */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-3 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            Mines
          </h1>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-3 pt-16 pb-4 overflow-hidden">
        <MinesGame />
      </main>
    </div>
  );
};

export default MinesPage;
