import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Token {
  id: number;
  position: number;
  color: string;
}

interface LudoBoardProps {
  players: {
    color: string;
    tokens: Token[];
    isCurrentTurn: boolean;
  }[];
  onTokenClick?: (color: string, tokenId: number) => void;
  selectedToken?: { color: string; tokenId: number } | null;
}

// Ludo King style colors
const COLORS = {
  red: { main: '#C62828', light: '#EF5350', dark: '#B71C1C', glow: 'shadow-red-500/60' },
  green: { main: '#2E7D32', light: '#66BB6A', dark: '#1B5E20', glow: 'shadow-green-500/60' },
  yellow: { main: '#F9A825', light: '#FFEE58', dark: '#F57F17', glow: 'shadow-yellow-500/60' },
  blue: { main: '#1565C0', light: '#42A5F5', dark: '#0D47A1', glow: 'shadow-blue-500/60' }
};

// Home positions for each color (in the corner bases)
const HOME_POSITIONS: { [color: string]: { x: number; y: number }[] } = {
  red: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 4 }],
  green: [{ x: 11, y: 2 }, { x: 13, y: 2 }, { x: 11, y: 4 }, { x: 13, y: 4 }],
  yellow: [{ x: 11, y: 11 }, { x: 13, y: 11 }, { x: 11, y: 13 }, { x: 13, y: 13 }],
  blue: [{ x: 2, y: 11 }, { x: 4, y: 11 }, { x: 2, y: 13 }, { x: 4, y: 13 }]
};

// Full track coordinates - 52 positions going clockwise
// Each position is {x, y} in grid units (0-14)
const FULL_TRACK: { x: number; y: number }[] = [
  // Red start (position 1) - bottom left column going up
  { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
  // Turn left at top of red zone
  { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
  // Turn up on left edge
  { x: 0, y: 7 },
  // Turn right going across top of left zone
  { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
  // Turn up in top-left
  { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
  // Turn right at top
  { x: 7, y: 0 },
  // Turn down on right side of top section
  { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
  // Turn right at green zone
  { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
  // Turn down on right edge
  { x: 14, y: 7 },
  // Turn left going across bottom of right zone
  { x: 14, y: 8 }, { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
  // Turn down in bottom-right
  { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
  // Turn left at bottom
  { x: 7, y: 14 },
  // Turn up on left side of bottom section (back to red start)
  { x: 6, y: 14 }
];

// Starting position index on the track for each color (1-indexed in game, 0-indexed here)
// Each color enters the track at a different spot
const COLOR_START_INDEX: { [color: string]: number } = {
  red: 0,    // Position 1 on track
  green: 13, // Position 14 on track
  yellow: 26, // Position 27 on track  
  blue: 39   // Position 40 on track
};

// Home stretch paths for each color (positions 52-57 lead to center)
const HOME_PATHS: { [color: string]: { x: number; y: number }[] } = {
  red: [
    { x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }, { x: 7, y: 8 }
  ],
  green: [
    { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }
  ],
  yellow: [
    { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }
  ],
  blue: [
    { x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }, { x: 8, y: 7 }
  ]
};

const LudoBoard = ({ players, onTokenClick, selectedToken }: LudoBoardProps) => {
  const size = 320;
  const cellSize = size / 15;

  const getTokenPosition = (token: Token, color: string): { x: number; y: number } => {
    if (token.position === 0) {
      // Token is in home base
      const homePos = HOME_POSITIONS[color][token.id];
      return { x: homePos.x * cellSize, y: homePos.y * cellSize };
    }
    
    if (token.position >= 52) {
      // Token is on home stretch (positions 52-57)
      const homePathIndex = token.position - 52;
      if (homePathIndex < HOME_PATHS[color].length) {
        const pos = HOME_PATHS[color][homePathIndex];
        return { x: pos.x * cellSize, y: pos.y * cellSize };
      }
      // Token reached center (home)
      return { x: 7 * cellSize, y: 7 * cellSize };
    }
    
    // Token is on main track (positions 1-51)
    // Calculate actual track index based on color's starting point
    const startIndex = COLOR_START_INDEX[color];
    const trackIndex = (startIndex + token.position - 1) % 52;
    
    if (trackIndex >= 0 && trackIndex < FULL_TRACK.length) {
      const pos = FULL_TRACK[trackIndex];
      return { x: pos.x * cellSize, y: pos.y * cellSize };
    }
    
    return { x: 7 * cellSize, y: 7 * cellSize };
  };

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Main Board SVG */}
      <svg viewBox="0 0 15 15" className="w-full h-full drop-shadow-2xl">
        <defs>
          {/* Gradients for each color */}
          <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.red.light} />
            <stop offset="100%" stopColor={COLORS.red.dark} />
          </linearGradient>
          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.green.light} />
            <stop offset="100%" stopColor={COLORS.green.dark} />
          </linearGradient>
          <linearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.yellow.light} />
            <stop offset="100%" stopColor={COLORS.yellow.dark} />
          </linearGradient>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.blue.light} />
            <stop offset="100%" stopColor={COLORS.blue.dark} />
          </linearGradient>
          <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF8E1" />
            <stop offset="100%" stopColor="#FFECB3" />
          </linearGradient>
        </defs>

        {/* Board background */}
        <rect x="0" y="0" width="15" height="15" fill="url(#boardGrad)" rx="0.5" />

        {/* Red Home Base (top-left) */}
        <rect x="0.3" y="0.3" width="5.4" height="5.4" fill="url(#redGrad)" rx="0.3" />
        <rect x="1" y="1" width="4" height="4" fill="#FFF8E1" rx="0.2" />
        <circle cx="2" cy="2" r="0.55" fill={COLORS.red.main} />
        <circle cx="4" cy="2" r="0.55" fill={COLORS.red.main} />
        <circle cx="2" cy="4" r="0.55" fill={COLORS.red.main} />
        <circle cx="4" cy="4" r="0.55" fill={COLORS.red.main} />

        {/* Green Home Base (top-right) */}
        <rect x="9.3" y="0.3" width="5.4" height="5.4" fill="url(#greenGrad)" rx="0.3" />
        <rect x="10" y="1" width="4" height="4" fill="#FFF8E1" rx="0.2" />
        <circle cx="11" cy="2" r="0.55" fill={COLORS.green.main} />
        <circle cx="13" cy="2" r="0.55" fill={COLORS.green.main} />
        <circle cx="11" cy="4" r="0.55" fill={COLORS.green.main} />
        <circle cx="13" cy="4" r="0.55" fill={COLORS.green.main} />

        {/* Yellow Home Base (bottom-right) */}
        <rect x="9.3" y="9.3" width="5.4" height="5.4" fill="url(#yellowGrad)" rx="0.3" />
        <rect x="10" y="10" width="4" height="4" fill="#FFF8E1" rx="0.2" />
        <circle cx="11" cy="11" r="0.55" fill={COLORS.yellow.main} />
        <circle cx="13" cy="11" r="0.55" fill={COLORS.yellow.main} />
        <circle cx="11" cy="13" r="0.55" fill={COLORS.yellow.main} />
        <circle cx="13" cy="13" r="0.55" fill={COLORS.yellow.main} />

        {/* Blue Home Base (bottom-left) */}
        <rect x="0.3" y="9.3" width="5.4" height="5.4" fill="url(#blueGrad)" rx="0.3" />
        <rect x="1" y="10" width="4" height="4" fill="#FFF8E1" rx="0.2" />
        <circle cx="2" cy="11" r="0.55" fill={COLORS.blue.main} />
        <circle cx="4" cy="11" r="0.55" fill={COLORS.blue.main} />
        <circle cx="2" cy="13" r="0.55" fill={COLORS.blue.main} />
        <circle cx="4" cy="13" r="0.55" fill={COLORS.blue.main} />

        {/* Track cells - Outer ring */}
        {/* Top pathway */}
        <g fill="#FFF">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`t1-${i}`} x={6} y={0.5 + i} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`t2-${i}`} x={7} y={0.5 + i} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`t3-${i}`} x={8} y={0.5 + i} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
        </g>

        {/* Bottom pathway */}
        <g fill="#FFF">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`b1-${i}`} x={6} y={8.5 + i} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`b2-${i}`} x={7} y={8.5 + i} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`b3-${i}`} x={8} y={8.5 + i} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
        </g>

        {/* Left pathway */}
        <g fill="#FFF">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`l1-${i}`} x={0.5 + i} y={6} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`l2-${i}`} x={0.5 + i} y={7} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`l3-${i}`} x={0.5 + i} y={8} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
        </g>

        {/* Right pathway */}
        <g fill="#FFF">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`r1-${i}`} x={8.5 + i} y={6} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`r2-${i}`} x={8.5 + i} y={7} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={`r3-${i}`} x={8.5 + i} y={8} width="1" height="1" stroke="#ccc" strokeWidth="0.03" />
          ))}
        </g>

        {/* Colored home paths */}
        {/* Red path (center column going down) */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={`rp-${i}`} x={7} y={8.5 + i} width="1" height="1" fill={COLORS.red.light} stroke={COLORS.red.main} strokeWidth="0.05" />
        ))}
        {/* Green path (center row going right) */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={`gp-${i}`} x={0.5 + i} y={7} width="1" height="1" fill={COLORS.green.light} stroke={COLORS.green.main} strokeWidth="0.05" />
        ))}
        {/* Yellow path (center column going up) */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={`yp-${i}`} x={7} y={0.5 + i} width="1" height="1" fill={COLORS.yellow.light} stroke={COLORS.yellow.main} strokeWidth="0.05" />
        ))}
        {/* Blue path (center row going left) */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={`bp-${i}`} x={8.5 + i} y={7} width="1" height="1" fill={COLORS.blue.light} stroke={COLORS.blue.main} strokeWidth="0.05" />
        ))}

        {/* Start positions (stars) */}
        <g fontSize="0.8" textAnchor="middle" dominantBaseline="central">
          <text x="6.5" y="13.5" fill={COLORS.red.main}>★</text>
          <text x="1.5" y="6.5" fill={COLORS.green.main}>★</text>
          <text x="8.5" y="1.5" fill={COLORS.yellow.main}>★</text>
          <text x="13.5" y="8.5" fill={COLORS.blue.main}>★</text>
        </g>

        {/* Safe spots (stars) */}
        <g fontSize="0.6" textAnchor="middle" dominantBaseline="central" fill="#888">
          <text x="2.5" y="7.5">★</text>
          <text x="7.5" y="2.5">★</text>
          <text x="12.5" y="7.5">★</text>
          <text x="7.5" y="12.5">★</text>
        </g>

        {/* Center home - triangles */}
        <polygon points="6,6 7.5,7.5 6,9" fill={COLORS.red.main} />
        <polygon points="6,6 7.5,7.5 9,6" fill={COLORS.green.main} />
        <polygon points="9,6 7.5,7.5 9,9" fill={COLORS.yellow.main} />
        <polygon points="6,9 7.5,7.5 9,9" fill={COLORS.blue.main} />

        {/* Center circle */}
        <circle cx="7.5" cy="7.5" r="0.6" fill="#FFF" stroke="#d4a574" strokeWidth="0.1" />
      </svg>

      {/* Tokens */}
      {players.map((player) => (
        player.tokens.map((token) => {
          const pos = getTokenPosition(token, player.color);
          const isSelected = selectedToken?.color === player.color && selectedToken?.tokenId === token.id;
          const colors = COLORS[player.color as keyof typeof COLORS];

          return (
            <motion.button
              key={`${player.color}-${token.id}`}
              className={cn(
                'absolute rounded-full flex items-center justify-center',
                'border-2 border-white/80',
                player.isCurrentTurn && onTokenClick && 'cursor-pointer',
                isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-transparent z-20',
                player.isCurrentTurn && `shadow-lg ${colors.glow}`
              )}
              style={{
                width: cellSize * 0.9,
                height: cellSize * 0.9,
                background: `linear-gradient(135deg, ${colors.light} 0%, ${colors.main} 50%, ${colors.dark} 100%)`,
                boxShadow: player.isCurrentTurn 
                  ? `0 4px 15px ${colors.main}80, inset 0 2px 4px rgba(255,255,255,0.3)`
                  : 'inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)'
              }}
              initial={false}
              animate={{
                left: pos.x - (cellSize * 0.45),
                top: pos.y - (cellSize * 0.45),
                scale: isSelected ? 1.3 : player.isCurrentTurn ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              whileHover={onTokenClick && player.isCurrentTurn ? { scale: 1.2 } : {}}
              whileTap={onTokenClick && player.isCurrentTurn ? { scale: 0.95 } : {}}
              onClick={() => onTokenClick?.(player.color, token.id)}
              disabled={!player.isCurrentTurn || !onTokenClick}
            >
              {/* Inner circle for 3D effect */}
              <div 
                className="absolute inset-1 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5) 0%, transparent 50%)`,
                }}
              />
              {/* Token number */}
              <span className="text-[10px] font-bold text-white drop-shadow-md relative z-10">
                {token.id + 1}
              </span>
              {/* Pulse for current turn */}
              {player.isCurrentTurn && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: colors.light }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })
      ))}
    </div>
  );
};

export default LudoBoard;