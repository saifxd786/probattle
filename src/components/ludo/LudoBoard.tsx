import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import CaptureAnimation from './CaptureAnimation';
import SyncIndicator from './SyncIndicator';

// Color-specific avatars
import redAvatar from '@/assets/ludo-avatar-red.png';
import blueAvatar from '@/assets/ludo-avatar-blue.png';
import greenAvatar from '@/assets/ludo-avatar-green.png';
import yellowAvatar from '@/assets/ludo-avatar-yellow.png';

// Map of color to default avatar
const COLOR_AVATARS: { [key: string]: string } = {
  red: redAvatar,
  blue: blueAvatar,
  green: greenAvatar,
  yellow: yellowAvatar,
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
  turnTimeLeft?: number; // seconds remaining (15s max)
  onTurnTimeout?: () => void;
  offlineTimeLeft?: number; // seconds remaining for offline player (60s max)
  // Micro-latency UX enhancements
  opponentPulseScale?: number; // 1.0 = no pulse, 1.03 = subtle pulse
  showSyncIndicator?: boolean;
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

// Home positions for each color - aligned with circle centers
const HOME_POSITIONS: { [color: string]: { x: number; y: number }[] } = {
  red: [{ x: 1.5, y: 1.5 }, { x: 4.5, y: 1.5 }, { x: 1.5, y: 4.5 }, { x: 4.5, y: 4.5 }],
  green: [{ x: 10.5, y: 1.5 }, { x: 13.5, y: 1.5 }, { x: 10.5, y: 4.5 }, { x: 13.5, y: 4.5 }],
  yellow: [{ x: 10.5, y: 10.5 }, { x: 13.5, y: 10.5 }, { x: 10.5, y: 13.5 }, { x: 13.5, y: 13.5 }],
  blue: [{ x: 1.5, y: 10.5 }, { x: 4.5, y: 10.5 }, { x: 1.5, y: 13.5 }, { x: 4.5, y: 13.5 }]
};

// Track paths
// Track coordinates - MUST match useLudoGame.ts exactly!
// Each track has 52 positions (1-52 main track), tokens enter at position 1
// CRITICAL: Include corner cells properly - each segment must connect visually

// LEFT_TRACK: Starts from LEFT side (1.5, 6.5) going right - RED uses this
const LEFT_TRACK: { x: number; y: number }[] = [
  // Row 6 going right (5 cells: 1-5)
  { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Turn corner at (6.5, 6.5), then go UP (6 cells: 6-11)
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Corner at top (1 cell: 12)
  { x: 7.5, y: 0.5 },
  // Go DOWN on right side of top (6 cells: 13-18)
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Row 6 going right (6 cells: 19-24)
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Corner at right (1 cell: 25)
  { x: 14.5, y: 7.5 },
  // Row 8 going left (6 cells: 26-31)
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Go DOWN (6 cells: 32-37)
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Corner at bottom (1 cell: 38)
  { x: 7.5, y: 14.5 },
  // Go UP on left side (6 cells: 39-44)
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Row 8 going left (6 cells: 45-50)
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Final corner before home path (1 cell: 51)
  { x: 0.5, y: 7.5 },
];

// TOP_TRACK: Starts from TOP (8.5, 1.5) going down - GREEN uses this
const TOP_TRACK: { x: number; y: number }[] = [
  // Column 8 going down (5 cells: 1-5)
  { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Row 6 going right (6 cells: 6-11)
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Corner at right (1 cell: 12)
  { x: 14.5, y: 7.5 },
  // Row 8 going left (6 cells: 13-18)
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Go DOWN (6 cells: 19-24)
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Corner at bottom (1 cell: 25)
  { x: 7.5, y: 14.5 },
  // Go UP on left side (6 cells: 26-31)
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Row 8 going left (6 cells: 32-37)
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Corner at left (1 cell: 38)
  { x: 0.5, y: 7.5 },
  // Row 6 going right (6 cells: 39-44)
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Go UP (6 cells: 45-50)
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Final corner before home path (1 cell: 51)
  { x: 7.5, y: 0.5 },
];

// RIGHT_TRACK: Starts from RIGHT side (13.5, 8.5) going left - YELLOW uses this
const RIGHT_TRACK: { x: number; y: number }[] = [
  // Row 8 going left (5 cells: 1-5)
  { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Go DOWN (6 cells: 6-11)
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Corner at bottom (1 cell: 12)
  { x: 7.5, y: 14.5 },
  // Go UP on left side (6 cells: 13-18)
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Row 8 going left (6 cells: 19-24)
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Corner at left (1 cell: 25)
  { x: 0.5, y: 7.5 },
  // Row 6 going right (6 cells: 26-31)
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Go UP (6 cells: 32-37)
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Corner at top (1 cell: 38)
  { x: 7.5, y: 0.5 },
  // Go DOWN on right side (6 cells: 39-44)
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Row 6 going right (6 cells: 45-50)
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Final corner before home path (1 cell: 51)
  { x: 14.5, y: 7.5 },
];

// BOTTOM_TRACK: Starts from BOTTOM (6.5, 13.5) going up - BLUE uses this
const BOTTOM_TRACK: { x: number; y: number }[] = [
  // Column 6 going up (5 cells: 1-5)
  { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Row 8 going left (6 cells: 6-11)
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Corner at left (1 cell: 12)
  { x: 0.5, y: 7.5 },
  // Row 6 going right (6 cells: 13-18)
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Go UP (6 cells: 19-24)
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Corner at top (1 cell: 25)
  { x: 7.5, y: 0.5 },
  // Go DOWN on right side (6 cells: 26-31)
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Row 6 going right (6 cells: 32-37)
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Corner at right (1 cell: 38)
  { x: 14.5, y: 7.5 },
  // Row 8 going left (6 cells: 39-44)
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Go DOWN (6 cells: 45-50)
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Final corner before home path (1 cell: 51)
  { x: 7.5, y: 14.5 },
];

// Map colors to their tracks - SYNCHRONIZED with useLudoGame.ts
const COLOR_TRACKS: { [color: string]: { x: number; y: number }[] } = {
  red: LEFT_TRACK,     // RED starts from LEFT (1.5, 6.5)
  green: TOP_TRACK,    // GREEN starts from TOP (8.5, 1.5)
  yellow: RIGHT_TRACK, // YELLOW starts from RIGHT (13.5, 8.5)
  blue: BOTTOM_TRACK,  // BLUE starts from BOTTOM (6.5, 13.5)
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

// Clean circular token that fits perfectly in cells
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
    <svg width={size} height={size} viewBox="0 0 30 30" className="drop-shadow-md">
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
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.4"/>
        </filter>
      </defs>
      
      <g filter={isSelected ? `url(#${id}-glow)` : `url(#${id}-shadow)`}>
        {/* Outer ring / base */}
        <circle cx="15" cy="15" r="13" fill={colors.dark} />
        
        {/* Main body gradient */}
        <circle cx="15" cy="15" r="11.5" fill={`url(#${id}-body)`} />
        
        {/* White inner circle */}
        <circle cx="15" cy="15" r="7" fill="#fff" />
        
        {/* Colored center dot */}
        <circle cx="15" cy="15" r="5" fill={colors.main} />
        
        {/* Highlight shine */}
        <ellipse cx="12" cy="12" rx="3" ry="2.5" fill="rgba(255,255,255,0.5)" />
        <ellipse cx="11" cy="11" rx="1.5" ry="1" fill="rgba(255,255,255,0.8)" />
        
        {/* Selection ring */}
        {isSelected && (
          <circle cx="15" cy="15" r="14" fill="none" stroke="#fff" strokeWidth="1.5" />
        )}
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
  // Use player name for display
  const displayName = player.name || 'Player';
  
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
              <img src={player.avatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-white text-xl font-bold"
                style={{ background: `linear-gradient(135deg, ${colors.light} 0%, ${colors.dark} 100%)` }}
              >
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        
        {/* Name Display */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-full px-1">
          <div 
            className="text-center py-1 rounded-md text-[10px] font-bold text-white truncate"
            style={{ 
              background: 'rgba(0,0,0,0.5)',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {displayName}
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

// Square Timer Avatar Component with animated border
const TimerAvatar = ({
  player,
  uid,
  isCurrentTurn,
  turnTimeLeft,
  offlineTimeLeft,
  presencePulseScale = 1, // MICRO-LATENCY: Opponent presence pulse
}: {
  player: Player | undefined;
  uid: string;
  isCurrentTurn: boolean;
  turnTimeLeft?: number;
  offlineTimeLeft?: number;
  presencePulseScale?: number;
}) => {
  const colors = COLORS[player?.color as keyof typeof COLORS];
  const avatarSrc = player?.avatar || COLOR_AVATARS[player?.color as keyof typeof COLOR_AVATARS] || redAvatar;
  
  // Calculate timer progress (15s for turn, 60s for offline)
  const maxTime = offlineTimeLeft !== undefined ? 60 : 15;
  const timeLeft = offlineTimeLeft ?? turnTimeLeft ?? maxTime;
  const progress = (timeLeft / maxTime) * 100;
  const isLowTime = timeLeft <= 5;
  const isOffline = offlineTimeLeft !== undefined && offlineTimeLeft < 60;
  
  // Square border path calculation
  const size = 48;
  const strokeWidth = 3;
  const innerSize = size - strokeWidth;
  const perimeter = innerSize * 4;
  const strokeDashoffset = perimeter - (progress / 100) * perimeter;
  
  return (
    <motion.div 
      className="relative" 
      style={{ width: size, height: size }}
      // MICRO-LATENCY: Subtle presence pulse for opponent (1.03x scale, 120ms)
      animate={{ scale: presencePulseScale }}
      transition={{ 
        duration: 0.12, 
        ease: [0.25, 0.9, 0.3, 1] // Fast-start ease-out
      }}
    >
      {/* SVG Square Timer Border */}
      <svg 
        className="absolute inset-0"
        width={size} 
        height={size}
        style={{ zIndex: 10 }}
      >
        {/* Background border */}
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={innerSize}
          height={innerSize}
          rx={8}
          ry={8}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={strokeWidth}
        />
        
        {/* Timer progress border - show when it's this player's turn OR when offline countdown is active */}
        {(isCurrentTurn || isOffline) && (
          <motion.rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={innerSize}
            height={innerSize}
            rx={8}
            ry={8}
            fill="none"
            stroke={isOffline ? '#EF4444' : isLowTime ? '#F59E0B' : colors?.main || '#1E88E5'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${perimeter} ${perimeter}`}
            initial={false}
            animate={{
              strokeDashoffset,
              opacity: isOffline || isLowTime ? [1, 0.55, 1] : 1,
            }}
            transition={{
              strokeDashoffset: { duration: 1, ease: 'linear', type: 'tween' },
              opacity: isOffline || isLowTime
                ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut', type: 'tween' }
                : { duration: 0.2, ease: 'linear', type: 'tween' },
            }}
            style={{
              filter: isOffline 
                ? 'drop-shadow(0 0 6px #EF4444)' 
                : isLowTime 
                  ? 'drop-shadow(0 0 6px #F59E0B)' 
                  : `drop-shadow(0 0 6px ${colors?.main})`,
              transformOrigin: 'center',
            }}
          />
        )}
      </svg>
      
      {/* Avatar container */}
      <div 
        className="absolute rounded-lg overflow-hidden"
        style={{
          top: strokeWidth,
          left: strokeWidth,
          width: size - (strokeWidth * 2),
          height: size - (strokeWidth * 2),
          background: colors?.main || '#1E88E5',
        }}
      >
        {/* Avatar image */}
        <img 
          src={avatarSrc} 
          alt={uid} 
          className="w-full h-full object-cover"
          style={{
            opacity: isOffline ? 0.5 : 1,
          }}
        />
        
        {/* Offline indicator */}
        {isOffline && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <span className="text-[7px] font-bold text-red-400 uppercase">Offline</span>
          </div>
        )}
        
        {/* Current turn glow pulse */}
        {isCurrentTurn && !isOffline && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow: `inset 0 0 12px ${colors?.main}60`,
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </div>
      
      {/* Timer text badge - show for turn timer OR offline countdown */}
      {(isCurrentTurn || isOffline) && (
        <motion.div 
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-bold shadow-lg"
          style={{
            background: isOffline ? '#EF4444' : isLowTime ? '#F59E0B' : colors?.main,
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
          animate={isOffline || isLowTime ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.4, repeat: Infinity }}
        >
          {timeLeft}s
        </motion.div>
      )}
      
      {/* "TURN" badge */}
      {isCurrentTurn && !isOffline && (
        <motion.div
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase"
          style={{
            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.5)',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1, y: [0, -2, 0] }}
          transition={{ 
            scale: { duration: 0.3 },
            y: { duration: 1.5, repeat: Infinity }
          }}
        >
          Turn
        </motion.div>
      )}
    </motion.div>
  );
};

// Compact Player Avatar for 4-player mode
const CompactPlayerAvatar = ({
  player,
  isCurrentTurn,
  turnTimeLeft,
  offlineTimeLeft,
  size = 40,
}: {
  player: Player | undefined;
  isCurrentTurn: boolean;
  turnTimeLeft?: number;
  offlineTimeLeft?: number;
  size?: number;
}) => {
  const colors = COLORS[player?.color as keyof typeof COLORS];
  const avatarSrc = player?.avatar || COLOR_AVATARS[player?.color as keyof typeof COLOR_AVATARS] || redAvatar;
  
  const maxTime = offlineTimeLeft !== undefined ? 60 : 15;
  const timeLeft = offlineTimeLeft ?? turnTimeLeft ?? maxTime;
  const isLowTime = timeLeft <= 5;
  const isOffline = offlineTimeLeft !== undefined && offlineTimeLeft < 60;
  const displayName = player?.name || player?.uid || 'Player';
  
  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size + 10 }}>
      {/* Avatar with border */}
      <div 
        className="relative rounded-lg overflow-hidden"
        style={{
          width: size,
          height: size,
          border: isCurrentTurn 
            ? `2px solid ${isLowTime ? '#EF4444' : colors?.main || '#1E88E5'}` 
            : '2px solid rgba(255,255,255,0.2)',
          boxShadow: isCurrentTurn ? `0 0 10px ${colors?.main}80` : 'none',
        }}
      >
        <img 
          src={avatarSrc} 
          alt={displayName} 
          className="w-full h-full object-cover"
          style={{ opacity: isOffline ? 0.5 : 1 }}
        />
        
        {/* Offline indicator */}
        {isOffline && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-[6px] font-bold text-red-400 uppercase">OFF</span>
          </div>
        )}
      </div>
      
      {/* Name - truncated */}
      <div 
        className="text-[9px] font-medium text-center truncate w-full"
        style={{ color: isCurrentTurn ? colors?.main : 'rgba(255,255,255,0.7)' }}
      >
        {displayName.length > 6 ? displayName.slice(0, 6) + '...' : displayName}
      </div>
      
      {/* Turn indicator with timer */}
      {isCurrentTurn && (
        <motion.div 
          className="px-1.5 py-0.5 rounded text-[8px] font-bold"
          style={{
            background: isLowTime ? '#EF4444' : colors?.main,
            color: '#fff',
          }}
          animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          {timeLeft}s
        </motion.div>
      )}
    </div>
  );
};

// Bottom info bar - supports 2, 3 or 4 players
const BottomInfoBar = ({ 
  players,
  turnTimeLeft,
  offlineTimeLeft,
}: { 
  players: Player[];
  turnTimeLeft?: number;
  offlineTimeLeft?: number;
}) => {
  const playerCount = players.length;

  if (playerCount === 4) {
    // 4 Player Layout - All 4 players in a row with compact avatars
    return (
      <div 
        className="flex items-center justify-between px-2 py-2 rounded-xl"
        style={{
          background: 'linear-gradient(180deg, rgba(20,20,30,0.95) 0%, rgba(10,10,20,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}
      >
        {players.map((player, index) => (
          <CompactPlayerAvatar
            key={player?.color || index}
            player={player}
            isCurrentTurn={player?.isCurrentTurn || false}
            turnTimeLeft={player?.isCurrentTurn ? turnTimeLeft : undefined}
            offlineTimeLeft={player?.isCurrentTurn ? offlineTimeLeft : undefined}
            size={36}
          />
        ))}
      </div>
    );
  }

  if (playerCount === 3) {
    // 3 Player Layout - Show all 3 players (fix: 1v1v1 looked like 1v1)
    return (
      <div 
        className="flex items-center justify-between px-2 py-2 rounded-xl"
        style={{
          background: 'linear-gradient(180deg, rgba(20,20,30,0.95) 0%, rgba(10,10,20,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}
      >
        {players.map((player, index) => (
          <CompactPlayerAvatar
            key={player?.color || index}
            player={player}
            isCurrentTurn={player?.isCurrentTurn || false}
            turnTimeLeft={player?.isCurrentTurn ? turnTimeLeft : undefined}
            offlineTimeLeft={player?.isCurrentTurn ? offlineTimeLeft : undefined}
            size={38}
          />
        ))}
      </div>
    );
  }
  
  // 2 Player Layout - Original design
  const leftPlayer = players[0];
  const rightPlayer = players[1];
  const leftUID = leftPlayer?.uid || generateUID();
  const rightUID = rightPlayer?.uid || generateUID();
  
  return (
    <div 
      className="flex items-center justify-between px-3 py-3 rounded-xl"
      style={{
        background: 'linear-gradient(180deg, rgba(20,20,30,0.95) 0%, rgba(10,10,20,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
      }}
    >
      {/* Left Player Info */}
      <div className="flex items-center gap-2.5">
        <TimerAvatar
          player={leftPlayer}
          uid={leftUID}
          isCurrentTurn={leftPlayer?.isCurrentTurn || false}
          turnTimeLeft={leftPlayer?.isCurrentTurn ? turnTimeLeft : undefined}
          offlineTimeLeft={leftPlayer?.isCurrentTurn ? offlineTimeLeft : undefined}
        />
        <div className="text-left pt-1">
          <div className="text-white font-bold text-sm">{leftPlayer?.name || leftUID}</div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-[10px]">💰</span>
            <span className="text-yellow-300 text-[10px] font-medium">{leftPlayer?.coins || 1250}</span>
          </div>
        </div>
      </div>

      {/* VS Badge */}
      <div 
        className="px-3 py-1 rounded-lg font-bold text-xs"
        style={{
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          color: '#1a1a2e',
        }}
      >
        VS
      </div>

      {/* Right Player Info */}
      <div className="flex items-center gap-2.5">
        <div className="text-right pt-1">
          <div className="text-white font-bold text-sm">{rightPlayer?.name || rightUID}</div>
          <div className="flex items-center justify-end gap-1">
            <span className="text-yellow-400 text-[10px]">💰</span>
            <span className="text-yellow-300 text-[10px] font-medium">{rightPlayer?.coins || 1250}</span>
          </div>
        </div>
        <TimerAvatar
          player={rightPlayer}
          uid={rightUID}
          isCurrentTurn={rightPlayer?.isCurrentTurn || false}
          turnTimeLeft={rightPlayer?.isCurrentTurn ? turnTimeLeft : undefined}
          offlineTimeLeft={rightPlayer?.isCurrentTurn ? offlineTimeLeft : undefined}
        />
      </div>
    </div>
  );
};

const LudoBoard = ({ players, onTokenClick, selectedToken, captureEvent, onCaptureAnimationComplete, diceValue = 1, turnTimeLeft = 15, onTurnTimeout, offlineTimeLeft, opponentPulseScale = 1, showSyncIndicator = false }: LudoBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  // Calculate size based on available viewport
  const [size, setSize] = useState(Math.min(window.innerWidth - 8, window.innerHeight - 120, 600));
  const [capturePosition, setCapturePosition] = useState<{ x: number; y: number } | null>(null);
  
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = window.innerWidth - 8;
      const maxHeight = window.innerHeight - 120;
      setSize(Math.min(maxWidth, maxHeight, 600));
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
    <div className="relative mx-auto flex flex-col overflow-hidden">
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

            {/* Center triangles (finish area) - Clean Ludo King style */}
            <polygon points="6,6 7.5,7.5 6,9" fill={COLORS.red.main} />
            <polygon points="6,6 7.5,7.5 9,6" fill={COLORS.green.main} />
            <polygon points="9,6 7.5,7.5 9,9" fill={COLORS.yellow.main} />
            <polygon points="6,9 7.5,7.5 9,9" fill={COLORS.blue.main} />

            {/* Safe spot stars - 4 safe positions */}
            {[
              { x: 6.5, y: 2.5 },
              { x: 2.5, y: 8.5 },
              { x: 8.5, y: 12.5 },
              { x: 12.5, y: 6.5 },
            ].map(({ x, y }, i) => (
              <g key={`star-${i}`} transform={`translate(${x}, ${y})`}>
                {/* 5-pointed star - white fill with dark gray stroke */}
                <polygon
                  points="0,-0.38 0.09,-0.12 0.36,-0.12 0.14,0.05 0.22,0.31 0,0.15 -0.22,0.31 -0.14,0.05 -0.36,-0.12 -0.09,-0.12"
                  fill="#FFFFFF"
                  stroke="#4a4a4a"
                  strokeWidth="0.05"
                  strokeLinejoin="round"
                />
              </g>
            ))}

            {/* Direction arrows - Enhanced */}
            <text x="7.5" y="0.7" textAnchor="middle" fontSize="0.5" fill={COLORS.green.dark} fontWeight="bold">↓</text>
            <text x="7.5" y="14.7" textAnchor="middle" fontSize="0.5" fill={COLORS.blue.dark} fontWeight="bold">↑</text>
            <text x="0.5" y="7.7" textAnchor="middle" fontSize="0.5" fill={COLORS.red.dark} fontWeight="bold">→</text>
            <text x="14.5" y="7.7" textAnchor="middle" fontSize="0.5" fill={COLORS.yellow.dark} fontWeight="bold">←</text>
          </svg>

          {/* TOKENS - Render with mini stacking for same cell like Ludo King */}
          {(() => {
            // Group all tokens by their cell position
            type TokenData = { player: typeof players[0]; token: Token; pos: { x: number; y: number }; posKey: string };
            const allTokens: TokenData[] = [];
            
            players.forEach(player => {
              player.tokens.forEach(token => {
                const pos = getTokenPosition(token, player.color);
                // Round to nearest cell to group tokens on same visual cell
                const posKey = `${Math.round(pos.x / cellSize * 10)}-${Math.round(pos.y / cellSize * 10)}`;
                allTokens.push({ player, token, pos, posKey });
              });
            });

            // Group tokens by position
            const tokensByPosition: { [key: string]: TokenData[] } = {};
            allTokens.forEach(t => {
              if (!tokensByPosition[t.posKey]) {
                tokensByPosition[t.posKey] = [];
              }
              tokensByPosition[t.posKey].push(t);
            });

            // Render tokens
            return Object.entries(tokensByPosition).flatMap(([posKey, tokensAtPos]) => {
              const isSingleToken = tokensAtPos.length === 1;
              const baseTokenSize = cellSize * 0.75;
              
              // If multiple tokens at same position, make them mini and stack
              const miniTokenSize = baseTokenSize * 0.55;
              
              // Stacking offsets for mini tokens (like Ludo King)
              const getStackOffset = (index: number, total: number) => {
                if (total === 2) {
                  return [
                    { x: -miniTokenSize * 0.35, y: -miniTokenSize * 0.2 },
                    { x: miniTokenSize * 0.35, y: miniTokenSize * 0.2 }
                  ][index];
                }
                if (total === 3) {
                  return [
                    { x: 0, y: -miniTokenSize * 0.4 },
                    { x: -miniTokenSize * 0.4, y: miniTokenSize * 0.25 },
                    { x: miniTokenSize * 0.4, y: miniTokenSize * 0.25 }
                  ][index];
                }
                if (total >= 4) {
                  return [
                    { x: -miniTokenSize * 0.35, y: -miniTokenSize * 0.35 },
                    { x: miniTokenSize * 0.35, y: -miniTokenSize * 0.35 },
                    { x: -miniTokenSize * 0.35, y: miniTokenSize * 0.35 },
                    { x: miniTokenSize * 0.35, y: miniTokenSize * 0.35 }
                  ][index % 4];
                }
                return { x: 0, y: 0 };
              };

              // Sort: current player's tokens last (on top)
              const sortedTokens = [...tokensAtPos].sort((a, b) => {
                if (a.player.isCurrentTurn && !b.player.isCurrentTurn) return 1;
                if (!a.player.isCurrentTurn && b.player.isCurrentTurn) return -1;
                return 0;
              });

              return sortedTokens.map((tokenData, stackIndex) => {
                const { player, token, pos } = tokenData;
                const isSelected = selectedToken?.color === player.color && selectedToken?.tokenId === token.id;
                const colorKey = player.color as keyof typeof COLORS;
                const canMove = player.isCurrentTurn && canTokenMove(token.position, diceValue);
                
                const tokenSize = isSingleToken ? baseTokenSize : miniTokenSize;
                const stackOffset = isSingleToken ? { x: 0, y: 0 } : getStackOffset(stackIndex, tokensAtPos.length);
                
                // Z-index: stacked tokens get higher z based on stack position
                const baseZ = player.isCurrentTurn ? 20 : 5;
                const stackZ = isSingleToken ? 0 : stackIndex * 2;
                const zIndex = isSelected ? 50 : canMove ? 40 : baseZ + stackZ;

                return (
                  <motion.button
                    key={`${player.color}-${token.id}`}
                    className={cn(
                      'absolute flex items-center justify-center',
                      player.isCurrentTurn && onTokenClick && 'cursor-pointer'
                    )}
                    style={{ 
                      width: tokenSize, 
                      height: tokenSize,
                      zIndex,
                    }}
                    initial={false}
                    animate={{
                      left: pos.x - (tokenSize / 2) + stackOffset.x,
                      top: pos.y - (tokenSize / 2) + stackOffset.y,
                      scale: isSelected ? 1.3 : canMove ? 1.1 : 1,
                    }}
                    // MICRO-LATENCY: Fast-start ease-out for snappy Ludo King feel
                    transition={{ 
                      type: 'spring', 
                      stiffness: 400, 
                      damping: 25,
                      // Use cubic-bezier equivalent spring parameters for fast start
                    }}
                    whileHover={onTokenClick && player.isCurrentTurn ? { scale: isSingleToken ? 1.15 : 1.3 } : {}}
                    whileTap={onTokenClick && player.isCurrentTurn ? { scale: 0.92 } : {}}
                    onClick={() => onTokenClick?.(player.color, token.id)}
                    disabled={!player.isCurrentTurn || !onTokenClick}
                  >
                    <LudoKingToken 
                      color={colorKey} 
                      isActive={player.isCurrentTurn} 
                      isSelected={isSelected} 
                      size={tokenSize} 
                    />
                    
                    {/* Movable indicator - pulsing ring */}
                    {canMove && !isSelected && (
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          border: `2px solid ${COLORS[colorKey].main}`,
                          boxShadow: `0 0 8px ${COLORS[colorKey].main}`,
                        }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.3, 0.8] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </motion.button>
                );
              });
            });
          })()}

          {/* Capture Animation */}
          <CaptureAnimation
            isActive={!!captureEvent && !!capturePosition}
            position={capturePosition || { x: 0, y: 0 }}
            capturedColor={captureEvent?.capturedColor || 'red'}
            onComplete={() => onCaptureAnimationComplete?.()}
          />
        </div>
        
        {/* MICRO-LATENCY: Sync indicator for network latency masking */}
        {showSyncIndicator && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50">
            <SyncIndicator />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LudoBoard;
