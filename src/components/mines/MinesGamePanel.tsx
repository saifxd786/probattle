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
    <div className="bg-card rounded-xl border border-border p-2 space-y-1.5">
      {/* Wallet Balance */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-secondary/50 rounded-lg">
        <div className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] text-muted-foreground">Balance</span>
        </div>
        <span className="font-bold text-sm">₹{walletBalance.toFixed(0)}</span>
      </div>

      {phase === 'idle' && (
        <>
          {/* Entry Amount */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Bet Amount</label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => onEntryChange(Math.max(minEntry, entryAmount - 10))}
                disabled={entryAmount <= minEntry}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <Input
                type="number"
                value={entryAmount}
                onChange={(e) => onEntryChange(Math.max(minEntry, Number(e.target.value)))}
                className="text-center font-bold h-7 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => onEntryChange(entryAmount + 10)}
                disabled={entryAmount >= walletBalance}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-1">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="secondary"
                  size="sm"
                  className={cn('flex-1 h-6 text-[10px] px-1', entryAmount === amount && 'border-primary bg-primary/10')}
                  onClick={() => onEntryChange(amount)}
                >
                  ₹{amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Mines Count */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <Bomb className="w-3 h-3" /> Mines
            </label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => onMinesChange(Math.max(minMines, minesCount - 1))}
                disabled={minesCount <= minMines}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <Input
                type="number"
                value={minesCount}
                onChange={(e) => onMinesChange(Math.min(maxMines, Math.max(minMines, Number(e.target.value))))}
                className="text-center font-bold h-7 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => onMinesChange(Math.min(maxMines, minesCount + 1))}
                disabled={minesCount >= maxMines}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-1">
              {quickMines.map((count) => (
                <Button
                  key={count}
                  variant="secondary"
                  size="sm"
                  onClick={() => onMinesChange(count)}
                  className={cn(
                    'h-6 text-[10px] px-2',
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
            className="w-full h-10 text-sm font-bold bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 shadow-lg shadow-emerald-500/30"
            disabled={entryAmount > walletBalance}
          >
            <Gem className="w-4 h-4 mr-2" />
            Start Game
          </Button>
        </>
      )}

      {phase === 'playing' && (
        <>
          {/* Game Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-secondary/50 rounded-lg text-center">
              <div className="text-[10px] text-muted-foreground">Gems Found</div>
              <div className="text-lg font-bold text-emerald-400">{revealedCount}</div>
            </div>
            <div className="p-2 bg-secondary/50 rounded-lg text-center">
              <div className="text-[10px] text-muted-foreground">Multiplier</div>
              <div className="text-lg font-bold text-primary">{currentMultiplier.toFixed(2)}x</div>
            </div>
          </div>

          {/* Potential Win */}
          <motion.div
            key={potentialWin}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="p-3 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-lg border border-emerald-500/30"
          >
            <div className="text-xs text-emerald-400 mb-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Potential Win
            </div>
            <div className="text-2xl font-bold text-emerald-400">₹{potentialWin.toFixed(0)}</div>
          </motion.div>

          {/* Cash Out Button */}
          <Button
            onClick={onCashOut}
            className="w-full h-11 text-base font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
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
              'p-4 rounded-lg text-center',
              isWin 
                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30' 
                : 'bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30'
            )}
          >
            {isWin ? (
              <>
                <Gem className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <div className="text-lg font-bold text-emerald-400">You Won!</div>
                <div className="text-2xl font-bold">₹{finalAmount.toFixed(0)}</div>
              </>
            ) : (
              <>
                <Bomb className="w-10 h-10 mx-auto text-red-400 mb-2" />
                <div className="text-lg font-bold text-red-400">Game Over!</div>
                <div className="text-sm text-muted-foreground">You hit a mine</div>
              </>
            )}
          </motion.div>

          {/* Play Again Button */}
          <Button
            onClick={onReset}
            className="w-full h-11 text-base font-bold"
          >
            Play Again
          </Button>
        </>
      )}
    </div>
  );
};

export default MinesGamePanel;
