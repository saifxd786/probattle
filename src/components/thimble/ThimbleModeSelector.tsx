import { motion } from 'framer-motion';
import { Clock, Zap, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ThimbleDifficulty = 'easy' | 'hard' | 'impossible';

interface DifficultyOption {
  id: ThimbleDifficulty;
  label: string;
  icon: typeof Clock;
  time: number;
  multiplier: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface ThimbleModeSelectorProps {
  selectedMode: ThimbleDifficulty;
  onSelectMode: (mode: ThimbleDifficulty) => void;
  entryAmount: number;
  settings: {
    selection_time_easy: number;
    selection_time_hard: number;
    selection_time_impossible: number;
    reward_multiplier_easy: number;
    reward_multiplier_hard: number;
    reward_multiplier_impossible: number;
  };
}

const ThimbleModeSelector = ({ 
  selectedMode, 
  onSelectMode, 
  entryAmount,
  settings 
}: ThimbleModeSelectorProps) => {
  const difficulties: DifficultyOption[] = [
    {
      id: 'easy',
      label: 'Easy',
      icon: Clock,
      time: settings.selection_time_easy,
      multiplier: settings.reward_multiplier_easy,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      id: 'hard',
      label: 'Normal',
      icon: Zap,
      time: settings.selection_time_hard,
      multiplier: settings.reward_multiplier_hard,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      id: 'impossible',
      label: 'Hard',
      icon: Flame,
      time: settings.selection_time_impossible,
      multiplier: settings.reward_multiplier_impossible,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground text-center">
        Choose Difficulty
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {difficulties.map((diff) => {
          const Icon = diff.icon;
          const isSelected = selectedMode === diff.id;
          const potentialWin = Math.floor(entryAmount * diff.multiplier);

          return (
            <motion.button
              key={diff.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectMode(diff.id)}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all duration-200',
                diff.bgColor,
                isSelected 
                  ? `${diff.borderColor} ring-2 ring-offset-2 ring-offset-background` 
                  : 'border-transparent hover:border-border',
                isSelected && diff.id === 'easy' && 'ring-green-500/50',
                isSelected && diff.id === 'hard' && 'ring-yellow-500/50',
                isSelected && diff.id === 'impossible' && 'ring-red-500/50'
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="mode-indicator"
                  className={cn(
                    'absolute inset-0 rounded-xl border-2',
                    diff.borderColor
                  )}
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              
              <div className="relative flex flex-col items-center gap-2">
                <Icon className={cn('w-6 h-6', diff.color)} />
                <span className={cn('font-semibold text-sm', diff.color)}>
                  {diff.label}
                </span>
                <div className="text-xs text-muted-foreground">
                  {diff.time}s • {diff.multiplier}x
                </div>
                {entryAmount > 0 && (
                  <div className={cn('text-sm font-bold', diff.color)}>
                    Win ₹{potentialWin}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ThimbleModeSelector;
