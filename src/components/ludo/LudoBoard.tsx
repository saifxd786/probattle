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

// Full track coordinates - 52 positions going clockwise
const FULL_TRACK: { x: number; y: number }[] = [
  // Red start (position 1) - bottom left column going up
  { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Turn left at top of red zone
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Turn up on left edge
  { x: 0.5, y: 7.5 },
  // Turn right going across top of left zone
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Turn up in top-left
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Turn right at top
  { x: 7.5, y: 0.5 },
  // Turn down on right side of top section
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Turn right at green zone
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Turn down on right edge
  { x: 14.5, y: 7.5 },
  // Turn left going across bottom of right zone
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Turn down in bottom-right
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Turn left at bottom
  { x: 7.5, y: 14.5 },
  // Turn up on left side of bottom section (back to red start)
  { x: 6.5, y: 14.5 }
];

// Starting position index on the track for each color
const COLOR_START_INDEX: { [color: string]: number } = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

// Home stretch paths for each color (positions 52-57 lead to center)
const HOME_PATHS: { [color: string]: { x: number; y: number }[] } = {
  red: [
    { x: 7.5, y: 13.5 }, { x: 7.5, y: 12.5 }, { x: 7.5, y: 11.5 }, { x: 7.5, y: 10.5 }, { x: 7.5, y: 9.5 }, { x: 7.5, y: 8.5 }
  ],
  green: [
    { x: 1.5, y: 7.5 }, { x: 2.5, y: 7.5 }, { x: 3.5, y: 7.5 }, { x: 4.5, y: 7.5 }, { x: 5.5, y: 7.5 }, { x: 6.5, y: 7.5 }
  ],
  yellow: [
    { x: 7.5, y: 1.5 }, { x: 7.5, y: 2.5 }, { x: 7.5, y: 3.5 }, { x: 7.5, y: 4.5 }, { x: 7.5, y: 5.5 }, { x: 7.5, y: 6.5 }
  ],
  blue: [
    { x: 13.5, y: 7.5 }, { x: 12.5, y: 7.5 }, { x: 11.5, y: 7.5 }, { x: 10.5, y: 7.5 }, { x: 9.5, y: 7.5 }, { x: 8.5, y: 7.5 }
  ]
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
        'absolute flex items-center gap-1.5 px-2 py-1 rounded-lg',
        'text-xs font-bold text-white shadow-lg',
        positionClasses[position]
      )}
      style={{ 
        backgroundColor: colors.main,
        border: `2px solid ${player.isCurrentTurn ? '#fff' : colors.dark}`,
      }}
      animate={{
        scale: player.isCurrentTurn ? 1.05 : 1,
        boxShadow: player.isCurrentTurn 
          ? `0 0 12px ${colors.main}80` 
          : '0 2px 4px rgba(0,0,0,0.2)'
      }}
      transition={{ duration: 0.3 }}
    >
      {player.isBot ? (
        <Bot className="w-3 h-3" />
      ) : (
        <User className="w-3 h-3" />
      )}
      <span className="truncate max-w-[60px]">{displayName}</span>
      {player.isCurrentTurn && (
        <motion.div
          className="w-2 h-2 rounded-full bg-white"
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
  const size = 340;
  const cellSize = size / 15;
  
  // Find current turn player
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
    
    const startIndex = COLOR_START_INDEX[color];
    const trackIndex = (startIndex + token.position - 1) % 52;
    
    if (trackIndex >= 0 && trackIndex < FULL_TRACK.length) {
      const pos = FULL_TRACK[trackIndex];
      return { x: pos.x * cellSize, y: pos.y * cellSize };
    }
    
    return { x: 7.5 * cellSize, y: 7.5 * cellSize };
  };

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Main Board SVG */}
      <svg viewBox="0 0 15 15" className="w-full h-full" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }}>
        <defs>
          <linearGradient id="boardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f0e6" />
            <stop offset="100%" stopColor="#e8e0d0" />
          </linearGradient>
        </defs>

        {/* Board background */}
        <rect x="0" y="0" width="15" height="15" fill="url(#boardBg)" />
        
        {/* Board border */}
        <rect x="0" y="0" width="15" height="15" fill="none" stroke="#8B7355" strokeWidth="0.15" />

        {/* RED Home Base (top-left) */}
        <rect x="0" y="0" width="6" height="6" fill={COLORS.red.main} />
        <rect x="0.4" y="0.4" width="5.2" height="5.2" fill={COLORS.red.main} stroke={COLORS.red.dark} strokeWidth="0.1" />
        <rect x="0.8" y="0.8" width="4.4" height="4.4" fill="#fff" rx="0.2" />
        {/* Token spots */}
        <circle cx="1.8" cy="1.8" r="0.65" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.1" />
        <circle cx="4.2" cy="1.8" r="0.65" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.1" />
        <circle cx="1.8" cy="4.2" r="0.65" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.1" />
        <circle cx="4.2" cy="4.2" r="0.65" fill={COLORS.red.bg} stroke={COLORS.red.main} strokeWidth="0.1" />

        {/* GREEN Home Base (top-right) */}
        <rect x="9" y="0" width="6" height="6" fill={COLORS.green.main} />
        <rect x="9.4" y="0.4" width="5.2" height="5.2" fill={COLORS.green.main} stroke={COLORS.green.dark} strokeWidth="0.1" />
        <rect x="9.8" y="0.8" width="4.4" height="4.4" fill="#fff" rx="0.2" />
        <circle cx="10.8" cy="1.8" r="0.65" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.1" />
        <circle cx="13.2" cy="1.8" r="0.65" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.1" />
        <circle cx="10.8" cy="4.2" r="0.65" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.1" />
        <circle cx="13.2" cy="4.2" r="0.65" fill={COLORS.green.bg} stroke={COLORS.green.main} strokeWidth="0.1" />

        {/* YELLOW Home Base (bottom-right) */}
        <rect x="9" y="9" width="6" height="6" fill={COLORS.yellow.main} />
        <rect x="9.4" y="9.4" width="5.2" height="5.2" fill={COLORS.yellow.main} stroke={COLORS.yellow.dark} strokeWidth="0.1" />
        <rect x="9.8" y="9.8" width="4.4" height="4.4" fill="#fff" rx="0.2" />
        <circle cx="10.8" cy="10.8" r="0.65" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.1" />
        <circle cx="13.2" cy="10.8" r="0.65" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.1" />
        <circle cx="10.8" cy="13.2" r="0.65" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.1" />
        <circle cx="13.2" cy="13.2" r="0.65" fill={COLORS.yellow.bg} stroke={COLORS.yellow.main} strokeWidth="0.1" />

        {/* BLUE Home Base (bottom-left) */}
        <rect x="0" y="9" width="6" height="6" fill={COLORS.blue.main} />
        <rect x="0.4" y="9.4" width="5.2" height="5.2" fill={COLORS.blue.main} stroke={COLORS.blue.dark} strokeWidth="0.1" />
        <rect x="0.8" y="9.8" width="4.4" height="4.4" fill="#fff" rx="0.2" />
        <circle cx="1.8" cy="10.8" r="0.65" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.1" />
        <circle cx="4.2" cy="10.8" r="0.65" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.1" />
        <circle cx="1.8" cy="13.2" r="0.65" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.1" />
        <circle cx="4.2" cy="13.2" r="0.65" fill={COLORS.blue.bg} stroke={COLORS.blue.main} strokeWidth="0.1" />

        {/* Track Cells - White cells with grid */}
        <g fill="#fff" stroke="#ccc" strokeWidth="0.03">
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

        {/* Colored Home Paths */}
        {/* Yellow path (top center going down) */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={`yp-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.yellow.main} stroke={COLORS.yellow.dark} strokeWidth="0.05" />
        ))}
        {/* Green path (left center going right) */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={`gp-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.green.main} stroke={COLORS.green.dark} strokeWidth="0.05" />
        ))}
        {/* Red path (bottom center going up) */}
        {[9, 10, 11, 12, 13, 14].map(i => (
          <rect key={`rp-${i}`} x={7} y={i} width="1" height="1" fill={COLORS.red.main} stroke={COLORS.red.dark} strokeWidth="0.05" />
        ))}
        {/* Blue path (right center going left) */}
        {[9, 10, 11, 12, 13, 14].map(i => (
          <rect key={`bp-${i}`} x={i} y={7} width="1" height="1" fill={COLORS.blue.main} stroke={COLORS.blue.dark} strokeWidth="0.05" />
        ))}

        {/* Safe spots / Stars on track */}
        <g fontSize="0.5" textAnchor="middle" dominantBaseline="central" fill="#999">
          {/* Arrow indicators for entry points */}
          <text x="6.5" y="12.5" fontSize="0.4">↓</text>
          <text x="2.5" y="6.5" fontSize="0.4">→</text>
          <text x="8.5" y="2.5" fontSize="0.4">↑</text>
          <text x="12.5" y="8.5" fontSize="0.4">←</text>
        </g>

        {/* Starting stars (colored) */}
        <g fontSize="0.6" textAnchor="middle" dominantBaseline="central">
          <text x="6.5" y="13.5" fill={COLORS.red.main}>★</text>
          <text x="1.5" y="6.5" fill={COLORS.green.main}>★</text>
          <text x="8.5" y="1.5" fill={COLORS.yellow.main}>★</text>
          <text x="13.5" y="8.5" fill={COLORS.blue.main}>★</text>
        </g>

        {/* Safe spots (gray stars) */}
        <g fontSize="0.45" textAnchor="middle" dominantBaseline="central" fill="#aaa">
          <text x="2.5" y="7.5">★</text>
          <text x="7.5" y="2.5">★</text>
          <text x="12.5" y="7.5">★</text>
          <text x="7.5" y="12.5">★</text>
        </g>

        {/* Center Home Triangle */}
        <polygon points="6,6 7.5,7.5 6,9" fill={COLORS.green.main} stroke="#fff" strokeWidth="0.05" />
        <polygon points="6,6 7.5,7.5 9,6" fill={COLORS.yellow.main} stroke="#fff" strokeWidth="0.05" />
        <polygon points="9,6 7.5,7.5 9,9" fill={COLORS.blue.main} stroke="#fff" strokeWidth="0.05" />
        <polygon points="6,9 7.5,7.5 9,9" fill={COLORS.red.main} stroke="#fff" strokeWidth="0.05" />

        {/* Center circle */}
        <circle cx="7.5" cy="7.5" r="0.5" fill="#fff" stroke="#d4a574" strokeWidth="0.08" />
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
                size={cellSize * 0.8}
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
            className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-xl bg-background/95 backdrop-blur-sm border shadow-lg"
            style={{ 
              borderColor: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main,
              boxShadow: `0 4px 20px ${COLORS[currentTurnPlayer.color as keyof typeof COLORS].main}40`
            }}
          >
            {/* Mini token indicator */}
            <div className="relative">
              <PinToken 
                color={currentTurnPlayer.color as keyof typeof COLORS} 
                isActive 
                isSelected={false}
                size={16}
              />
            </div>
            
            {/* Player info */}
            <div className="flex items-center gap-2">
              {currentTurnPlayer.isBot ? (
                <Bot className="w-4 h-4 text-muted-foreground" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-bold text-sm" style={{ color: COLORS[currentTurnPlayer.color as keyof typeof COLORS].main }}>
                {currentTurnPlayer.name || (currentTurnPlayer.isBot ? 'Computer' : 'You')}
              </span>
            </div>
            
            {/* Turn text */}
            <span className="text-xs text-muted-foreground">is playing</span>
            
            {/* Animated dots */}
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
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
