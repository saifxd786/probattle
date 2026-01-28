import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

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
  isBot?: boolean;
}

interface LudoBoardProps {
  players: Player[];
  onTokenClick?: (color: string, tokenId: number) => void;
  selectedToken?: { color: string; tokenId: number } | null;
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

// Player Label Component
const PlayerLabel = ({ 
  player, 
  position 
}: { 
  player: Player; 
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) => {
  const colorKey = player.color as keyof typeof COLORS;
  const colors = COLORS[colorKey];
  const isYou = !player.isBot && player.name?.toLowerCase() !== 'computer';
  const displayName = player.name || (isYou ? 'You' : `Computer`);
  
  const positionClasses = {
    'top-left': 'top-0 left-0 -translate-y-full',
    'top-right': 'top-0 right-0 -translate-y-full',
    'bottom-left': 'bottom-0 left-0 translate-y-full',
    'bottom-right': 'bottom-0 right-0 translate-y-full',
  };

  return (
    <motion.div
      className={cn(
        'absolute flex items-center gap-1 px-1.5 py-0.5 rounded-md',
        'text-[10px] font-bold text-white shadow-md',
        positionClasses[position]
      )}
      style={{ 
        backgroundColor: colors.main,
        border: `1.5px solid ${player.isCurrentTurn ? '#fff' : colors.dark}`,
      }}
      animate={{
        scale: player.isCurrentTurn ? 1.05 : 1,
        boxShadow: player.isCurrentTurn 
          ? `0 0 10px ${colors.main}80` 
          : '0 2px 4px rgba(0,0,0,0.2)'
      }}
      transition={{ duration: 0.3 }}
    >
      {player.isBot ? (
        <Bot className="w-2.5 h-2.5" />
      ) : (
        <User className="w-2.5 h-2.5" />
      )}
      <span className="truncate max-w-[50px]">{displayName}</span>
      {player.isCurrentTurn && (
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-white"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
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

const LudoBoard = ({ players, onTokenClick, selectedToken }: LudoBoardProps) => {
  // Use viewport-based sizing for mobile optimization - take maximum available space
  const [size, setSize] = useState(Math.min(window.innerWidth - 16, window.innerHeight - 200, 420));
  
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

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Main Board SVG */}
      <svg viewBox="0 0 15 15" className="w-full h-full" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))' }}>
        <defs>
          <linearGradient id="boardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f0e6" />
            <stop offset="100%" stopColor="#e8e0d0" />
          </linearGradient>
        </defs>

        {/* Board background */}
        <rect x="0" y="0" width="15" height="15" fill="url(#boardBg)" />
        
        {/* Board border */}
        <rect x="0" y="0" width="15" height="15" fill="none" stroke="#8B7355" strokeWidth="0.12" />

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

      {/* Pin Tokens */}
      {players.map((player) => (
        player.tokens.map((token) => {
          const pos = getTokenPosition(token, player.color);
          const isSelected = selectedToken?.color === player.color && selectedToken?.tokenId === token.id;
          const colorKey = player.color as keyof typeof COLORS;

          return (
            <motion.button
              key={`${player.color}-${token.id}`}
              className={cn(
                'absolute flex items-center justify-center',
                player.isCurrentTurn && onTokenClick && 'cursor-pointer z-10',
                isSelected && 'z-20'
              )}
              style={{
                width: cellSize * 0.85,
                height: cellSize * 1.2,
              }}
              initial={false}
              animate={{
                left: pos.x - (cellSize * 0.42),
                top: pos.y - (cellSize * 0.7),
                scale: isSelected ? 1.3 : player.isCurrentTurn ? 1.05 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              whileHover={onTokenClick && player.isCurrentTurn ? { scale: 1.15 } : {}}
              whileTap={onTokenClick && player.isCurrentTurn ? { scale: 0.95 } : {}}
              onClick={() => onTokenClick?.(player.color, token.id)}
              disabled={!player.isCurrentTurn || !onTokenClick}
            >
              <PinToken 
                color={colorKey} 
                isActive={player.isCurrentTurn} 
                isSelected={isSelected}
                size={cellSize * 0.75}
              />
              
              {/* Pulse effect for current turn */}
              {player.isCurrentTurn && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `radial-gradient(circle, ${COLORS[colorKey].light}40 0%, transparent 70%)` }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })
      ))}

      {/* Current Turn Indicator - Bottom Bar */}
      <AnimatePresence mode="wait">
        {currentTurnPlayer && (
          <motion.div
            key={currentTurnPlayer.color}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/95 backdrop-blur-sm border shadow-md"
            style={{ 
              borderColor: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main,
              boxShadow: `0 3px 12px ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}40`
            }}
          >
            {/* Mini token indicator */}
            <div className="relative">
              <PinToken 
                color={currentTurnPlayer.color as keyof typeof COLORS} 
                isActive 
                isSelected={false}
                size={14}
              />
            </div>
            
            {/* Player info */}
            <div className="flex items-center gap-1.5">
              {currentTurnPlayer.isBot ? (
                <Bot className="w-3 h-3 text-muted-foreground" />
              ) : (
                <User className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="font-bold text-xs" style={{ color: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main }}>
                {currentTurnPlayer.name || (currentTurnPlayer.isBot ? 'Computer' : 'You')}
              </span>
            </div>
            
            {/* Animated dots */}
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LudoBoard;
