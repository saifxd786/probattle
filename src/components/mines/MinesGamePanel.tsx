import { motion } from 'framer-motion';
import { Minus, Plus, Bomb, Gem, Wallet, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MinesGamePanelProps {
  phase: 'idle' | 'playing' | 'result';
  entryAmount: number;
  minesCount: number;
  currentMultiplier: number;
  potentialWin: number;
  revealedCount: number;
  walletBalance: number;
  minEntry: number;
  minMines: number;
  maxMines: number;
  onEntryChange: (amount: number) => void;
  onMinesChange: (count: number) => void;
  onStart: () => void;
  onCashOut: () => void;
  onReset: () => void;
  isWin: boolean | null;
  finalAmount: number;
}

const MinesGamePanel = ({
  phase,
  entryAmount,
  minesCount,
  currentMultiplier,
  potentialWin,
  revealedCount,
  walletBalance,
  minEntry,
  minMines,
  maxMines,
  onEntryChange,
  onMinesChange,
  onStart,
  onCashOut,
  onReset,
  isWin,
  finalAmount
}: MinesGamePanelProps) => {
  const quickAmounts = [10, 50, 100, 500];
  const quickMines = [1, 3, 5, 10, 15, 20];

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
      {/* Wallet Balance */}
      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">Balance</span>
        </div>
        <span className="font-bold text-lg">₹{walletBalance.toFixed(0)}</span>
      </div>

      {phase === 'idle' && (
        <>
          {/* Entry Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Bet Amount</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEntryChange(Math.max(minEntry, entryAmount - 10))}
                disabled={entryAmount <= minEntry}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={entryAmount}
                onChange={(e) => onEntryChange(Math.max(minEntry, Number(e.target.value)))}
                className="text-center font-bold text-lg"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEntryChange(entryAmount + 10)}
                disabled={entryAmount >= walletBalance}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="secondary"
                  size="sm"
                  onClick={() => onEntryChange(amount)}
                  className={cn(entryAmount === amount && 'border-primary bg-primary/10')}
                >
                  ₹{amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Mines Count */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bomb className="w-4 h-4" /> Number of Mines
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMinesChange(Math.max(minMines, minesCount - 1))}
                disabled={minesCount <= minMines}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={minesCount}
                onChange={(e) => onMinesChange(Math.min(maxMines, Math.max(minMines, Number(e.target.value))))}
                className="text-center font-bold text-lg"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMinesChange(Math.min(maxMines, minesCount + 1))}
                disabled={minesCount >= maxMines}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {quickMines.map((count) => (
                <Button
                  key={count}
                  variant="secondary"
                  size="sm"
                  onClick={() => onMinesChange(count)}
                  className={cn(
                    'min-w-[40px]',
                    minesCount === count && 'border-primary bg-primary/10'
                  )}
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <Button
            onClick={onStart}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 shadow-lg shadow-emerald-500/30"
            disabled={entryAmount > walletBalance}
          >
            <Gem className="w-5 h-5 mr-2" />
            Start Game
          </Button>
        </>
      )}

      {phase === 'playing' && (
        <>
          {/* Game Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-secondary/50 rounded-xl text-center">
              <div className="text-xs text-muted-foreground mb-1">Gems Found</div>
              <div className="text-xl font-bold text-emerald-400">{revealedCount}</div>
            </div>
            <div className="p-3 bg-secondary/50 rounded-xl text-center">
              <div className="text-xs text-muted-foreground mb-1">Multiplier</div>
              <div className="text-xl font-bold text-primary">{currentMultiplier.toFixed(2)}x</div>
            </div>
          </div>

          {/* Potential Win */}
          <motion.div
            key={potentialWin}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="p-4 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-xl border border-emerald-500/30"
          >
            <div className="text-sm text-emerald-400 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Potential Win
            </div>
            <div className="text-3xl font-bold text-emerald-400">₹{potentialWin.toFixed(0)}</div>
          </motion.div>

          {/* Cash Out Button */}
          <Button
            onClick={onCashOut}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            disabled={revealedCount === 0}
          >
            Cash Out ₹{potentialWin.toFixed(0)}
          </Button>
        </>
      )}

      {phase === 'result' && (
        <>
          {/* Result Display */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'p-6 rounded-xl text-center',
              isWin 
                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30' 
                : 'bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30'
            )}
          >
            {isWin ? (
              <>
                <Gem className="w-16 h-16 mx-auto text-emerald-400 mb-3" />
                <div className="text-2xl font-bold text-emerald-400 mb-1">You Won!</div>
                <div className="text-4xl font-bold">₹{finalAmount.toFixed(0)}</div>
              </>
            ) : (
              <>
                <Bomb className="w-16 h-16 mx-auto text-red-400 mb-3" />
                <div className="text-2xl font-bold text-red-400 mb-1">Game Over!</div>
                <div className="text-lg text-muted-foreground">You hit a mine</div>
              </>
            )}
          </motion.div>

          {/* Play Again Button */}
          <Button
            onClick={onReset}
            className="w-full h-14 text-lg font-bold"
          >
            Play Again
          </Button>
        </>
      )}
    </div>
  );
};

export default MinesGamePanel;
