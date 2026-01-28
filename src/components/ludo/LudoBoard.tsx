import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MapPin, Crown, Gift, MessageCircle } from 'lucide-react';
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

// Ludo King exact colors
const COLORS = {
  red: { main: '#E53935', light: '#EF5350', dark: '#C62828', bg: '#E53935' },
  green: { main: '#43A047', light: '#66BB6A', dark: '#2E7D32', bg: '#43A047' },
  yellow: { main: '#FDD835', light: '#FFEE58', dark: '#F9A825', bg: '#FDD835' },
  blue: { main: '#1E88E5', light: '#42A5F5', dark: '#1565C0', bg: '#1E88E5' }
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

// Player Profile Card - Ludo King style at bottom corners
const PlayerProfileCard = ({ 
  player, 
  position,
  isLeft
}: { 
  player: Player; 
  position: 'left' | 'right';
  isLeft: boolean;
}) => {
  const colors = COLORS[player.color as keyof typeof COLORS];
  const displayName = player.name || player.uid || 'Player';
  const coins = player.coins || 1250;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Player card with avatar */}
      <div 
        className={cn(
          "relative rounded-lg overflow-hidden",
          player.isCurrentTurn && "ring-4 ring-green-400"
        )}
        style={{
          width: 70,
          height: 85,
          background: 'linear-gradient(180deg, #2a4a7a 0%, #1a3a5a 100%)',
          border: player.isCurrentTurn ? '2px solid #4ade80' : '2px solid #3b5998'
        }}
      >
        {/* Avatar area */}
        <div className="flex items-center justify-center pt-2">
          <div 
            className="w-12 h-12 rounded-lg overflow-hidden bg-gray-600"
            style={{ border: '2px solid #5a7aa8' }}
          >
            {player.avatar ? (
              <img src={player.avatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold bg-gradient-to-br from-gray-500 to-gray-700">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        
        {/* Globe/level icon */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center">
            <span className="text-white text-xs">🌍</span>
          </div>
        </div>
      </div>
      
      {/* Color indicator pin at corner */}
      <div 
        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ 
          background: colors.main,
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        <MapPin className="w-3 h-3 text-white" />
      </div>
    </motion.div>
  );
};

// Bottom info bar - Ludo King style
const BottomInfoBar = ({ 
  players 
}: { 
  players: Player[];
}) => {
  const leftPlayer = players[0];
  const rightPlayer = players[1];
  
  return (
    <div 
      className="flex items-center justify-between px-2 py-2 rounded-lg"
      style={{
        background: 'linear-gradient(180deg, #1a5fb4 0%, #0d3a7a 100%)',
        border: '2px solid #2a7fd4'
      }}
    >
      {/* Left Player Info */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: COLORS[leftPlayer?.color as keyof typeof COLORS]?.main || '#1E88E5' }}
        >
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-blue-200">🏆 50</span>
          </div>
          <div className="text-white font-bold text-sm">{leftPlayer?.name || leftPlayer?.uid || 'Player 1'}</div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-xs">💰</span>
            <span className="text-yellow-300 text-xs font-medium">{leftPlayer?.coins || 1250}</span>
          </div>
        </div>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-green-400" />
          ))}
        </div>
      </div>

      {/* Center Dice Area */}
      <div 
        className="w-14 h-12 rounded-lg flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #f5e6d3 0%, #e6d5c3 100%)',
          border: '2px solid #c9b8a8'
        }}
      >
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)'
          }}
        >
          <div className="grid grid-cols-2 gap-0.5">
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Right Player Info */}
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="text-white font-bold text-sm">{rightPlayer?.name || rightPlayer?.uid || 'Player 2'}</div>
          <div className="flex items-center justify-end gap-1">
            <span className="text-yellow-400 text-xs">💰</span>
            <span className="text-yellow-300 text-xs font-medium">{rightPlayer?.coins || 1250}</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: COLORS[rightPlayer?.color as keyof typeof COLORS]?.main || '#43A047' }}
        >
          <MapPin className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
};

const LudoBoard = ({ players, onTokenClick, selectedToken, captureEvent, onCaptureAnimationComplete, diceValue = 1 }: LudoBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(Math.min(window.innerWidth - 16, window.innerHeight - 280, 380));
  const [capturePosition, setCapturePosition] = useState<{ x: number; y: number } | null>(null);
  const [previewToken, setPreviewToken] = useState<{ color: string; tokenId: number; position: number } | null>(null);
  
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

  const SAFE_SPOTS = [1, 9, 14, 22, 27, 35, 40, 48];

  return (
    <div className="relative mx-auto flex flex-col">
      {/* Ludo King Blue Pattern Background */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, #1565C0 0%, #0D47A1 50%, #0A2472 100%)',
        }}
      />
      
      {/* Chat and Gift buttons at top */}
      <div className="flex justify-between items-center px-2 py-3">
        <motion.button 
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
          whileTap={{ scale: 0.95 }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </motion.button>
        <motion.button 
          className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500"
          whileTap={{ scale: 0.95 }}
        >
          <Gift className="w-6 h-6 text-yellow-400" />
        </motion.button>
      </div>

      {/* Board Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative mx-auto"
      >
        <div ref={boardRef} className="relative" style={{ width: size, height: size }}>
          {/* Main Board SVG - Ludo King Style */}
          <svg viewBox="0 0 15 15" className="w-full h-full">
            {/* White base */}
            <rect x="0" y="0" width="15" height="15" fill="#F8F8F8" />

            {/* RED Home Base (top-left) */}
            <rect x="0" y="0" width="6" height="6" fill={COLORS.red.main} />
            <rect x="0.4" y="0.4" width="5.2" height="5.2" fill="#FFFFFF" rx="0.2" />
            {/* Token slots - simple circles */}
            {[[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]].map(([cx, cy], i) => (
              <circle key={`red-slot-${i}`} cx={cx} cy={cy} r="0.7" fill={COLORS.red.main} />
            ))}

            {/* GREEN Home Base (top-right) */}
            <rect x="9" y="0" width="6" height="6" fill={COLORS.green.main} />
            <rect x="9.4" y="0.4" width="5.2" height="5.2" fill="#FFFFFF" rx="0.2" />
            {[[10.5, 1.5], [13.5, 1.5], [10.5, 4.5], [13.5, 4.5]].map(([cx, cy], i) => (
              <circle key={`green-slot-${i}`} cx={cx} cy={cy} r="0.7" fill={COLORS.green.main} />
            ))}

            {/* BLUE Home Base (bottom-left) */}
            <rect x="0" y="9" width="6" height="6" fill={COLORS.blue.main} />
            <rect x="0.4" y="9.4" width="5.2" height="5.2" fill="#FFFFFF" rx="0.2" />
            {[[1.5, 10.5], [4.5, 10.5], [1.5, 13.5], [4.5, 13.5]].map(([cx, cy], i) => (
              <circle key={`blue-slot-${i}`} cx={cx} cy={cy} r="0.7" fill={COLORS.blue.main} />
            ))}

            {/* YELLOW Home Base (bottom-right) */}
            <rect x="9" y="9" width="6" height="6" fill={COLORS.yellow.main} />
            <rect x="9.4" y="9.4" width="5.2" height="5.2" fill="#FFFFFF" rx="0.2" />
            {[[10.5, 10.5], [13.5, 10.5], [10.5, 13.5], [13.5, 13.5]].map(([cx, cy], i) => (
              <circle key={`yellow-slot-${i}`} cx={cx} cy={cy} r="0.7" fill={COLORS.yellow.main} />
            ))}

            {/* Track Cells - White with light borders */}
            <g fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="0.03">
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

            {/* Home stretch colored cells */}
            {/* Green home stretch (top center) */}
            {[1, 2, 3, 4, 5, 6].map(i => (
              <rect key={`green-home-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.green.main} stroke={COLORS.green.dark} strokeWidth="0.02" />
            ))}
            {/* Red home stretch (left center) */}
            {[1, 2, 3, 4, 5, 6].map(i => (
              <rect key={`red-home-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.red.main} stroke={COLORS.red.dark} strokeWidth="0.02" />
            ))}
            {/* Yellow home stretch (right center) */}
            {[8, 9, 10, 11, 12, 13].map(i => (
              <rect key={`yellow-home-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.yellow.main} stroke={COLORS.yellow.dark} strokeWidth="0.02" />
            ))}
            {/* Blue home stretch (bottom center) */}
            {[8, 9, 10, 11, 12, 13].map(i => (
              <rect key={`blue-home-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.blue.main} stroke={COLORS.blue.dark} strokeWidth="0.02" />
            ))}

            {/* Start positions - colored cells */}
            <rect x={6} y={1} width="1" height="1" fill={COLORS.green.main} />
            <rect x={1} y={6} width="1" height="1" fill={COLORS.red.main} />
            <rect x={8} y={13} width="1" height="1" fill={COLORS.blue.main} />
            <rect x={13} y={8} width="1" height="1" fill={COLORS.yellow.main} />

            {/* Center triangles (finish area) */}
            <polygon points="6,6 7.5,7.5 6,9" fill={COLORS.red.main} />
            <polygon points="6,6 7.5,7.5 9,6" fill={COLORS.green.main} />
            <polygon points="9,6 7.5,7.5 9,9" fill={COLORS.yellow.main} />
            <polygon points="6,9 7.5,7.5 9,9" fill={COLORS.blue.main} />

            {/* Safe spot stars */}
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
                  points="0,-0.3 0.08,-0.1 0.3,0 0.08,0.1 0,0.3 -0.08,0.1 -0.3,0 -0.08,-0.1"
                  fill="#9E9E9E"
                  stroke="#757575"
                  strokeWidth="0.02"
                />
              </g>
            ))}

            {/* Direction arrows */}
            <text x="7.5" y="0.7" textAnchor="middle" fontSize="0.5" fill={COLORS.green.dark}>↓</text>
            <text x="7.5" y="14.7" textAnchor="middle" fontSize="0.5" fill={COLORS.blue.dark}>↑</text>
            <text x="0.5" y="7.7" textAnchor="middle" fontSize="0.5" fill={COLORS.red.dark}>→</text>
            <text x="14.5" y="7.7" textAnchor="middle" fontSize="0.5" fill={COLORS.yellow.dark}>←</text>
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
      <div className="flex justify-between items-end px-2 mt-4">
        {players[0] && (
          <PlayerProfileCard 
            player={players[0]} 
            position="left"
            isLeft={true}
          />
        )}
        
        {/* Empty space with small avatars */}
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-400/30 flex items-center justify-center">
            <span className="text-white text-lg">🌍</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-400/30 flex items-center justify-center">
            <span className="text-white text-lg">🌍</span>
          </div>
        </div>
        
        {players[1] && (
          <PlayerProfileCard 
            player={players[1]} 
            position="right"
            isLeft={false}
          />
        )}
      </div>

      {/* Bottom Info Bar with player names and coins */}
      <div className="mt-2 px-2">
        <BottomInfoBar players={players} />
      </div>
    </div>
  );
};

export default LudoBoard;
