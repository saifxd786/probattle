import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { User, Bot, Crown, Sparkles, Zap, Star } from 'lucide-react';
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

// Ludo King authentic colors
const COLORS = {
  red: { main: '#D32F2F', light: '#EF5350', dark: '#B71C1C', bg: '#FFCDD2' },
  green: { main: '#388E3C', light: '#66BB6A', dark: '#1B5E20', bg: '#C8E6C9' },
  yellow: { main: '#FBC02D', light: '#FFEE58', dark: '#F57F17', bg: '#FFF9C4' },
  blue: { main: '#1976D2', light: '#42A5F5', dark: '#0D47A1', bg: '#BBDEFB' }
};

// Home positions for each color (token slots in corners)
const HOME_POSITIONS: { [color: string]: { x: number; y: number }[] } = {
  red: [{ x: 1.8, y: 1.8 }, { x: 4.2, y: 1.8 }, { x: 1.8, y: 4.2 }, { x: 4.2, y: 4.2 }],
  green: [{ x: 10.8, y: 1.8 }, { x: 13.2, y: 1.8 }, { x: 10.8, y: 4.2 }, { x: 13.2, y: 4.2 }],
  yellow: [{ x: 10.8, y: 10.8 }, { x: 13.2, y: 10.8 }, { x: 10.8, y: 13.2 }, { x: 13.2, y: 13.2 }],
  blue: [{ x: 1.8, y: 10.8 }, { x: 4.2, y: 10.8 }, { x: 1.8, y: 13.2 }, { x: 4.2, y: 13.2 }]
};

// Track geometry (52-step loop represented as 51 visible positions here) is correct,
// but color-to-lane mapping must match corner homes:
// red: top-left (left lane) • green: top-right (top lane) • yellow: bottom-right (right lane) • blue: bottom-left (bottom lane)
//
// NOTE: These arrays are lane-geometry, not “color truth”. Final mapping is done in COLOR_TRACKS below.
// BOTTOM lane start (previously used as RED)
const RED_TRACK: { x: number; y: number }[] = [
  // Position 1-5: Going up from red start
  { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Position 6-11: Left along top of blue zone
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Position 12: Corner
  { x: 0.5, y: 7.5 },
  // Position 13-18: Up along left edge (green entry)
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Position 19-24: Up through red zone top
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Position 25: Top corner
  { x: 7.5, y: 0.5 },
  // Position 26-31: Down right side of top (yellow entry)
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Position 32-37: Right along green zone bottom
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Position 38: Right corner
  { x: 14.5, y: 7.5 },
  // Position 39-44: Down right edge (blue entry)
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Position 45-50: Down through yellow zone
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Position 51: Bottom corner (before red entry to home)
  { x: 7.5, y: 14.5 },
];

// LEFT lane start (previously used as GREEN)
const GREEN_TRACK: { x: number; y: number }[] = [
  // Position 1-5: Going right from green start
  { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Position 6-11: Up through red zone
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Position 12: Top-left corner
  { x: 7.5, y: 0.5 },
  // Position 13-18: Down right side (yellow entry)
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Position 19-24: Right along green zone bottom
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Position 25: Right corner
  { x: 14.5, y: 7.5 },
  // Position 26-31: Down right edge (blue entry)
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Position 32-37: Down through yellow zone
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Position 38: Bottom corner
  { x: 7.5, y: 14.5 },
  // Position 39-44: Left along red zone (red entry)
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Position 45-50: Left along blue zone top
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Position 51: Left corner (before green entry to home)
  { x: 0.5, y: 7.5 },
];

// TOP lane start (previously used as YELLOW)
const YELLOW_TRACK: { x: number; y: number }[] = [
  // Position 1-5: Going down from yellow start
  { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Position 6-11: Right along green zone bottom
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Position 12: Right corner
  { x: 14.5, y: 7.5 },
  // Position 13-18: Down right edge (blue entry)
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Position 19-24: Down through yellow zone
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Position 25: Bottom corner
  { x: 7.5, y: 14.5 },
  // Position 26-31: Left and up through red zone (red entry)
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Position 32-37: Left along blue zone top
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Position 38: Left corner
  { x: 0.5, y: 7.5 },
  // Position 39-44: Up along left edge (green entry)
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Position 45-50: Up through red zone top
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Position 51: Top corner (before yellow entry to home)
  { x: 7.5, y: 0.5 },
];

// RIGHT lane start (previously used as BLUE)
const BLUE_TRACK: { x: number; y: number }[] = [
  // Position 1-5: Going left from blue start
  { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Position 6-11: Down through yellow zone
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Position 12: Bottom corner
  { x: 7.5, y: 14.5 },
  // Position 13-18: Left and up through red zone (red entry)
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Position 19-24: Left along blue zone top
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Position 25: Left corner
  { x: 0.5, y: 7.5 },
  // Position 26-31: Up along left edge (green entry)
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Position 32-37: Up through red zone top
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Position 38: Top corner
  { x: 7.5, y: 0.5 },
  // Position 39-44: Down right side (yellow entry)
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Position 45-50: Right along green zone bottom
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Position 51: Right corner (before blue entry to home)
  { x: 14.5, y: 7.5 },
];

// Color-specific track mapping (aligned with corner homes)
// red (top-left) should start from LEFT lane
// green (top-right) should start from TOP lane
// yellow (bottom-right) should start from RIGHT lane
// blue (bottom-left) should start from BOTTOM lane
const COLOR_TRACKS: { [color: string]: { x: number; y: number }[] } = {
  red: GREEN_TRACK,
  green: YELLOW_TRACK,
  yellow: BLUE_TRACK,
  blue: RED_TRACK,
};

// Home stretch paths for each color (positions 52-57 lead to center)
// Lanes (geometry): TOP, RIGHT, BOTTOM, LEFT — then mapped to corner colors.
const HOME_PATHS: { [color: string]: { x: number; y: number }[] } = {
  // red corner (top-left) uses LEFT lane
  red: [
    { x: 1.5, y: 7.5 }, { x: 2.5, y: 7.5 }, { x: 3.5, y: 7.5 }, { x: 4.5, y: 7.5 }, { x: 5.5, y: 7.5 }, { x: 6.5, y: 7.5 }
  ],
  // green corner (top-right) uses TOP lane
  green: [
    { x: 7.5, y: 1.5 }, { x: 7.5, y: 2.5 }, { x: 7.5, y: 3.5 }, { x: 7.5, y: 4.5 }, { x: 7.5, y: 5.5 }, { x: 7.5, y: 6.5 }
  ],
  // yellow corner (bottom-right) uses RIGHT lane
  yellow: [
    { x: 13.5, y: 7.5 }, { x: 12.5, y: 7.5 }, { x: 11.5, y: 7.5 }, { x: 10.5, y: 7.5 }, { x: 9.5, y: 7.5 }, { x: 8.5, y: 7.5 }
  ],
  // blue corner (bottom-left) uses BOTTOM lane
  blue: [
    { x: 7.5, y: 13.5 }, { x: 7.5, y: 12.5 }, { x: 7.5, y: 11.5 }, { x: 7.5, y: 10.5 }, { x: 7.5, y: 9.5 }, { x: 7.5, y: 8.5 }
  ],
};

// Teardrop/Pin Token SVG Component
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
    <svg width={size} height={size * 1.4} viewBox="0 0 24 34" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="50%" stopColor={colors.main} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.4"/>
        </filter>
        {isActive && (
          <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        )}
      </defs>
      
      {/* Pin/Teardrop shape */}
      <g filter={isActive ? `url(#${id}-glow)` : `url(#${id}-shadow)`}>
        {/* Main pin body */}
        <path
          d="M12 2 C6 2 2 7 2 12 C2 18 12 32 12 32 C12 32 22 18 22 12 C22 7 18 2 12 2 Z"
          fill={`url(#${id}-grad)`}
          stroke={isSelected ? '#fff' : colors.dark}
          strokeWidth={isSelected ? 2 : 1}
        />
        
        {/* Inner circle (white) */}
        <circle
          cx="12"
          cy="12"
          r="7"
          fill="#fff"
          stroke={colors.main}
          strokeWidth="0.5"
        />
        
        {/* Inner color circle */}
        <circle
          cx="12"
          cy="12"
          r="5"
          fill={colors.main}
        />
        
        {/* Shine effect */}
        <ellipse
          cx="9"
          cy="9"
          rx="2.5"
          ry="2"
          fill="rgba(255,255,255,0.6)"
        />
      </g>
    </svg>
  );
};

// Player Label Component - Premium Design
const PlayerLabel = ({ 
  player, 
  position 
}: { 
  player: Player; 
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) => {
  const colorKey = player.color as keyof typeof COLORS;
  const colors = COLORS[colorKey];
  const displayName = player.uid ? `#${player.uid}` : (player.name || 'Player');
  
  const positionClasses = {
    'top-left': 'top-1 left-1',
    'top-right': 'top-1 right-1',
    'bottom-left': 'bottom-1 left-1',
    'bottom-right': 'bottom-1 right-1',
  };

  return (
    <motion.div
      className={cn(
        'absolute flex items-center gap-1.5 px-2 py-1 rounded-lg backdrop-blur-md',
        'text-[11px] font-bold text-white shadow-lg z-30',
        positionClasses[position]
      )}
      style={{ 
        background: `linear-gradient(135deg, ${colors.main}ee 0%, ${colors.dark}dd 100%)`,
        border: player.isCurrentTurn ? '2px solid #fff' : `1.5px solid ${colors.light}60`,
        boxShadow: player.isCurrentTurn 
          ? `0 0 20px ${colors.main}80, 0 4px 15px rgba(0,0,0,0.3)` 
          : '0 4px 12px rgba(0,0,0,0.25)',
      }}
      animate={{
        scale: player.isCurrentTurn ? 1.08 : 1,
      }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
    >
      {/* Player icon with glow */}
      <div className="relative">
        {player.isBot ? (
          <Bot className="w-3.5 h-3.5" />
        ) : (
          <User className="w-3.5 h-3.5" />
        )}
        {player.isCurrentTurn && (
          <motion.div
            className="absolute -inset-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      
      <span className="truncate max-w-[55px]">{displayName}</span>
      
      {/* Current turn indicator */}
      {player.isCurrentTurn && (
        <motion.div
          className="flex items-center gap-0.5"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Crown className="w-3 h-3 text-yellow-300" />
        </motion.div>
      )}
    </motion.div>
  );
};

// Color to corner position mapping
const COLOR_POSITIONS: Record<string, 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = {
  red: 'top-left',
  green: 'top-right',
  yellow: 'bottom-right',
  blue: 'bottom-left',
};

const LudoBoard = ({ players, onTokenClick, selectedToken, captureEvent, onCaptureAnimationComplete, diceValue = 1 }: LudoBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  // Use viewport-based sizing for mobile optimization - take maximum available space
  const [size, setSize] = useState(Math.min(window.innerWidth - 16, window.innerHeight - 200, 420));
  const [capturePosition, setCapturePosition] = useState<{ x: number; y: number } | null>(null);
  const [previewToken, setPreviewToken] = useState<{ color: string; tokenId: number; position: number } | null>(null);
  
  useEffect(() => {
    const handleResize = () => {
      // Calculate optimal board size based on viewport
      const maxWidth = window.innerWidth - 16;
      const maxHeight = window.innerHeight - 200; // Leave space for header and dice
      setSize(Math.min(maxWidth, maxHeight, 420));
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const cellSize = size / 15;
  
  // Calculate capture animation position when capture event occurs
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
  
  // Find current turn player
  const currentTurnPlayer = players.find(p => p.isCurrentTurn);

  const getTokenPosition = (token: Token, color: string): { x: number; y: number } => {
    // Token at home base (position 0)
    if (token.position === 0) {
      const homePos = HOME_POSITIONS[color][token.id];
      return { x: homePos.x * cellSize, y: homePos.y * cellSize };
    }
    
    // Token in home stretch (position 52-57)
    if (token.position >= 52) {
      const homePathIndex = token.position - 52;
      if (homePathIndex < HOME_PATHS[color].length) {
        const pos = HOME_PATHS[color][homePathIndex];
        return { x: pos.x * cellSize, y: pos.y * cellSize };
      }
      // At center/home
      return { x: 7.5 * cellSize, y: 7.5 * cellSize };
    }
    
    // Token on main track (position 1-51)
    // Each color has its own track array
    const colorTrack = COLOR_TRACKS[color];
    const trackIndex = token.position - 1; // Convert to 0-indexed
    
    if (colorTrack && trackIndex >= 0 && trackIndex < colorTrack.length) {
      const pos = colorTrack[trackIndex];
      return { x: pos.x * cellSize, y: pos.y * cellSize };
    }
    
    // Fallback to center
    return { x: 7.5 * cellSize, y: 7.5 * cellSize };
  };

  // Calculate path cells for preview
  const getPathPreviewCells = (color: string, currentPos: number, dice: number): { x: number; y: number }[] => {
    const cells: { x: number; y: number }[] = [];
    const colorTrack = COLOR_TRACKS[color];
    const homePath = HOME_PATHS[color];
    
    if (!colorTrack) return cells;
    
    // Token at home, needs 6 to exit
    if (currentPos === 0) {
      if (dice === 6) {
        // Show entry position
        cells.push(colorTrack[0]);
      }
      return cells;
    }
    
    // Calculate path from current position
    let pos = currentPos;
    for (let i = 0; i < dice; i++) {
      pos++;
      
      if (pos <= 51) {
        // On main track
        cells.push(colorTrack[pos - 1]);
      } else if (pos >= 52 && pos <= 57) {
        // In home stretch
        const homeIndex = pos - 52;
        if (homeIndex < homePath.length) {
          cells.push(homePath[homeIndex]);
        }
      } else if (pos > 57) {
        // Would go past home - invalid move
        return [];
      }
    }
    
    return cells;
  };

  // Check if token can move
  const canTokenMove = (position: number, dice: number): boolean => {
    if (position === 0) return dice === 6;
    if (position > 0 && position + dice <= 57) return true;
    return false;
  };

  // Safe spots where tokens cannot be captured
  const SAFE_SPOTS = [1, 9, 14, 22, 27, 35, 40, 48]; // Star positions on the board

  // Check if a position has an opponent token that can be captured
  const getOpponentAtPosition = (movingColor: string, targetPosition: number): { color: string; tokenId: number } | null => {
    if (targetPosition <= 0 || targetPosition >= 52) return null; // Can't capture in home stretch or at home
    if (SAFE_SPOTS.includes(targetPosition)) return null; // Safe spots
    
    // Get the board coordinate for the target position
    const movingTrack = COLOR_TRACKS[movingColor];
    if (!movingTrack || targetPosition < 1 || targetPosition > 51) return null;
    const targetCoord = movingTrack[targetPosition - 1];
    
    // Check all other players' tokens
    for (const player of players) {
      if (player.color === movingColor) continue;
      
      for (const token of player.tokens) {
        if (token.position <= 0 || token.position >= 52) continue;
        
        const opponentTrack = COLOR_TRACKS[player.color];
        if (!opponentTrack || token.position < 1 || token.position > 51) continue;
        const opponentCoord = opponentTrack[token.position - 1];
        
        // Check if coordinates match (same cell on board)
        if (Math.abs(opponentCoord.x - targetCoord.x) < 0.1 && Math.abs(opponentCoord.y - targetCoord.y) < 0.1) {
          return { color: player.color, tokenId: token.id };
        }
      }
    }
    return null;
  };

  // Calculate final position after a move
  const getFinalPosition = (currentPos: number, dice: number): number => {
    if (currentPos === 0) return dice === 6 ? 1 : currentPos;
    return currentPos + dice;
  };

  // Get current turn player color for dynamic effects
  const currentTurnColor = useMemo(() => {
    const current = players.find(p => p.isCurrentTurn);
    return current ? (current.color as keyof typeof COLORS) : null;
  }, [players]);

  return (
    <div className="relative mx-auto">
      {/* Premium Board Frame with dynamic glow based on current player */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative p-2.5 rounded-2xl"
        style={{
          background: 'linear-gradient(145deg, #2a1810 0%, #1a0f0a 50%, #2a1810 100%)',
          boxShadow: currentTurnColor 
            ? `0 0 40px ${COLORS[currentTurnColor].main}25, 0 15px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`
            : '0 15px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Animated border glow for current player */}
        {currentTurnColor && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              border: `2px solid ${COLORS[currentTurnColor].main}`,
              opacity: 0.4,
            }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
              boxShadow: [
                `0 0 10px ${COLORS[currentTurnColor].main}40`,
                `0 0 25px ${COLORS[currentTurnColor].main}60`,
                `0 0 10px ${COLORS[currentTurnColor].main}40`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        
        {/* Premium corner accents with animation */}
        {['top-1 left-1 border-t-2 border-l-2 rounded-tl-lg', 
          'top-1 right-1 border-t-2 border-r-2 rounded-tr-lg',
          'bottom-1 left-1 border-b-2 border-l-2 rounded-bl-lg',
          'bottom-1 right-1 border-b-2 border-r-2 rounded-br-lg'].map((pos, i) => (
          <motion.div
            key={i}
            className={`absolute w-5 h-5 ${pos}`}
            style={{ 
              borderColor: currentTurnColor 
                ? COLORS[currentTurnColor].main 
                : 'rgba(202, 138, 4, 0.5)'
            }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
        
        {/* Inner glow effect - enhanced */}
        <div 
          className="absolute inset-2.5 rounded-xl pointer-events-none"
          style={{
            boxShadow: currentTurnColor
              ? `inset 0 0 40px ${COLORS[currentTurnColor].main}15, inset 0 0 20px rgba(212,165,116,0.1)`
              : 'inset 0 0 30px rgba(212,165,116,0.15)',
          }}
        />
        
        <div ref={boardRef} className="relative rounded-xl overflow-hidden" style={{ width: size, height: size }}>
          {/* Main Board SVG */}
          <svg viewBox="0 0 15 15" className="w-full h-full" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
            <defs>
              <linearGradient id="boardBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#faf5ed" />
                <stop offset="50%" stopColor="#f0e8da" />
                <stop offset="100%" stopColor="#e8dcc8" />
              </linearGradient>
              <linearGradient id="woodFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B7355" />
                <stop offset="50%" stopColor="#6B5344" />
                <stop offset="100%" stopColor="#8B7355" />
              </linearGradient>
              {/* Subtle pattern overlay */}
              <pattern id="boardPattern" patternUnits="userSpaceOnUse" width="1" height="1">
                <rect width="1" height="1" fill="rgba(0,0,0,0.02)" />
              </pattern>
            </defs>

            {/* Board background with subtle texture */}
            <rect x="0" y="0" width="15" height="15" fill="url(#boardBg)" />
            <rect x="0" y="0" width="15" height="15" fill="url(#boardPattern)" />
            
            {/* Board border - premium wood frame look */}
            <rect x="0" y="0" width="15" height="15" fill="none" stroke="url(#woodFrame)" strokeWidth="0.15" />

        {/* RED Home Base (top-left) */}
        <rect x="0" y="0" width="6" height="6" fill={COLORS.red.main} />
        <rect x="0.4" y="0.4" width="5.2" height="5.2" fill={COLORS.red.main} stroke={COLORS.red.dark} strokeWidth="0.08" />
        <rect x="0.8" y="0.8" width="4.4" height="4.4" fill="#fff" rx="0.2" />
        {/* Token spots */}
        <circle cx="1.8" cy="1.8" r="0.6" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.08" />
        <circle cx="4.2" cy="1.8" r="0.6" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.08" />
        <circle cx="1.8" cy="4.2" r="0.6" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.08" />
        <circle cx="4.2" cy="4.2" r="0.6" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.08" />

        {/* GREEN Home Base (top-right) */}
        <rect x="9" y="0" width="6" height="6" fill={COLORS.green.main} />
        <rect x="9.4" y="0.4" width="5.2" height="5.2" fill={COLORS.green.main} stroke={COLORS.green.dark} strokeWidth="0.08" />
        <rect x="9.8" y="0.8" width="4.4" height="4.4" fill="#fff" rx="0.2" />
        <circle cx="10.8" cy="1.8" r="0.6" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.08" />
        <circle cx="13.2" cy="1.8" r="0.6" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.08" />
        <circle cx="10.8" cy="4.2" r="0.6" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.08" />
        <circle cx="13.2" cy="4.2" r="0.6" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.08" />

        {/* YELLOW Home Base (bottom-right) */}
        <rect x="9" y="9" width="6" height="6" fill={COLORS.yellow.main} />
        <rect x="9.4" y="9.4" width="5.2" height="5.2" fill={COLORS.yellow.main} stroke={COLORS.yellow.dark} strokeWidth="0.08" />
        <rect x="9.8" y="9.8" width="4.4" height="4.4" fill="#fff" rx="0.2" />
        <circle cx="10.8" cy="10.8" r="0.6" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.08" />
        <circle cx="13.2" cy="10.8" r="0.6" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.08" />
        <circle cx="10.8" cy="13.2" r="0.6" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.08" />
        <circle cx="13.2" cy="13.2" r="0.6" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.08" />

        {/* BLUE Home Base (bottom-left) */}
        <rect x="0" y="9" width="6" height="6" fill={COLORS.blue.main} />
        <rect x="0.4" y="9.4" width="5.2" height="5.2" fill={COLORS.blue.main} stroke={COLORS.blue.dark} strokeWidth="0.08" />
        <rect x="0.8" y="9.8" width="4.4" height="4.4" fill="#fff" rx="0.2" />
        <circle cx="1.8" cy="10.8" r="0.6" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.08" />
        <circle cx="4.2" cy="10.8" r="0.6" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.08" />
        <circle cx="1.8" cy="13.2" r="0.6" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.08" />
        <circle cx="4.2" cy="13.2" r="0.6" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.08" />

        {/* Track Cells - White cells with grid */}
        <g fill="#fff" stroke="#ccc" strokeWidth="0.02">
          {/* Top vertical path */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <g key={`tv-${i}`}>
              <rect x={6} y={i} width="1" height="1" />
              <rect x={7} y={i} width="1" height="1" />
              <rect x={8} y={i} width="1" height="1" />
            </g>
          ))}
          {/* Bottom vertical path */}
          {[9, 10, 11, 12, 13, 14].map(i => (
            <g key={`bv-${i}`}>
              <rect x={6} y={i} width="1" height="1" />
              <rect x={7} y={i} width="1" height="1" />
              <rect x={8} y={i} width="1" height="1" />
            </g>
          ))}
          {/* Left horizontal path */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <g key={`lh-${i}`}>
              <rect x={i} y={6} width="1" height="1" />
              <rect x={i} y={7} width="1" height="1" />
              <rect x={i} y={8} width="1" height="1" />
            </g>
          ))}
          {/* Right horizontal path */}
          {[9, 10, 11, 12, 13, 14].map(i => (
            <g key={`rh-${i}`}>
              <rect x={i} y={6} width="1" height="1" />
              <rect x={i} y={7} width="1" height="1" />
              <rect x={i} y={8} width="1" height="1" />
            </g>
          ))}
        </g>

        {/* Colored Home Paths (aligned with corner homes) */}
        {/* TOP lane = green */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={`hp-top-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.green.main} stroke={COLORS.green.dark} strokeWidth="0.04" />
        ))}
        {/* LEFT lane = red */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={`hp-left-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.red.main} stroke={COLORS.red.dark} strokeWidth="0.04" />
        ))}
        {/* BOTTOM lane = blue */}
        {[9, 10, 11, 12, 13, 14].map(i => (
          <rect key={`hp-bottom-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.blue.main} stroke={COLORS.blue.dark} strokeWidth="0.04" />
        ))}
        {/* RIGHT lane = yellow */}
        {[9, 10, 11, 12, 13, 14].map(i => (
          <rect key={`hp-right-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.yellow.main} stroke={COLORS.yellow.dark} strokeWidth="0.04" />
        ))}

        {/* Safe spots / Stars on track */}
        <g fontSize="0.4" textAnchor="middle" dominantBaseline="central" fill="#999">
          {/* Arrow indicators for entry points */}
          <text x="6.5" y="12.5">↓</text>
          <text x="2.5" y="6.5">→</text>
          <text x="8.5" y="2.5">↑</text>
          <text x="12.5" y="8.5">←</text>
        </g>

        {/* Starting stars (colored) - aligned with corner homes */}
        <g fontSize="0.5" textAnchor="middle" dominantBaseline="central">
          {/* bottom start */}
          <text x="6.5" y="13.5" fill={COLORS.blue.main}>★</text>
          {/* left start */}
          <text x="1.5" y="6.5" fill={COLORS.red.main}>★</text>
          {/* top start */}
          <text x="8.5" y="1.5" fill={COLORS.green.main}>★</text>
          {/* right start */}
          <text x="13.5" y="8.5" fill={COLORS.yellow.main}>★</text>
        </g>

        {/* Safe spots (gray stars) */}
        <g fontSize="0.4" textAnchor="middle" dominantBaseline="central" fill="#aaa">
          <text x="2.5" y="7.5">★</text>
          <text x="7.5" y="2.5">★</text>
          <text x="12.5" y="7.5">★</text>
          <text x="7.5" y="12.5">★</text>
        </g>

        {/* Center Home Triangle (aligned with lanes) */}
        {/* left */}
        <polygon points="6,6 7.5,7.5 6,9" fill={COLORS.red.main} stroke="#fff" strokeWidth="0.04" />
        {/* top */}
        <polygon points="6,6 7.5,7.5 9,6" fill={COLORS.green.main} stroke="#fff" strokeWidth="0.04" />
        {/* right */}
        <polygon points="9,6 7.5,7.5 9,9" fill={COLORS.yellow.main} stroke="#fff" strokeWidth="0.04" />
        {/* bottom */}
        <polygon points="6,9 7.5,7.5 9,9" fill={COLORS.blue.main} stroke="#fff" strokeWidth="0.04" />

        {/* Center circle */}
        <circle cx="7.5" cy="7.5" r="0.4" fill="#fff" stroke="#d4a574" strokeWidth="0.06" />
      </svg>

      {/* Path Preview Highlights */}
      {previewToken && (
        <div className="absolute inset-0 pointer-events-none z-5">
          {/* Special arrow from home to entry for tokens at home base */}
          {previewToken.position === 0 && diceValue === 6 && (() => {
            const colorKey = previewToken.color as keyof typeof COLORS;
            const homePos = HOME_POSITIONS[previewToken.color][0]; // Use first home slot as reference
            const entryCell = COLOR_TRACKS[previewToken.color]?.[0];
            if (!entryCell) return null;
            
            const homeCenter = {
              x: (HOME_POSITIONS[previewToken.color][0].x + HOME_POSITIONS[previewToken.color][3].x) / 2,
              y: (HOME_POSITIONS[previewToken.color][0].y + HOME_POSITIONS[previewToken.color][3].y) / 2,
            };
            
            return (
              <motion.div
                key="home-arrow"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: 1, pathLength: 1 }}
                className="absolute"
                style={{
                  left: 0,
                  top: 0,
                  width: size,
                  height: size,
                }}
              >
                <svg width={size} height={size} className="absolute inset-0">
                  <defs>
                    <marker
                      id={`arrow-${previewToken.color}`}
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="4"
                      orient="auto"
                    >
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
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>
            );
          })()}
          
          {getPathPreviewCells(previewToken.color, previewToken.position, diceValue).map((cell, index, arr) => {
            const isLast = index === arr.length - 1;
            const colorKey = previewToken.color as keyof typeof COLORS;
            const isHomeExit = previewToken.position === 0 && diceValue === 6;
            
            // Check for capture opportunity on final cell
            const finalPos = getFinalPosition(previewToken.position, diceValue);
            const captureTarget = isLast ? getOpponentAtPosition(previewToken.color, finalPos) : null;
            const isCapture = isLast && captureTarget !== null;
            
            return (
              <motion.div
                key={`preview-${index}`}
                className="absolute rounded-sm"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: 1, 
                  scale: isCapture ? [1, 1.15, 1] : isHomeExit ? [1, 1.1, 1] : 1,
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ 
                  delay: index * 0.05, 
                  duration: 0.15,
                  scale: isCapture ? { duration: 0.5, repeat: Infinity } : isHomeExit ? { duration: 0.8, repeat: Infinity } : undefined
                }}
                style={{
                  left: cell.x * cellSize - cellSize * 0.4,
                  top: cell.y * cellSize - cellSize * 0.4,
                  width: cellSize * 0.8,
                  height: cellSize * 0.8,
                  backgroundColor: isCapture
                    ? '#DC2626'
                    : isHomeExit 
                      ? `${COLORS[colorKey].main}` 
                      : isLast 
                        ? `${COLORS[colorKey].main}90` 
                        : `${COLORS[colorKey].light}60`,
                  border: isCapture
                    ? '3px solid #991B1B'
                    : isHomeExit
                      ? `3px solid ${COLORS[colorKey].dark}`
                      : isLast 
                        ? `2px solid ${COLORS[colorKey].dark}` 
                        : `1px dashed ${COLORS[colorKey].main}80`,
                  boxShadow: isCapture
                    ? '0 0 15px #DC2626, 0 0 25px #EF444480'
                    : isHomeExit
                      ? `0 0 15px ${COLORS[colorKey].main}, 0 0 25px ${COLORS[colorKey].light}80`
                      : isLast 
                        ? `0 0 8px ${COLORS[colorKey].main}80` 
                        : 'none',
                }}
              >
                {/* Step number, START label, or capture indicator */}
                <span 
                  className="absolute inset-0 flex items-center justify-center text-white font-bold"
                  style={{ 
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    fontSize: isCapture ? cellSize * 0.35 : isHomeExit ? cellSize * 0.22 : cellSize * 0.3,
                  }}
                >
                  {isCapture ? '💀' : isHomeExit ? 'START' : isLast ? '●' : index + 1}
                </span>
                
                {/* Capture warning badge */}
                {isCapture && captureTarget && (
                  <motion.div
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-white font-bold shadow-lg"
                    style={{
                      fontSize: cellSize * 0.18,
                      background: `linear-gradient(135deg, ${COLORS[captureTarget.color as keyof typeof COLORS].main} 0%, ${COLORS[captureTarget.color as keyof typeof COLORS].dark} 100%)`,
                      border: '2px solid white',
                    }}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
                  >
                    CAPTURE!
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Player Labels at corners */}
      {players.map((player) => {
        const position = COLOR_POSITIONS[player.color];
        if (!position) return null;
        return (
          <PlayerLabel 
            key={`label-${player.color}`} 
            player={player} 
            position={position} 
          />
        );
      })}

      {/* All Possible Moves Destination Indicators */}
      {players.map((player) => {
        if (!player.isCurrentTurn) return null;
        return player.tokens.map((token) => {
          const canMove = canTokenMove(token.position, diceValue);
          if (!canMove || previewToken) return null; // Don't show when hovering on a specific token
          
          // Calculate destination
          const pathCells = getPathPreviewCells(player.color, token.position, diceValue);
          const finalCell = pathCells[pathCells.length - 1];
          if (!finalCell) return null;
          
          const finalPos = getFinalPosition(token.position, diceValue);
          const captureTarget = getOpponentAtPosition(player.color, finalPos);
          const isCapture = captureTarget !== null;
          const colorKey = player.color as keyof typeof COLORS;
          
          return (
            <motion.div
              key={`dest-${player.color}-${token.id}`}
              className="absolute pointer-events-none"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 0.8, 
                scale: [0.9, 1.1, 0.9],
              }}
              transition={{ 
                opacity: { duration: 0.3 },
                scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
              }}
              style={{
                left: finalCell.x * cellSize - cellSize * 0.25,
                top: finalCell.y * cellSize - cellSize * 0.25,
                width: cellSize * 0.5,
                height: cellSize * 0.5,
                borderRadius: '50%',
                backgroundColor: isCapture ? '#DC262680' : `${COLORS[colorKey].main}50`,
                border: isCapture ? '2px solid #DC2626' : `2px dashed ${COLORS[colorKey].main}`,
                boxShadow: isCapture 
                  ? '0 0 10px #DC2626' 
                  : `0 0 8px ${COLORS[colorKey].main}60`,
              }}
            >
              {isCapture && (
                <span className="absolute inset-0 flex items-center justify-center text-xs">💀</span>
              )}
            </motion.div>
          );
        });
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
              style={{
                width: cellSize * 0.85,
                height: cellSize * 1.2,
              }}
              initial={false}
              animate={{
                left: pos.x - (cellSize * 0.42),
                top: pos.y - (cellSize * 0.7),
                scale: isSelected ? 1.35 : canMove ? 1.15 : player.isCurrentTurn ? 1.05 : 1,
                rotate: isSelected ? [0, -3, 3, 0] : 0,
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 350, 
                damping: 22,
                rotate: isSelected ? { duration: 0.3, repeat: Infinity, repeatType: 'reverse' } : undefined,
              }}
              whileHover={onTokenClick && player.isCurrentTurn ? { scale: 1.2, y: -3 } : {}}
              whileTap={onTokenClick && player.isCurrentTurn ? { scale: 0.92 } : {}}
              onClick={() => onTokenClick?.(player.color, token.id)}
              onMouseEnter={() => {
                if (canMove) {
                  setPreviewToken({ color: player.color, tokenId: token.id, position: token.position });
                }
              }}
              onMouseLeave={() => setPreviewToken(null)}
              onTouchStart={() => {
                if (canMove) {
                  setPreviewToken({ color: player.color, tokenId: token.id, position: token.position });
                }
              }}
              onTouchEnd={() => setPreviewToken(null)}
              disabled={!player.isCurrentTurn || !onTokenClick}
            >
              {/* Token shadow for depth */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: cellSize * 0.5,
                  height: cellSize * 0.2,
                  bottom: -cellSize * 0.05,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)',
                }}
                animate={{
                  scale: isSelected ? 1.3 : canMove ? 1.1 : 1,
                  opacity: isSelected ? 0.6 : 0.4,
                }}
              />
              
              <PinToken 
                color={colorKey} 
                isActive={player.isCurrentTurn} 
                isSelected={isSelected}
                size={cellSize * 0.75}
              />
              
              {/* Movable token indicator - enhanced glowing ring */}
              {canMove && !isSelected && (
                <>
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: cellSize * 0.85,
                      height: cellSize * 0.85,
                      top: cellSize * 0.12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      border: `3px solid ${COLORS[colorKey].main}`,
                      boxShadow: `0 0 15px ${COLORS[colorKey].main}, 0 0 30px ${COLORS[colorKey].light}60`,
                    }}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.8, 0.4, 0.8],
                    }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Outer pulse ring */}
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: cellSize * 0.9,
                      height: cellSize * 0.9,
                      top: cellSize * 0.1,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      border: `2px solid ${COLORS[colorKey].light}`,
                    }}
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  />
                </>
              )}
              
              {/* Premium "TAP" hint badge for movable tokens */}
              {canMove && !isSelected && !isHoveredToken && (
                <motion.div
                  className="absolute px-2 py-0.5 rounded-full text-white font-black shadow-lg pointer-events-none"
                  style={{
                    fontSize: cellSize * 0.16,
                    background: `linear-gradient(135deg, ${COLORS[colorKey].light} 0%, ${COLORS[colorKey].main} 50%, ${COLORS[colorKey].dark} 100%)`,
                    border: '1.5px solid white',
                    top: cellSize * -0.1,
                    right: cellSize * -0.2,
                    boxShadow: `0 2px 8px ${COLORS[colorKey].main}80`,
                  }}
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: [1, 1.1, 1], rotate: 0 }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                >
                  TAP
                </motion.div>
              )}
              
              {/* Pulse effect for current turn */}
              {player.isCurrentTurn && (
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{ 
                    width: cellSize * 0.8,
                    height: cellSize * 0.8,
                    top: cellSize * 0.15,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: `radial-gradient(circle, ${COLORS[colorKey].light}40 0%, transparent 70%)` 
                  }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
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

      {/* Current Turn Indicator - Premium Bottom Bar */}
      <AnimatePresence mode="wait">
        {currentTurnPlayer && (
          <motion.div
            key={currentTurnPlayer.color}
            initial={{ opacity: 0, y: 25, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mt-4 mx-auto relative overflow-hidden"
            style={{ maxWidth: 'fit-content' }}
          >
            {/* Glowing background */}
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{ 
                background: `linear-gradient(135deg, ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}30 0%, ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].dark}15 100%)`,
              }}
              animate={{
                boxShadow: [
                  `0 0 20px ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}20`,
                  `0 0 35px ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}40`,
                  `0 0 20px ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}20`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 -translate-x-full"
              animate={{ translateX: ['100%', '-100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
            >
              <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
            </motion.div>
            
            <div 
              className="relative flex items-center justify-center gap-3 px-5 py-2.5 rounded-xl"
              style={{ 
                border: `2px solid ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}50`,
              }}
            >
              {/* Animated icon */}
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                transition={{ 
                  rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 1.5, repeat: Infinity }
                }}
              >
                {currentTurnPlayer.isBot ? (
                  <Zap className="w-4 h-4" style={{ color: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main }} />
                ) : (
                  <Sparkles className="w-4 h-4" style={{ color: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main }} />
                )}
              </motion.div>
              
              {/* Mini token indicator with glow */}
              <div className="relative">
                <motion.div
                  className="absolute -inset-1 rounded-full"
                  style={{ background: `radial-gradient(circle, ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}40 0%, transparent 70%)` }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <PinToken 
                  color={currentTurnPlayer.color as keyof typeof COLORS} 
                  isActive 
                  isSelected={false}
                  size={20}
                />
              </div>
              
              {/* Player info - enhanced */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background/60 backdrop-blur-sm border border-white/10">
                  {currentTurnPlayer.isBot ? (
                    <Bot className="w-3.5 h-3.5" style={{ color: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main }} />
                  ) : (
                    <Crown className="w-3.5 h-3.5" style={{ color: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main }} />
                  )}
                  <span className="font-bold text-sm" style={{ color: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main }}>
                    {currentTurnPlayer.name || (currentTurnPlayer.isBot ? 'Computer' : 'Your Turn')}
                  </span>
                </div>
              </div>
              
              {/* Animated dots indicator */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main,
                      boxShadow: `0 0 6px ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}`,
                    }}
                    animate={{ 
                      scale: [1, 1.4, 1],
                      opacity: [0.4, 1, 0.4],
                      y: [0, -3, 0],
                    }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LudoBoard;
