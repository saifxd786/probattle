import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { User, Bot, Crown, Clock } from 'lucide-react';
import CaptureAnimation from './CaptureAnimation';

// Compact Player Card Component
const PlayerCard = ({ 
  player, 
  position,
  turnTime = 0
}: { 
  player: Player; 
  position: 'left' | 'right';
  turnTime?: number;
}) => {
  const isLeft = position === 'left';
  const colors = COLORS[player.color as keyof typeof COLORS];
  const displayUid = player.uid || '00000';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2",
        isLeft ? "flex-row" : "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div 
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${colors.light} 0%, ${colors.main} 100%)`,
        }}
      >
        {player.isBot ? <Bot className="w-4 h-4" /> : displayUid.slice(0, 1)}
        {player.isCurrentTurn && (
          <motion.div 
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
      
      {/* Info */}
      <div className={cn("text-[10px]", isLeft ? "text-left" : "text-right")}>
        <div className="flex items-center gap-1">
          <span 
            className="font-bold text-white"
            style={{ textShadow: `0 0 6px ${colors.main}` }}
          >
            #{displayUid}
          </span>
          {player.isCurrentTurn && <Crown className="w-3 h-3 text-yellow-400" />}
        </div>
        {player.isCurrentTurn && (
          <div className="flex items-center gap-0.5 text-white/60">
            <Clock className="w-2.5 h-2.5" />
            <span>{Math.floor(turnTime / 60)}:{(turnTime % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface Token {
  id: number;
  position: number;
  color: string;
}

interface Player {
  color: string;
  tokens: Token[];
  isCurrentTurn: boolean;
  name?: string;
  uid?: string;
  isBot?: boolean;
}

interface CaptureEvent {
  capturedColor: string;
  position: number;
  capturingColor: string;
}

interface LudoBoardProps {
  players: Player[];
  onTokenClick?: (color: string, tokenId: number) => void;
  selectedToken?: { color: string; tokenId: number } | null;
  captureEvent?: CaptureEvent | null;
  onCaptureAnimationComplete?: () => void;
  diceValue?: number;
}

// ProBattle Cyber Theme Colors - Neon with dark backgrounds
const COLORS = {
  red: { main: '#EF4444', light: '#F87171', dark: '#DC2626', bg: '#450a0a', track: '#1f1515' },
  green: { main: '#22C55E', light: '#4ADE80', dark: '#16A34A', bg: '#052e16', track: '#0d1f14' },
  yellow: { main: '#EAB308', light: '#FACC15', dark: '#CA8A04', bg: '#422006', track: '#1f1a0a' },
  blue: { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB', bg: '#172554', track: '#0f172a' }
};

// Board theme colors
const BOARD_THEME = {
  background: '#0a0f1a',
  cellBg: '#1e293b',
  cellBorder: '#334155',
  trackCell: '#0f172a',
  centerGlow: 'rgba(59, 130, 246, 0.3)',
};

// Home positions for each color (token slots in corners)
const HOME_POSITIONS: { [color: string]: { x: number; y: number }[] } = {
  red: [{ x: 1.8, y: 1.8 }, { x: 4.2, y: 1.8 }, { x: 1.8, y: 4.2 }, { x: 4.2, y: 4.2 }],
  green: [{ x: 10.8, y: 1.8 }, { x: 13.2, y: 1.8 }, { x: 10.8, y: 4.2 }, { x: 13.2, y: 4.2 }],
  yellow: [{ x: 10.8, y: 10.8 }, { x: 13.2, y: 10.8 }, { x: 10.8, y: 13.2 }, { x: 13.2, y: 13.2 }],
  blue: [{ x: 1.8, y: 10.8 }, { x: 4.2, y: 10.8 }, { x: 1.8, y: 13.2 }, { x: 4.2, y: 13.2 }]
};

// BOTTOM lane start (previously used as RED)
const RED_TRACK: { x: number; y: number }[] = [
  { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  { x: 0.5, y: 7.5 },
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  { x: 7.5, y: 0.5 },
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  { x: 14.5, y: 7.5 },
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  { x: 7.5, y: 14.5 },
];

const GREEN_TRACK: { x: number; y: number }[] = [
  { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  { x: 7.5, y: 0.5 },
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  { x: 14.5, y: 7.5 },
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  { x: 7.5, y: 14.5 },
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  { x: 0.5, y: 7.5 },
];

const YELLOW_TRACK: { x: number; y: number }[] = [
  { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  { x: 14.5, y: 7.5 },
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  { x: 7.5, y: 14.5 },
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  { x: 0.5, y: 7.5 },
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  { x: 7.5, y: 0.5 },
];

const BLUE_TRACK: { x: number; y: number }[] = [
  { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  { x: 7.5, y: 14.5 },
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  { x: 0.5, y: 7.5 },
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  { x: 7.5, y: 0.5 },
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  { x: 14.5, y: 7.5 },
];

const COLOR_TRACKS: { [color: string]: { x: number; y: number }[] } = {
  red: GREEN_TRACK,
  green: YELLOW_TRACK,
  yellow: BLUE_TRACK,
  blue: RED_TRACK,
};

const HOME_PATHS: { [color: string]: { x: number; y: number }[] } = {
  red: [
    { x: 1.5, y: 7.5 }, { x: 2.5, y: 7.5 }, { x: 3.5, y: 7.5 }, { x: 4.5, y: 7.5 }, { x: 5.5, y: 7.5 }, { x: 6.5, y: 7.5 }
  ],
  green: [
    { x: 7.5, y: 1.5 }, { x: 7.5, y: 2.5 }, { x: 7.5, y: 3.5 }, { x: 7.5, y: 4.5 }, { x: 7.5, y: 5.5 }, { x: 7.5, y: 6.5 }
  ],
  yellow: [
    { x: 13.5, y: 7.5 }, { x: 12.5, y: 7.5 }, { x: 11.5, y: 7.5 }, { x: 10.5, y: 7.5 }, { x: 9.5, y: 7.5 }, { x: 8.5, y: 7.5 }
  ],
  blue: [
    { x: 7.5, y: 13.5 }, { x: 7.5, y: 12.5 }, { x: 7.5, y: 11.5 }, { x: 7.5, y: 10.5 }, { x: 7.5, y: 9.5 }, { x: 7.5, y: 8.5 }
  ],
};

// Ludo King Style 3D Pin Token
const PinToken = ({ 
  color, 
  isActive, 
  isSelected,
  size = 18
}: { 
  color: keyof typeof COLORS; 
  isActive: boolean;
  isSelected: boolean;
  size?: number;
}) => {
  const colors = COLORS[color];
  const id = `pin-${color}-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 24 34" className="drop-shadow-xl">
      <defs>
        <linearGradient id={`${id}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="50%" stopColor={colors.main} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>
        <radialGradient id={`${id}-gem`} cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="70%" stopColor={colors.main} />
          <stop offset="100%" stopColor={colors.dark} />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5"/>
        </filter>
        <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
          <feFlood floodColor={colors.main} floodOpacity="0.6" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <g filter={isSelected ? `url(#${id}-glow)` : `url(#${id}-shadow)`}>
        {/* Pin body - teardrop */}
        <path
          d="M12 1.5 C5.5 1.5 1.5 7 1.5 12.5 C1.5 19 12 33 12 33 C12 33 22.5 19 22.5 12.5 C22.5 7 18.5 1.5 12 1.5 Z"
          fill={`url(#${id}-body)`}
          stroke={isSelected ? '#fff' : colors.dark}
          strokeWidth={isSelected ? 2 : 1}
        />
        
        {/* White inner ring */}
        <circle cx="12" cy="11" r="7" fill="#fff" stroke={colors.main} strokeWidth="0.8" />
        
        {/* Colored gem center */}
        <circle cx="12" cy="11" r="5" fill={`url(#${id}-gem)`} />
        
        {/* Shine highlights */}
        <ellipse cx="9.5" cy="8.5" rx="2.5" ry="2" fill="rgba(255,255,255,0.7)" />
        <ellipse cx="10" cy="9" rx="1" ry="0.8" fill="rgba(255,255,255,0.9)" />
      </g>
    </svg>
  );
};

const COLOR_POSITIONS: Record<string, 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = {
  red: 'top-left',
  green: 'top-right',
  yellow: 'bottom-right',
  blue: 'bottom-left',
};

const LudoBoard = ({ players, onTokenClick, selectedToken, captureEvent, onCaptureAnimationComplete, diceValue = 1 }: LudoBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(Math.min(window.innerWidth - 16, window.innerHeight - 200, 420));
  const [capturePosition, setCapturePosition] = useState<{ x: number; y: number } | null>(null);
  const [previewToken, setPreviewToken] = useState<{ color: string; tokenId: number; position: number } | null>(null);
  
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = window.innerWidth - 16;
      const maxHeight = window.innerHeight - 200;
      setSize(Math.min(maxWidth, maxHeight, 420));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const cellSize = size / 15;
  
  useEffect(() => {
    if (captureEvent && boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const capturingTrack = COLOR_TRACKS[captureEvent.capturingColor];
      
      if (capturingTrack && captureEvent.position >= 1 && captureEvent.position <= 51) {
        const trackPos = capturingTrack[captureEvent.position - 1];
        if (trackPos) {
          setCapturePosition({
            x: boardRect.left + (trackPos.x * cellSize),
            y: boardRect.top + (trackPos.y * cellSize)
          });
        }
      }
    } else {
      setCapturePosition(null);
    }
  }, [captureEvent, cellSize]);

  const currentTurnPlayer = players.find(p => p.isCurrentTurn);

  const getTokenPosition = (token: Token, color: string): { x: number; y: number } => {
    if (token.position === 0) {
      const homePos = HOME_POSITIONS[color][token.id];
      return { x: homePos.x * cellSize, y: homePos.y * cellSize };
    }
    
    if (token.position >= 52) {
      const homePathIndex = token.position - 52;
      if (homePathIndex < HOME_PATHS[color].length) {
        const pos = HOME_PATHS[color][homePathIndex];
        return { x: pos.x * cellSize, y: pos.y * cellSize };
      }
      return { x: 7.5 * cellSize, y: 7.5 * cellSize };
    }
    
    const colorTrack = COLOR_TRACKS[color];
    const trackIndex = token.position - 1;
    
    if (colorTrack && trackIndex >= 0 && trackIndex < colorTrack.length) {
      const pos = colorTrack[trackIndex];
      return { x: pos.x * cellSize, y: pos.y * cellSize };
    }
    
    return { x: 7.5 * cellSize, y: 7.5 * cellSize };
  };

  const getPathPreviewCells = (color: string, currentPos: number, dice: number): { x: number; y: number }[] => {
    const cells: { x: number; y: number }[] = [];
    const colorTrack = COLOR_TRACKS[color];
    const homePath = HOME_PATHS[color];
    
    if (!colorTrack) return cells;
    
    if (currentPos === 0) {
      if (dice === 6) {
        cells.push(colorTrack[0]);
      }
      return cells;
    }
    
    let pos = currentPos;
    for (let i = 0; i < dice; i++) {
      pos++;
      
      if (pos <= 51) {
        cells.push(colorTrack[pos - 1]);
      } else if (pos >= 52 && pos <= 57) {
        const homeIndex = pos - 52;
        if (homeIndex < homePath.length) {
          cells.push(homePath[homeIndex]);
        }
      } else if (pos > 57) {
        return [];
      }
    }
    
    return cells;
  };

  const canTokenMove = (position: number, dice: number): boolean => {
    if (position === 0) return dice === 6;
    if (position > 0 && position + dice <= 57) return true;
    return false;
  };

  const SAFE_SPOTS = [1, 9, 14, 22, 27, 35, 40, 48];

  const getOpponentAtPosition = (movingColor: string, targetPosition: number): { color: string; tokenId: number } | null => {
    if (targetPosition <= 0 || targetPosition >= 52) return null;
    if (SAFE_SPOTS.includes(targetPosition)) return null;
    
    const movingTrack = COLOR_TRACKS[movingColor];
    if (!movingTrack || targetPosition < 1 || targetPosition > 51) return null;
    const targetCoord = movingTrack[targetPosition - 1];
    
    for (const player of players) {
      if (player.color === movingColor) continue;
      
      for (const token of player.tokens) {
        if (token.position <= 0 || token.position >= 52) continue;
        
        const opponentTrack = COLOR_TRACKS[player.color];
        if (!opponentTrack || token.position < 1 || token.position > 51) continue;
        const opponentCoord = opponentTrack[token.position - 1];
        
        if (Math.abs(opponentCoord.x - targetCoord.x) < 0.1 && Math.abs(opponentCoord.y - targetCoord.y) < 0.1) {
          return { color: player.color, tokenId: token.id };
        }
      }
    }
    return null;
  };

  const getFinalPosition = (currentPos: number, dice: number): number => {
    if (currentPos === 0) return dice === 6 ? 1 : currentPos;
    return currentPos + dice;
  };

  const currentTurnColor = useMemo(() => {
    const current = players.find(p => p.isCurrentTurn);
    return current ? (current.color as keyof typeof COLORS) : null;
  }, [players]);

  return (
    <div className="relative mx-auto">
      {/* Board Container with ProBattle glow effect */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-xl overflow-hidden"
        style={{
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.2), 0 8px 32px rgba(0,0,0,0.5)',
          border: '2px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <div ref={boardRef} className="relative" style={{ width: size, height: size }}>
          {/* Main Board SVG - ProBattle Dark Theme */}
          <svg viewBox="0 0 15 15" className="w-full h-full">
            <defs>
              {/* Neon glow filter */}
              <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.15" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              {/* Grid pattern for cyber look */}
              <pattern id="gridPattern" width="1" height="1" patternUnits="userSpaceOnUse">
                <rect width="1" height="1" fill={BOARD_THEME.cellBg} stroke={BOARD_THEME.cellBorder} strokeWidth="0.02"/>
              </pattern>
            </defs>

            {/* Dark background */}
            <rect x="0" y="0" width="15" height="15" fill={BOARD_THEME.background} />

            {/* RED Home Base (top-left) - Neon border */}
            <rect x="0" y="0" width="6" height="6" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.1" filter="url(#neonGlow)" />
            <rect x="0.4" y="0.4" width="5.2" height="5.2" fill={BOARD_THEME.background} rx="0.2" />
            {/* Token slots with glow */}
            {[[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]].map(([cx, cy], i) => (
              <g key={`red-slot-${i}`}>
                <circle cx={cx} cy={cy} r="0.75" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.08" />
                <circle cx={cx} cy={cy} r="0.4" fill={COLORS.red.main} opacity="0.15" />
              </g>
            ))}

            {/* GREEN Home Base (top-right) - Neon border */}
            <rect x="9" y="0" width="6" height="6" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.1" filter="url(#neonGlow)" />
            <rect x="9.4" y="0.4" width="5.2" height="5.2" fill={BOARD_THEME.background} rx="0.2" />
            {[[10.5, 1.5], [13.5, 1.5], [10.5, 4.5], [13.5, 4.5]].map(([cx, cy], i) => (
              <g key={`green-slot-${i}`}>
                <circle cx={cx} cy={cy} r="0.75" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.08" />
                <circle cx={cx} cy={cy} r="0.4" fill={COLORS.green.main} opacity="0.15" />
              </g>
            ))}

            {/* BLUE Home Base (bottom-left) - Neon border */}
            <rect x="0" y="9" width="6" height="6" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.1" filter="url(#neonGlow)" />
            <rect x="0.4" y="9.4" width="5.2" height="5.2" fill={BOARD_THEME.background} rx="0.2" />
            {[[1.5, 10.5], [4.5, 10.5], [1.5, 13.5], [4.5, 13.5]].map(([cx, cy], i) => (
              <g key={`blue-slot-${i}`}>
                <circle cx={cx} cy={cy} r="0.75" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.08" />
                <circle cx={cx} cy={cy} r="0.4" fill={COLORS.blue.main} opacity="0.15" />
              </g>
            ))}

            {/* YELLOW Home Base (bottom-right) - Neon border */}
            <rect x="9" y="9" width="6" height="6" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.1" filter="url(#neonGlow)" />
            <rect x="9.4" y="9.4" width="5.2" height="5.2" fill={BOARD_THEME.background} rx="0.2" />
            {[[10.5, 10.5], [13.5, 10.5], [10.5, 13.5], [13.5, 13.5]].map(([cx, cy], i) => (
              <g key={`yellow-slot-${i}`}>
                <circle cx={cx} cy={cy} r="0.75" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.08" />
                <circle cx={cx} cy={cy} r="0.4" fill={COLORS.yellow.main} opacity="0.15" />
              </g>
            ))}

            {/* Track Cells - Dark with subtle borders */}
            <g fill={BOARD_THEME.cellBg} stroke={BOARD_THEME.cellBorder} strokeWidth="0.02">
              {/* Top path */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <g key={`top-${i}`}>
                  <rect x={6} y={i} width="1" height="1" />
                  <rect x={7} y={i} width="1" height="1" />
                  <rect x={8} y={i} width="1" height="1" />
                </g>
              ))}
              {/* Bottom path */}
              {[9, 10, 11, 12, 13, 14].map(i => (
                <g key={`bottom-${i}`}>
                  <rect x={6} y={i} width="1" height="1" />
                  <rect x={7} y={i} width="1" height="1" />
                  <rect x={8} y={i} width="1" height="1" />
                </g>
              ))}
              {/* Left path */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <g key={`left-${i}`}>
                  <rect x={i} y={6} width="1" height="1" />
                  <rect x={i} y={7} width="1" height="1" />
                  <rect x={i} y={8} width="1" height="1" />
                </g>
              ))}
              {/* Right path */}
              {[9, 10, 11, 12, 13, 14].map(i => (
                <g key={`right-${i}`}>
                  <rect x={i} y={6} width="1" height="1" />
                  <rect x={i} y={7} width="1" height="1" />
                  <rect x={i} y={8} width="1" height="1" />
                </g>
              ))}
            </g>

            {/* Home stretch colored cells with glow */}
            {/* Green home stretch (top) */}
            {[1, 2, 3, 4, 5, 6].map(i => (
              <rect key={`green-home-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.05" />
            ))}
            {/* Red home stretch (left) */}
            {[1, 2, 3, 4, 5, 6].map(i => (
              <rect key={`red-home-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.05" />
            ))}
            {/* Yellow home stretch (right) */}
            {[8, 9, 10, 11, 12, 13].map(i => (
              <rect key={`yellow-home-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.05" />
            ))}
            {/* Blue home stretch (bottom) */}
            {[8, 9, 10, 11, 12, 13].map(i => (
              <rect key={`blue-home-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.05" />
            ))}

            {/* Start position cells - neon colored */}
            <rect x={6} y={1} width="1" height="1" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.08" />
            <rect x={1} y={6} width="1" height="1" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.08" />
            <rect x={8} y={13} width="1" height="1" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.08" />
            <rect x={13} y={8} width="1" height="1" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.08" />

            {/* Center triangles (finish area) with glow */}
            <g filter="url(#neonGlow)">
              <polygon points="6,6 7.5,7.5 6,9" fill={COLORS.red.main} opacity="0.9" />
              <polygon points="6,6 7.5,7.5 9,6" fill={COLORS.green.main} opacity="0.9" />
              <polygon points="9,6 7.5,7.5 9,9" fill={COLORS.yellow.main} opacity="0.9" />
              <polygon points="6,9 7.5,7.5 9,9" fill={COLORS.blue.main} opacity="0.9" />
            </g>
            {/* Center border with glow */}
            <polygon points="6,6 9,6 9,9 6,9" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.08" />
            {/* Center dot */}
            <circle cx="7.5" cy="7.5" r="0.3" fill="rgba(255,255,255,0.8)" />

            {/* Safe spot stars - glowing */}
            {[
              { x: 2.5, y: 6.5, color: COLORS.red.main },
              { x: 6.5, y: 2.5, color: COLORS.green.main },
              { x: 12.5, y: 8.5, color: COLORS.yellow.main },
              { x: 8.5, y: 12.5, color: COLORS.blue.main },
              { x: 8.5, y: 2.5, color: '#fff' },
              { x: 2.5, y: 8.5, color: '#fff' },
              { x: 6.5, y: 12.5, color: '#fff' },
              { x: 12.5, y: 6.5, color: '#fff' },
            ].map(({ x, y, color }, i) => (
              <g key={`star-${i}`} transform={`translate(${x}, ${y})`}>
                <polygon
                  points="0,-0.35 0.1,-0.1 0.35,0 0.1,0.1 0,0.35 -0.1,0.1 -0.35,0 -0.1,-0.1"
                  fill={color}
                  opacity="0.7"
                />
              </g>
            ))}

            {/* Direction arrows - neon colored */}
            {/* Down arrow (green entry) */}
            <path d="M7.5,0.5 L7.5,0.85 M7.35,0.7 L7.5,0.85 L7.65,0.7" stroke={COLORS.green.main} strokeWidth="0.1" fill="none" />
            {/* Up arrow (blue entry) */}
            <path d="M7.5,14.5 L7.5,14.15 M7.35,14.3 L7.5,14.15 L7.65,14.3" stroke={COLORS.blue.main} strokeWidth="0.1" fill="none" />
            {/* Right arrow (red entry) */}
            <path d="M0.5,7.5 L0.85,7.5 M0.7,7.35 L0.85,7.5 L0.7,7.65" stroke={COLORS.red.main} strokeWidth="0.1" fill="none" />
            {/* Left arrow (yellow entry) */}
            <path d="M14.5,7.5 L14.15,7.5 M14.3,7.35 L14.15,7.5 L14.3,7.65" stroke={COLORS.yellow.main} strokeWidth="0.1" fill="none" />
          </svg>

          {/* Path Preview Overlay */}
          {previewToken && (
            <div className="absolute inset-0 pointer-events-none" style={{ width: size, height: size }}>
              {previewToken.position === 0 && diceValue === 6 && (() => {
                const colorKey = previewToken.color as keyof typeof COLORS;
                const colorTrack = COLOR_TRACKS[previewToken.color];
                if (!colorTrack) return null;
                const entryCell = colorTrack[0];
                const homeCenter = {
                  x: HOME_POSITIONS[previewToken.color].reduce((sum, p) => sum + p.x, 0) / 4,
                  y: HOME_POSITIONS[previewToken.color].reduce((sum, p) => sum + p.y, 0) / 4
                };
                
                return (
                  <motion.div className="absolute inset-0" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="absolute inset-0">
                      <defs>
                        <marker id={`arrow-${previewToken.color}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                          <path d="M0,0 L8,4 L0,8 Z" fill={COLORS[colorKey].main} />
                        </marker>
                      </defs>
                      <motion.path
                        d={`M ${homeCenter.x * cellSize} ${homeCenter.y * cellSize} Q ${(homeCenter.x + entryCell.x) / 2 * cellSize} ${(homeCenter.y + entryCell.y) / 2 * cellSize - 10} ${entryCell.x * cellSize} ${entryCell.y * cellSize}`}
                        stroke={COLORS[colorKey].main}
                        strokeWidth="2"
                        strokeDasharray="5,3"
                        fill="none"
                        markerEnd={`url(#arrow-${previewToken.color})`}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.8 }}
                        transition={{ duration: 0.4 }}
                      />
                    </svg>
                  </motion.div>
                );
              })()}
              
              {getPathPreviewCells(previewToken.color, previewToken.position, diceValue).map((cell, index, arr) => {
                const isLast = index === arr.length - 1;
                const colorKey = previewToken.color as keyof typeof COLORS;
                const isHomeExit = previewToken.position === 0 && diceValue === 6;
                const finalPos = getFinalPosition(previewToken.position, diceValue);
                const captureTarget = isLast ? getOpponentAtPosition(previewToken.color, finalPos) : null;
                const isCapture = isLast && captureTarget !== null;
                
                return (
                  <motion.div
                    key={`preview-${index}`}
                    className="absolute rounded-sm"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: isCapture ? [1, 1.15, 1] : 1 }}
                    transition={{ delay: index * 0.05, duration: 0.15 }}
                    style={{
                      left: cell.x * cellSize - cellSize * 0.35,
                      top: cell.y * cellSize - cellSize * 0.35,
                      width: cellSize * 0.7,
                      height: cellSize * 0.7,
                      backgroundColor: isCapture ? '#DC2626' : isLast ? `${COLORS[colorKey].main}` : `${COLORS[colorKey].light}80`,
                      border: isCapture ? '2px solid #991B1B' : isLast ? `2px solid ${COLORS[colorKey].dark}` : `1px dashed ${COLORS[colorKey].main}`,
                      boxShadow: isCapture ? '0 0 10px #DC2626' : isLast ? `0 0 6px ${COLORS[colorKey].main}` : 'none',
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold"
                      style={{ fontSize: cellSize * 0.28, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {isCapture ? '💀' : isHomeExit ? 'GO' : isLast ? '●' : index + 1}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Corner Player Labels - Small UID badges on board corners */}
          {players.map((player) => {
            const position = COLOR_POSITIONS[player.color];
            if (!position) return null;
            const colorKey = player.color as keyof typeof COLORS;
            const displayUid = player.uid ? `#${player.uid}` : '#00000';
            const posClasses = {
              'top-left': 'top-1 left-1',
              'top-right': 'top-1 right-1',
              'bottom-left': 'bottom-1 left-1',
              'bottom-right': 'bottom-1 right-1',
            };
            
            return (
              <motion.div
                key={`label-${player.color}`}
                className={cn(
                  'absolute flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white backdrop-blur-sm',
                  posClasses[position]
                )}
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS[colorKey].main}dd, ${COLORS[colorKey].dark}ee)`,
                  border: player.isCurrentTurn ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: player.isCurrentTurn 
                    ? `0 0 12px ${COLORS[colorKey].main}, 0 2px 8px rgba(0,0,0,0.3)` 
                    : '0 2px 6px rgba(0,0,0,0.2)',
                }}
                animate={{ scale: player.isCurrentTurn ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {player.isBot ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                <span className="font-mono tracking-tight">{displayUid}</span>
                {player.isCurrentTurn && <Crown className="w-3 h-3 text-yellow-300 drop-shadow-lg" />}
              </motion.div>
            );
          })}

          {/* Pin Tokens */}
          {players.map((player) => (
            player.tokens.map((token) => {
              const pos = getTokenPosition(token, player.color);
              const isSelected = selectedToken?.color === player.color && selectedToken?.tokenId === token.id;
              const colorKey = player.color as keyof typeof COLORS;
              const canMove = player.isCurrentTurn && canTokenMove(token.position, diceValue);
              const isHoveredToken = previewToken?.color === player.color && previewToken?.tokenId === token.id;

              return (
                <motion.button
                  key={`${player.color}-${token.id}`}
                  className={cn(
                    'absolute flex items-center justify-center',
                    player.isCurrentTurn && onTokenClick && 'cursor-pointer z-10',
                    isSelected && 'z-20',
                    canMove && !isSelected && 'z-15'
                  )}
                  style={{ width: cellSize * 0.85, height: cellSize * 1.2 }}
                  initial={false}
                  animate={{
                    left: pos.x - (cellSize * 0.42),
                    top: pos.y - (cellSize * 0.7),
                    scale: isSelected ? 1.3 : canMove ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  whileHover={onTokenClick && player.isCurrentTurn ? { scale: 1.15, y: -2 } : {}}
                  whileTap={onTokenClick && player.isCurrentTurn ? { scale: 0.92 } : {}}
                  onClick={() => onTokenClick?.(player.color, token.id)}
                  onMouseEnter={() => canMove && setPreviewToken({ color: player.color, tokenId: token.id, position: token.position })}
                  onMouseLeave={() => setPreviewToken(null)}
                  onTouchStart={() => canMove && setPreviewToken({ color: player.color, tokenId: token.id, position: token.position })}
                  onTouchEnd={() => setPreviewToken(null)}
                  disabled={!player.isCurrentTurn || !onTokenClick}
                >
                  <PinToken color={colorKey} isActive={player.isCurrentTurn} isSelected={isSelected} size={cellSize * 0.7} />
                  
                  {/* Movable indicator ring */}
                  {canMove && !isSelected && (
                    <motion.div
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        width: cellSize * 0.8,
                        height: cellSize * 0.8,
                        top: cellSize * 0.15,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        border: `2px solid ${COLORS[colorKey].main}`,
                        boxShadow: `0 0 10px ${COLORS[colorKey].main}`,
                      }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.4, 0.8] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                  
                  {/* TAP badge */}
                  {canMove && !isSelected && !isHoveredToken && (
                    <motion.div
                      className="absolute px-1.5 py-0.5 rounded-full text-white font-bold shadow-lg pointer-events-none"
                      style={{
                        fontSize: cellSize * 0.14,
                        background: COLORS[colorKey].main,
                        border: '1px solid white',
                        top: cellSize * -0.15,
                        right: cellSize * -0.25,
                      }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      TAP
                    </motion.div>
                  )}
                </motion.button>
              );
            })
          ))}

          {/* Capture Animation */}
          <CaptureAnimation
            isActive={!!captureEvent && !!capturePosition}
            position={capturePosition || { x: 0, y: 0 }}
            capturedColor={captureEvent?.capturedColor || 'red'}
            onComplete={() => onCaptureAnimationComplete?.()}
          />
        </div>
      </motion.div>

      {/* Bottom Player Cards Section */}
      <div className="mt-3 px-2">
        <div className="flex items-center justify-between">
          {/* Left Player Card */}
          {players[0] && (
            <PlayerCard 
              player={players[0]} 
              position="left"
            />
          )}
          
          {/* Center Turn Indicator */}
          <AnimatePresence mode="wait">
            {currentTurnPlayer && (
              <motion.div
                key={currentTurnPlayer.color}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}, ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].dark})`,
                  boxShadow: `0 0 20px ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}40, 0 4px 12px rgba(0,0,0,0.3)`,
                }}
              >
                {currentTurnPlayer.isBot ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                <span className="text-white font-bold text-xs font-mono">
                  #{currentTurnPlayer.uid || '00000'}'s Turn
                </span>
                <Crown className="w-4 h-4 text-yellow-300" />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Right Player Card */}
          {players[1] && (
            <PlayerCard 
              player={players[1]} 
              position="right"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LudoBoard;
