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
  highlightedPositions?: number[];
  movingToken?: { color: string; tokenId: number; from: number; to: number } | null;
}

// Home positions for each color
const HOME_POSITIONS: { [color: string]: { x: number; y: number }[] } = {
  red: [
    { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }
  ],
  green: [
    { x: 11, y: 2 }, { x: 12, y: 2 }, { x: 11, y: 3 }, { x: 12, y: 3 }
  ],
  yellow: [
    { x: 11, y: 11 }, { x: 12, y: 11 }, { x: 11, y: 12 }, { x: 12, y: 12 }
  ],
  blue: [
    { x: 2, y: 11 }, { x: 3, y: 11 }, { x: 2, y: 12 }, { x: 3, y: 12 }
  ]
};

// Generate path positions for the main track
const generatePathPositions = (): { [key: number]: { x: number; y: number } } => {
  const positions: { [key: number]: { x: number; y: number } } = {};
  
  // Starting from bottom-left, going clockwise
  // Bottom row (left to right) - positions 1-6
  for (let i = 0; i < 6; i++) {
    positions[1 + i] = { x: 1 + i, y: 13 };
  }
  
  // Left column (bottom to top) - positions 7-12
  for (let i = 0; i < 6; i++) {
    positions[7 + i] = { x: 6, y: 12 - i };
  }
  
  // Top-left corner - position 13
  positions[13] = { x: 6, y: 6 };
  
  // Top row left (right direction) - positions 14-18
  for (let i = 0; i < 5; i++) {
    positions[14 + i] = { x: 5 - i, y: 6 };
  }
  positions[19] = { x: 0, y: 6 };
  
  // Top column (going up) - positions 20-24
  for (let i = 0; i < 5; i++) {
    positions[20 + i] = { x: 0, y: 5 - i };
  }
  positions[25] = { x: 0, y: 0 };
  
  // Continue around the board...
  // Top row (left to right)
  for (let i = 0; i < 6; i++) {
    positions[26 + i] = { x: 1 + i, y: 0 };
  }
  
  // Right side going down
  for (let i = 0; i < 6; i++) {
    positions[32 + i] = { x: 8, y: 1 + i };
  }
  
  // More positions around the board
  for (let i = 38; i <= 57; i++) {
    const angle = ((i - 1) / 52) * Math.PI * 2;
    positions[i] = { 
      x: 7 + Math.cos(angle) * 6,
      y: 7 + Math.sin(angle) * 6
    };
  }
  
  return positions;
};

const PATH_POSITIONS = generatePathPositions();

const COLOR_STYLES: { [key: string]: { bg: string; border: string; glow: string } } = {
  red: { 
    bg: 'bg-gradient-to-br from-red-400 to-red-600', 
    border: 'border-red-300',
    glow: 'shadow-red-500/50'
  },
  green: { 
    bg: 'bg-gradient-to-br from-green-400 to-green-600', 
    border: 'border-green-300',
    glow: 'shadow-green-500/50'
  },
  yellow: { 
    bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', 
    border: 'border-yellow-300',
    glow: 'shadow-yellow-500/50'
  },
  blue: { 
    bg: 'bg-gradient-to-br from-blue-400 to-blue-600', 
    border: 'border-blue-300',
    glow: 'shadow-blue-500/50'
  }
};

const LudoBoard = ({ 
  players, 
  onTokenClick, 
  selectedToken, 
  highlightedPositions = [],
  movingToken 
}: LudoBoardProps) => {
  const cellSize = 22;
  const boardSize = 15;

  const getTokenPosition = (token: Token, color: string) => {
    if (token.position === 0) {
      const homePos = HOME_POSITIONS[color][token.id];
      return { x: homePos.x * cellSize + cellSize / 2, y: homePos.y * cellSize + cellSize / 2 };
    }
    if (token.position === 57) {
      // Token reached final home - center of board
      return { x: 7.5 * cellSize, y: 7.5 * cellSize };
    }
    const pathPos = PATH_POSITIONS[token.position] || { x: 7, y: 7 };
    return { x: pathPos.x * cellSize + cellSize / 2, y: pathPos.y * cellSize + cellSize / 2 };
  };

  return (
    <div 
      className="relative mx-auto select-none" 
      style={{ width: boardSize * cellSize, height: boardSize * cellSize }}
    >
      {/* Board Background with pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 rounded-xl shadow-2xl border-4 border-amber-700 overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0)`,
            backgroundSize: '12px 12px'
          }} />
        </div>
        
        {/* SVG Board Elements */}
        <svg className="absolute inset-0" width="100%" height="100%">
          {/* Home areas with gradients */}
          <defs>
            <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
              <stop offset="100%" stopColor="rgba(220, 38, 38, 0.3)" />
            </linearGradient>
            <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0.4)" />
              <stop offset="100%" stopColor="rgba(22, 163, 74, 0.3)" />
            </linearGradient>
            <linearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(234, 179, 8, 0.4)" />
              <stop offset="100%" stopColor="rgba(202, 138, 4, 0.3)" />
            </linearGradient>
            <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
              <stop offset="100%" stopColor="rgba(37, 99, 235, 0.3)" />
            </linearGradient>
          </defs>
          
          {/* Home bases */}
          <rect x="0" y="0" width={cellSize * 6} height={cellSize * 6} fill="url(#redGrad)" rx="12" />
          <rect x={cellSize * 9} y="0" width={cellSize * 6} height={cellSize * 6} fill="url(#greenGrad)" rx="12" />
          <rect x={cellSize * 9} y={cellSize * 9} width={cellSize * 6} height={cellSize * 6} fill="url(#yellowGrad)" rx="12" />
          <rect x="0" y={cellSize * 9} width={cellSize * 6} height={cellSize * 6} fill="url(#blueGrad)" rx="12" />
          
          {/* Center home triangles */}
          <polygon 
            points={`${cellSize * 6},${cellSize * 6} ${cellSize * 7.5},${cellSize * 7.5} ${cellSize * 6},${cellSize * 9}`}
            fill="rgba(239, 68, 68, 0.6)"
          />
          <polygon 
            points={`${cellSize * 6},${cellSize * 6} ${cellSize * 7.5},${cellSize * 7.5} ${cellSize * 9},${cellSize * 6}`}
            fill="rgba(34, 197, 94, 0.6)"
          />
          <polygon 
            points={`${cellSize * 9},${cellSize * 6} ${cellSize * 7.5},${cellSize * 7.5} ${cellSize * 9},${cellSize * 9}`}
            fill="rgba(234, 179, 8, 0.6)"
          />
          <polygon 
            points={`${cellSize * 6},${cellSize * 9} ${cellSize * 7.5},${cellSize * 7.5} ${cellSize * 9},${cellSize * 9}`}
            fill="rgba(59, 130, 246, 0.6)"
          />
          
          {/* Center star */}
          <circle cx={cellSize * 7.5} cy={cellSize * 7.5} r={cellSize * 0.8} fill="rgba(255,255,255,0.9)" stroke="#d4a574" strokeWidth="2" />
        </svg>
      </div>

      {/* Tokens */}
      {players.map((player) => (
        player.tokens.map((token) => {
          const pos = getTokenPosition(token, player.color);
          const isSelected = selectedToken?.color === player.color && selectedToken?.tokenId === token.id;
          const isHighlighted = highlightedPositions.includes(token.position);
          const isMoving = movingToken?.color === player.color && movingToken?.tokenId === token.id;
          const style = COLOR_STYLES[player.color];
          
          return (
            <motion.button
              key={`${player.color}-${token.id}`}
              className={cn(
                'absolute rounded-full border-2 shadow-lg transition-shadow z-10 flex items-center justify-center',
                style.bg,
                style.border,
                player.isCurrentTurn && `ring-2 ring-white/70 shadow-lg ${style.glow}`,
                isSelected && 'ring-4 ring-white scale-125 z-20',
                onTokenClick && player.isCurrentTurn && 'cursor-pointer hover:scale-110',
                isHighlighted && 'animate-bounce'
              )}
              style={{
                width: cellSize * 0.75,
                height: cellSize * 0.75,
              }}
              initial={false}
              animate={{
                left: pos.x - (cellSize * 0.375),
                top: pos.y - (cellSize * 0.375),
                scale: isSelected ? 1.25 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                mass: 0.8
              }}
              whileHover={onTokenClick && player.isCurrentTurn ? { scale: 1.15 } : {}}
              whileTap={onTokenClick && player.isCurrentTurn ? { scale: 0.95 } : {}}
              onClick={() => onTokenClick?.(player.color, token.id)}
              disabled={!player.isCurrentTurn || !onTokenClick}
            >
              {/* Token number */}
              <span className="text-[9px] font-bold text-white drop-shadow-md">{token.id + 1}</span>
              
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="absolute top-0 left-1/4 w-1/2 h-1/3 bg-white/30 rounded-full blur-[2px]" />
              </div>
              
              {/* Pulse effect for current turn */}
              {player.isCurrentTurn && (
                <motion.div
                  className={cn('absolute inset-0 rounded-full', style.bg)}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
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