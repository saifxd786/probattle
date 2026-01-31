import { motion } from 'framer-motion';
import { ChevronRight, Clock } from 'lucide-react';
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
            
            {/* Status Badge - Compact & Elegant */}
            <div className="absolute top-2 right-2">
              {!isActive ? (
                // Coming Soon badge - minimal
                <div className="px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-md bg-black/60 text-white/80 border border-white/10">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    Soon
                  </span>
                </div>
              ) : isOnline ? (
                // Online badge - small dot indicator
                <div className="px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    Live
                  </span>
                </div>
              ) : (
                // Offline badge - subtle red
                <div className="px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-md bg-red-500/20 text-red-400 border border-red-500/30">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    Off
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