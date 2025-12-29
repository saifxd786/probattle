import { motion } from 'framer-motion';
import { Users, Clock, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MatchCardProps {
  id: string;
  mode: string;
  map: string;
  entryFee: number;
  prize: number;
  slots: { current: number; total: number };
  time: string;
  status: 'open' | 'filling' | 'full';
  delay?: number;
}

const MatchCard = ({ 
  mode, 
  map, 
  entryFee, 
  prize, 
  slots, 
  time, 
  status,
  delay = 0 
}: MatchCardProps) => {
  const isFree = entryFee === 0;
  const slotsPercentage = (slots.current / slots.total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card overflow-hidden group hover:border-primary/40 transition-all duration-300"
    >
      {/* Header */}
      <div className="relative p-4 pb-3 border-b border-border/50">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider',
                isFree 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-primary/20 text-primary border border-primary/30'
              )}>
                {isFree ? 'Free' : `₹${entryFee}`}
              </span>
              
              {status === 'filling' && (
                <span className="flex items-center gap-1 text-[10px] text-yellow-400">
                  <Zap className="w-3 h-3" />
                  Filling Fast
                </span>
              )}
            </div>
            
            <h4 className="font-display text-base font-bold tracking-wide">{mode}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{map}</p>
          </div>
          
          {prize > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-primary">
                <Trophy className="w-4 h-4" />
                <span className="font-display font-bold">₹{prize}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Prize Pool</span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 pt-3 space-y-3">
        {/* Slots Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              Slots
            </span>
            <span className={cn(
              'font-medium',
              slotsPercentage >= 80 ? 'text-yellow-400' : 'text-foreground'
            )}>
              {slots.current}/{slots.total}
            </span>
          </div>
          
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                slotsPercentage >= 80 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-neon-blue to-neon-cyan'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${slotsPercentage}%` }}
              transition={{ duration: 0.8, delay: delay + 0.2 }}
            />
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {time}
          </span>
          
          <Button 
            variant={status === 'full' ? 'secondary' : 'neon'} 
            size="sm"
            disabled={status === 'full'}
            className="text-xs h-8"
          >
            {status === 'full' ? 'Full' : 'Join Match'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default MatchCard;
