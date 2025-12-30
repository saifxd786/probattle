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
}

// Ludo board path coordinates (simplified 52-position path)
const PATH_POSITIONS: { [key: number]: { x: number; y: number } } = {};

// Generate path positions for the main track
const generatePathPositions = () => {
  // Bottom row (positions 0-5)
  for (let i = 0; i <= 5; i++) {
    PATH_POSITIONS[i] = { x: 9 + i, y: 13 };
  }
  // Right column going up (positions 6-11)
  for (let i = 0; i <= 5; i++) {
    PATH_POSITIONS[6 + i] = { x: 14, y: 12 - i };
  }
  // Top-right going left (positions 12-13)
  PATH_POSITIONS[12] = { x: 14, y: 6 };
  PATH_POSITIONS[13] = { x: 13, y: 6 };
  
  // Top row right side (positions 14-18)
  for (let i = 0; i <= 4; i++) {
    PATH_POSITIONS[14 + i] = { x: 12 - i, y: 6 };
  }
  
  // Top row left side (positions 19-24)
  for (let i = 0; i <= 5; i++) {
    PATH_POSITIONS[19 + i] = { x: 7 - i, y: 6 };
  }
  
  // Left column going down (positions 25-30)
  PATH_POSITIONS[25] = { x: 0, y: 6 };
  for (let i = 0; i <= 5; i++) {
    PATH_POSITIONS[26 + i] = { x: 0, y: 7 + i };
  }
  
  // Bottom row left side (positions 32-38)
  for (let i = 0; i <= 6; i++) {
    PATH_POSITIONS[32 + i] = { x: 1 + i, y: 13 };
  }
  
  // Continue filling remaining positions
  for (let i = 39; i <= 51; i++) {
    PATH_POSITIONS[i] = { x: (i % 15), y: Math.floor(i / 3) };
  }
};

generatePathPositions();

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

const COLOR_CLASSES: { [key: string]: string } = {
  red: 'bg-red-500 border-red-300',
  green: 'bg-green-500 border-green-300',
  yellow: 'bg-yellow-500 border-yellow-300',
  blue: 'bg-blue-500 border-blue-300'
};

const LudoBoard = ({ players, onTokenClick, selectedToken, highlightedPositions = [] }: LudoBoardProps) => {
  const cellSize = 22;
  const boardSize = 15;

  const getTokenPosition = (token: Token, color: string) => {
    if (token.position === 0) {
      // Token is in home
      const homePos = HOME_POSITIONS[color][token.id];
      return { x: homePos.x * cellSize + cellSize / 2, y: homePos.y * cellSize + cellSize / 2 };
    }
    // Token is on the board
    const pathPos = PATH_POSITIONS[token.position] || { x: 7, y: 7 };
    return { x: pathPos.x * cellSize + cellSize / 2, y: pathPos.y * cellSize + cellSize / 2 };
  };

  return (
    <div className="relative mx-auto" style={{ width: boardSize * cellSize, height: boardSize * cellSize }}>
      {/* Board Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg shadow-2xl border-4 border-amber-700">
        {/* Grid Lines */}
        <svg className="absolute inset-0" width="100%" height="100%">
          {/* Home areas */}
          <rect x="0" y="0" width={cellSize * 6} height={cellSize * 6} fill="rgba(239, 68, 68, 0.3)" rx="8" />
          <rect x={cellSize * 9} y="0" width={cellSize * 6} height={cellSize * 6} fill="rgba(34, 197, 94, 0.3)" rx="8" />
          <rect x={cellSize * 9} y={cellSize * 9} width={cellSize * 6} height={cellSize * 6} fill="rgba(234, 179, 8, 0.3)" rx="8" />
          <rect x="0" y={cellSize * 9} width={cellSize * 6} height={cellSize * 6} fill="rgba(59, 130, 246, 0.3)" rx="8" />
          
          {/* Center home */}
          <polygon 
            points={`${cellSize * 6},${cellSize * 6} ${cellSize * 7.5},${cellSize * 7.5} ${cellSize * 6},${cellSize * 9}`}
            fill="rgba(239, 68, 68, 0.5)"
          />
          <polygon 
            points={`${cellSize * 6},${cellSize * 6} ${cellSize * 7.5},${cellSize * 7.5} ${cellSize * 9},${cellSize * 6}`}
            fill="rgba(34, 197, 94, 0.5)"
          />
          <polygon 
            points={`${cellSize * 9},${cellSize * 6} ${cellSize * 7.5},${cellSize * 7.5} ${cellSize * 9},${cellSize * 9}`}
            fill="rgba(234, 179, 8, 0.5)"
          />
          <polygon 
            points={`${cellSize * 6},${cellSize * 9} ${cellSize * 7.5},${cellSize * 7.5} ${cellSize * 9},${cellSize * 9}`}
            fill="rgba(59, 130, 246, 0.5)"
          />
        </svg>
      </div>

      {/* Tokens */}
      {players.map((player) => (
        player.tokens.map((token) => {
          const pos = getTokenPosition(token, player.color);
          const isSelected = selectedToken?.color === player.color && selectedToken?.tokenId === token.id;
          const isHighlighted = highlightedPositions.includes(token.position);
          
          return (
            <motion.button
              key={`${player.color}-${token.id}`}
              className={cn(
                'absolute rounded-full border-2 shadow-lg transition-all z-10',
                COLOR_CLASSES[player.color],
                player.isCurrentTurn && 'ring-2 ring-white ring-opacity-50',
                isSelected && 'ring-4 ring-white scale-125',
                isHighlighted && 'animate-pulse',
                onTokenClick && player.isCurrentTurn && 'cursor-pointer hover:scale-110'
              )}
              style={{
                width: cellSize * 0.7,
                height: cellSize * 0.7,
                left: pos.x - (cellSize * 0.35),
                top: pos.y - (cellSize * 0.35),
              }}
              animate={{ x: 0, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={() => onTokenClick?.(player.color, token.id)}
              disabled={!player.isCurrentTurn || !onTokenClick}
            >
              <span className="text-[8px] font-bold text-white drop-shadow">{token.id + 1}</span>
            </motion.button>
          );
        })
      ))}
    </div>
  );
};

export default LudoBoard;