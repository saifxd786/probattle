import { motion } from 'framer-motion';
import { ChevronRight, Clock, WifiOff, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface GameCardProps {
  title: string;
  image: string;
  status: 'active' | 'coming-soon';
  path: string;
  delay?: number;
  isOnline?: boolean; // Game availability from admin settings
}

const GameCard = ({ title, image, status, path, delay = 0, isOnline = true }: GameCardProps) => {
  const isActive = status === 'active';
  // Game is only clickable if it's active AND online
  const isClickable = isActive && isOnline;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Link 
        to={isClickable ? path : '#'} 
        className={cn(
          'block group',
          !isClickable && 'cursor-not-allowed'
        )}
        onClick={(e) => !isClickable && e.preventDefault()}
      >
        <div className={cn(
          'glass-card overflow-hidden transition-all duration-500',
          isClickable && 'hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)]',
          !isOnline && isActive && 'opacity-70'
        )}>
          {/* Image */}
          <div className="relative aspect-[16/10] overflow-hidden">
            <img 
              src={image} 
              alt={title}
              className={cn(
                'w-full h-full object-cover transition-transform duration-500',
                isClickable && 'group-hover:scale-110',
                !isOnline && 'grayscale'
              )}
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            {/* Status Badge */}
            <div className="absolute top-3 right-3">
              {!isActive ? (
                // Coming Soon badge
                <div className="px-3 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider backdrop-blur-sm bg-muted/90 text-muted-foreground border border-border">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Coming Soon
                  </span>
                </div>
              ) : isOnline ? (
                // Online badge
                <div className="px-3 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider backdrop-blur-sm bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white shadow-lg shadow-green-500/25">
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    Online
                  </span>
                </div>
              ) : (
                // Offline badge
                <div className="px-3 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider backdrop-blur-sm bg-red-500/90 text-white border border-red-400/50 shadow-lg shadow-red-500/25">
                  <span className="flex items-center gap-1.5">
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h3 className={cn(
                'font-display text-lg font-bold tracking-wide',
                (!isActive || !isOnline) && 'text-muted-foreground'
              )}>
                {title}
              </h3>
              
              {isClickable && (
                <ChevronRight className="w-5 h-5 text-primary transition-transform duration-300 group-hover:translate-x-1" />
              )}
            </div>
            
            {isActive && isOnline && (
              <p className="text-xs text-muted-foreground mt-1">
                Join live matches now
              </p>
            )}
            {isActive && !isOnline && (
              <p className="text-xs text-red-400 mt-1">
                Temporarily unavailable
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default GameCard;