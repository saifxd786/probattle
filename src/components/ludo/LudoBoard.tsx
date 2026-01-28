import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import CaptureAnimation from './CaptureAnimation';

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
  avatar?: string;
  coins?: number;
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

// Enhanced Ludo King colors - more vibrant
const COLORS = {
  red: { main: '#E53935', light: '#FF5252', dark: '#B71C1C', bg: '#E53935' },
  green: { main: '#43A047', light: '#69F0AE', dark: '#1B5E20', bg: '#43A047' },
  yellow: { main: '#FFD600', light: '#FFFF00', dark: '#F9A825', bg: '#FFD600' },
  blue: { main: '#1E88E5', light: '#64B5F6', dark: '#0D47A1', bg: '#1E88E5' }
};

// Generate random 5-digit UID
const generateUID = () => {
  return String(Math.floor(10000 + Math.random() * 90000));
};

// Home positions for each color (token slots in corners) - 2x2 grid style
const HOME_POSITIONS: { [color: string]: { x: number; y: number }[] } = {
  red: [{ x: 1.8, y: 1.8 }, { x: 4.2, y: 1.8 }, { x: 1.8, y: 4.2 }, { x: 4.2, y: 4.2 }],
  green: [{ x: 10.8, y: 1.8 }, { x: 13.2, y: 1.8 }, { x: 10.8, y: 4.2 }, { x: 13.2, y: 4.2 }],
  yellow: [{ x: 10.8, y: 10.8 }, { x: 13.2, y: 10.8 }, { x: 10.8, y: 13.2 }, { x: 13.2, y: 13.2 }],
  blue: [{ x: 1.8, y: 10.8 }, { x: 4.2, y: 10.8 }, { x: 1.8, y: 13.2 }, { x: 4.2, y: 13.2 }]
};

// Track paths
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

// Ludo King style pin token
const LudoKingToken = ({ 
  color, 
  isActive,
  isSelected,
  size = 20
}: { 
  color: keyof typeof COLORS; 
  isActive: boolean;
  isSelected: boolean;
  size?: number;
}) => {
  const colors = COLORS[color];
  const id = `token-${color}-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 30 45" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`${id}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="50%" stopColor={colors.main} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
          <feFlood floodColor={colors.main} floodOpacity="0.6" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <g filter={isSelected ? `url(#${id}-glow)` : undefined}>
        {/* Base ring - red/maroon ring at bottom */}
        <ellipse cx="15" cy="42" rx="10" ry="3" fill="#8B0000" />
        <ellipse cx="15" cy="41" rx="9" ry="2.5" fill="#B22222" />
        
        {/* Pin body - teardrop shape */}
        <path
          d="M15 2 C7 2 2 10 2 17 C2 26 15 42 15 42 C15 42 28 26 28 17 C28 10 23 2 15 2 Z"
          fill={`url(#${id}-body)`}
          stroke={isSelected ? '#fff' : colors.dark}
          strokeWidth={isSelected ? 2 : 1}
        />
        
        {/* White circle background */}
        <circle cx="15" cy="15" r="9" fill="#fff" />
        
        {/* Colored inner circle */}
        <circle cx="15" cy="15" r="7" fill={colors.main} />
        
        {/* Highlight shine */}
        <ellipse cx="12" cy="12" rx="3" ry="2.5" fill="rgba(255,255,255,0.6)" />
        <ellipse cx="11" cy="11" rx="1.5" ry="1" fill="rgba(255,255,255,0.9)" />
      </g>
    </svg>
  );
};

// Player Profile Card - Clean style with UID
const PlayerProfileCard = ({ 
  player, 
  isLeft
}: { 
  player: Player; 
  isLeft: boolean;
}) => {
  const colors = COLORS[player.color as keyof typeof COLORS];
  // Use player.uid if available, otherwise generate a random 5-digit UID
  const displayUID = player.uid || useMemo(() => generateUID(), []);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Player card with avatar */}
      <div 
        className={cn(
          "relative rounded-xl overflow-hidden",
          player.isCurrentTurn && "ring-2 ring-green-400"
        )}
        style={{
          width: 72,
          height: 90,
          background: `linear-gradient(180deg, ${colors.main}40 0%, ${colors.dark}60 100%)`,
          border: player.isCurrentTurn ? '2px solid #4ade80' : `2px solid ${colors.main}80`
        }}
      >
        {/* Avatar area */}
        <div className="flex items-center justify-center pt-2">
          <div 
            className="w-12 h-12 rounded-full overflow-hidden"
            style={{ 
              border: `3px solid ${colors.main}`,
              boxShadow: `0 0 10px ${colors.main}50`
            }}
          >
            {player.avatar ? (
              <img src={player.avatar} alt={displayUID} className="w-full h-full object-cover" />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: `linear-gradient(135deg, ${colors.light} 0%, ${colors.dark} 100%)` }}
              >
                {displayUID.slice(0, 2)}
              </div>
            )}
          </div>
        </div>
        
        {/* UID Display */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-full px-2">
          <div 
            className="text-center py-1 rounded-md text-xs font-bold text-white"
            style={{ 
              background: 'rgba(0,0,0,0.5)',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {displayUID}
          </div>
        </div>
      </div>
      
      {/* Color indicator at corner */}
      <div 
        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full"
        style={{ 
          background: colors.main,
          border: '2px solid white',
          boxShadow: `0 2px 8px ${colors.main}80`
        }}
      />
      
      {/* Crown for current turn */}
      {player.isCurrentTurn && (
        <motion.div 
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Crown className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
        </motion.div>
      )}
    </motion.div>
  );
};

// Bottom info bar - Clean style
const BottomInfoBar = ({ 
  players 
}: { 
  players: Player[];
}) => {
  const leftPlayer = players[0];
  const rightPlayer = players[1];
  const leftUID = leftPlayer?.uid || useMemo(() => generateUID(), []);
  const rightUID = rightPlayer?.uid || useMemo(() => generateUID(), []);
  
  return (
    <div 
      className="flex items-center justify-between px-3 py-2 rounded-xl"
      style={{
        background: 'linear-gradient(180deg, rgba(30,60,100,0.9) 0%, rgba(15,35,70,0.95) 100%)',
        border: '1px solid rgba(100,150,200,0.3)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}
    >
      {/* Left Player Info */}
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded-full"
          style={{ 
            background: COLORS[leftPlayer?.color as keyof typeof COLORS]?.main || '#1E88E5',
            boxShadow: `0 0 8px ${COLORS[leftPlayer?.color as keyof typeof COLORS]?.main || '#1E88E5'}50`
          }}
        />
        <div className="text-left">
          <div className="text-white font-bold text-sm">{leftUID}</div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-xs">💰</span>
            <span className="text-yellow-300 text-xs font-medium">{leftPlayer?.coins || 1250}</span>
          </div>
        </div>
      </div>

      {/* VS Badge */}
      <div 
        className="px-3 py-1 rounded-lg font-bold text-sm"
        style={{
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          color: '#1a1a2e',
          boxShadow: '0 2px 10px rgba(255,215,0,0.3)'
        }}
      >
        VS
      </div>

      {/* Right Player Info */}
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="text-white font-bold text-sm">{rightUID}</div>
          <div className="flex items-center justify-end gap-1">
            <span className="text-yellow-400 text-xs">💰</span>
            <span className="text-yellow-300 text-xs font-medium">{rightPlayer?.coins || 1250}</span>
          </div>
        </div>
        <div 
          className="w-8 h-8 rounded-full"
          style={{ 
            background: COLORS[rightPlayer?.color as keyof typeof COLORS]?.main || '#43A047',
            boxShadow: `0 0 8px ${COLORS[rightPlayer?.color as keyof typeof COLORS]?.main || '#43A047'}50`
          }}
        />
      </div>
    </div>
  );
};

const LudoBoard = ({ players, onTokenClick, selectedToken, captureEvent, onCaptureAnimationComplete, diceValue = 1 }: LudoBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(Math.min(window.innerWidth - 16, window.innerHeight - 280, 380));
  const [capturePosition, setCapturePosition] = useState<{ x: number; y: number } | null>(null);
  
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = window.innerWidth - 16;
      const maxHeight = window.innerHeight - 280;
      setSize(Math.min(maxWidth, maxHeight, 380));
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

  const canTokenMove = (position: number, dice: number): boolean => {
    if (position === 0) return dice === 6;
    if (position > 0 && position + dice <= 57) return true;
    return false;
  };

  return (
    <div className="relative mx-auto flex flex-col">
      {/* Enhanced Blue Pattern Background */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, #1565C0 0%, #0D47A1 50%, #0A2472 100%)',
        }}
      />

      {/* Board Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative mx-auto mt-4"
      >
        <div ref={boardRef} className="relative" style={{ width: size, height: size }}>
          {/* Main Board SVG - Enhanced Ludo King Style */}
          <svg viewBox="0 0 15 15" className="w-full h-full drop-shadow-2xl">
            {/* White base with subtle shadow */}
            <defs>
              <filter id="boardShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
              </filter>
            </defs>
            <rect x="0" y="0" width="15" height="15" fill="#FAFAFA" filter="url(#boardShadow)" rx="0.3" />

            {/* RED Home Base (top-left) - Enhanced */}
            <rect x="0" y="0" width="6" height="6" fill={COLORS.red.main} />
            <rect x="0.3" y="0.3" width="5.4" height="5.4" fill="#FFFFFF" rx="0.3" />
            {[[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]].map(([cx, cy], i) => (
              <g key={`red-slot-${i}`}>
                <circle cx={cx} cy={cy} r="0.75" fill={COLORS.red.dark} />
                <circle cx={cx} cy={cy} r="0.65" fill={COLORS.red.main} />
              </g>
            ))}

            {/* GREEN Home Base (top-right) - Enhanced */}
            <rect x="9" y="0" width="6" height="6" fill={COLORS.green.main} />
            <rect x="9.3" y="0.3" width="5.4" height="5.4" fill="#FFFFFF" rx="0.3" />
            {[[10.5, 1.5], [13.5, 1.5], [10.5, 4.5], [13.5, 4.5]].map(([cx, cy], i) => (
              <g key={`green-slot-${i}`}>
                <circle cx={cx} cy={cy} r="0.75" fill={COLORS.green.dark} />
                <circle cx={cx} cy={cy} r="0.65" fill={COLORS.green.main} />
              </g>
            ))}

            {/* BLUE Home Base (bottom-left) - Enhanced */}
            <rect x="0" y="9" width="6" height="6" fill={COLORS.blue.main} />
            <rect x="0.3" y="9.3" width="5.4" height="5.4" fill="#FFFFFF" rx="0.3" />
            {[[1.5, 10.5], [4.5, 10.5], [1.5, 13.5], [4.5, 13.5]].map(([cx, cy], i) => (
              <g key={`blue-slot-${i}`}>
                <circle cx={cx} cy={cy} r="0.75" fill={COLORS.blue.dark} />
                <circle cx={cx} cy={cy} r="0.65" fill={COLORS.blue.main} />
              </g>
            ))}

            {/* YELLOW Home Base (bottom-right) - Enhanced */}
            <rect x="9" y="9" width="6" height="6" fill={COLORS.yellow.main} />
            <rect x="9.3" y="9.3" width="5.4" height="5.4" fill="#FFFFFF" rx="0.3" />
            {[[10.5, 10.5], [13.5, 10.5], [10.5, 13.5], [13.5, 13.5]].map(([cx, cy], i) => (
              <g key={`yellow-slot-${i}`}>
                <circle cx={cx} cy={cy} r="0.75" fill={COLORS.yellow.dark} />
                <circle cx={cx} cy={cy} r="0.65" fill={COLORS.yellow.main} />
              </g>
            ))}

            {/* Track Cells - White with light borders */}
            <g fill="#FFFFFF" stroke="#D0D0D0" strokeWidth="0.04">
              {/* Top path columns */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <g key={`top-${i}`}>
                  <rect x={6} y={i} width="1" height="1" />
                  <rect x={7} y={i} width="1" height="1" />
                  <rect x={8} y={i} width="1" height="1" />
                </g>
              ))}
              {/* Bottom path columns */}
              {[9, 10, 11, 12, 13, 14].map(i => (
                <g key={`bottom-${i}`}>
                  <rect x={6} y={i} width="1" height="1" />
                  <rect x={7} y={i} width="1" height="1" />
                  <rect x={8} y={i} width="1" height="1" />
                </g>
              ))}
              {/* Left path rows */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <g key={`left-${i}`}>
                  <rect x={i} y={6} width="1" height="1" />
                  <rect x={i} y={7} width="1" height="1" />
                  <rect x={i} y={8} width="1" height="1" />
                </g>
              ))}
              {/* Right path rows */}
              {[9, 10, 11, 12, 13, 14].map(i => (
                <g key={`right-${i}`}>
                  <rect x={i} y={6} width="1" height="1" />
                  <rect x={i} y={7} width="1" height="1" />
                  <rect x={i} y={8} width="1" height="1" />
                </g>
              ))}
            </g>

            {/* Home stretch colored cells - FIXED POSITIONS */}
            {/* Green home stretch (top center column at x=7, going DOWN from y=1 to y=5) */}
            {[1, 2, 3, 4, 5].map(i => (
              <rect key={`green-home-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.green.main} stroke={COLORS.green.dark} strokeWidth="0.03" />
            ))}
            {/* Red home stretch (left center row at y=7, going RIGHT from x=1 to x=5) */}
            {[1, 2, 3, 4, 5].map(i => (
              <rect key={`red-home-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.red.main} stroke={COLORS.red.dark} strokeWidth="0.03" />
            ))}
            {/* Yellow home stretch (right center row at y=7, going LEFT from x=13 to x=9) */}
            {[9, 10, 11, 12, 13].map(i => (
              <rect key={`yellow-home-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.yellow.main} stroke={COLORS.yellow.dark} strokeWidth="0.03" />
            ))}
            {/* Blue home stretch (bottom center column at x=7, going UP from y=13 to y=9) */}
            {[9, 10, 11, 12, 13].map(i => (
              <rect key={`blue-home-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.blue.main} stroke={COLORS.blue.dark} strokeWidth="0.03" />
            ))}

            {/* Start positions - colored cells on outer track */}
            <rect x={1} y={6} width="1" height="1" fill={COLORS.red.main} />
            <rect x={8} y={1} width="1" height="1" fill={COLORS.green.main} />
            <rect x={13} y={8} width="1" height="1" fill={COLORS.yellow.main} />
            <rect x={6} y={13} width="1" height="1" fill={COLORS.blue.main} />

            {/* Center triangles (finish area) - Enhanced with gradients */}
            <polygon points="6,6 7.5,7.5 6,9" fill={COLORS.red.main} stroke={COLORS.red.dark} strokeWidth="0.05" />
            <polygon points="6,6 7.5,7.5 9,6" fill={COLORS.green.main} stroke={COLORS.green.dark} strokeWidth="0.05" />
            <polygon points="9,6 7.5,7.5 9,9" fill={COLORS.yellow.main} stroke={COLORS.yellow.dark} strokeWidth="0.05" />
            <polygon points="6,9 7.5,7.5 9,9" fill={COLORS.blue.main} stroke={COLORS.blue.dark} strokeWidth="0.05" />
            
            {/* Center star */}
            <circle cx="7.5" cy="7.5" r="0.3" fill="#FFD700" stroke="#FFA500" strokeWidth="0.05" />

            {/* Safe spot stars - Enhanced */}
            {[
              { x: 2.5, y: 6.5 },
              { x: 6.5, y: 2.5 },
              { x: 12.5, y: 8.5 },
              { x: 8.5, y: 12.5 },
              { x: 8.5, y: 2.5 },
              { x: 2.5, y: 8.5 },
              { x: 6.5, y: 12.5 },
              { x: 12.5, y: 6.5 },
            ].map(({ x, y }, i) => (
              <g key={`star-${i}`} transform={`translate(${x}, ${y})`}>
                <polygon
                  points="0,-0.32 0.09,-0.11 0.32,0 0.09,0.11 0,0.32 -0.09,0.11 -0.32,0 -0.09,-0.11"
                  fill="#FFD700"
                  stroke="#FFA500"
                  strokeWidth="0.03"
                />
              </g>
            ))}

            {/* Direction arrows - Enhanced */}
            <text x="7.5" y="0.7" textAnchor="middle" fontSize="0.5" fill={COLORS.green.dark} fontWeight="bold">↓</text>
            <text x="7.5" y="14.7" textAnchor="middle" fontSize="0.5" fill={COLORS.blue.dark} fontWeight="bold">↑</text>
            <text x="0.5" y="7.7" textAnchor="middle" fontSize="0.5" fill={COLORS.red.dark} fontWeight="bold">→</text>
            <text x="14.5" y="7.7" textAnchor="middle" fontSize="0.5" fill={COLORS.yellow.dark} fontWeight="bold">←</text>
          </svg>

          {/* Pin Tokens */}
          {players.map((player) => (
            player.tokens.map((token) => {
              const pos = getTokenPosition(token, player.color);
              const isSelected = selectedToken?.color === player.color && selectedToken?.tokenId === token.id;
              const colorKey = player.color as keyof typeof COLORS;
              const canMove = player.isCurrentTurn && canTokenMove(token.position, diceValue);

              return (
                <motion.button
                  key={`${player.color}-${token.id}`}
                  className={cn(
                    'absolute flex items-center justify-center',
                    player.isCurrentTurn && onTokenClick && 'cursor-pointer z-10',
                    isSelected && 'z-20',
                    canMove && !isSelected && 'z-15'
                  )}
                  style={{ width: cellSize * 0.9, height: cellSize * 1.35 }}
                  initial={false}
                  animate={{
                    left: pos.x - (cellSize * 0.45),
                    top: pos.y - (cellSize * 0.8),
                    scale: isSelected ? 1.25 : canMove ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  whileHover={onTokenClick && player.isCurrentTurn ? { scale: 1.15, y: -2 } : {}}
                  whileTap={onTokenClick && player.isCurrentTurn ? { scale: 0.92 } : {}}
                  onClick={() => onTokenClick?.(player.color, token.id)}
                  disabled={!player.isCurrentTurn || !onTokenClick}
                >
                  <LudoKingToken color={colorKey} isActive={player.isCurrentTurn} isSelected={isSelected} size={cellSize * 0.65} />
                  
                  {/* Movable indicator */}
                  {canMove && !isSelected && (
                    <motion.div
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        width: cellSize * 0.7,
                        height: cellSize * 0.7,
                        bottom: cellSize * 0.05,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        border: `2px solid ${COLORS[colorKey].main}`,
                        boxShadow: `0 0 8px ${COLORS[colorKey].main}`,
                      }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0.4, 0.8] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
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

      {/* Player Profile Cards at bottom corners */}
      <div className="flex justify-between items-end px-4 mt-4">
        {players[0] && (
          <PlayerProfileCard 
            player={players[0]} 
            isLeft={true}
          />
        )}
        
        {players[1] && (
          <PlayerProfileCard 
            player={players[1]} 
            isLeft={false}
          />
        )}
      </div>

      {/* Bottom Info Bar with player UIDs and coins */}
      <div className="mt-3 px-4">
        <BottomInfoBar players={players} />
      </div>
    </div>
  );
};

export default LudoBoard;
