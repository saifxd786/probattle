import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Flame, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDailyBonus } from '@/hooks/useDailyBonus';

const DailyBonusCard = () => {
  const { bonusData, isLoading, isClaiming, isConverting, claimDailyBonus, convertCoins, refetch } = useDailyBonus();
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [coinsInput, setCoinsInput] = useState('');
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);

  const handleClaim = async () => {
    setShowClaimAnimation(true);
    await claimDailyBonus();
    setTimeout(() => setShowClaimAnimation(false), 1500);
  };

  const handleConvert = async () => {
    const coins = parseInt(coinsInput);
    if (isNaN(coins)) return;
    
    const success = await convertCoins(coins);
    if (success) {
      setIsConvertOpen(false);
      setCoinsInput('');
    }
  };

  const convertibleCoins = bonusData ? Math.floor(bonusData.coins / 100) * 100 : 0;
  const rupeesWorth = convertibleCoins / 10;

  if (isLoading) {
    return (
      <div className="glass-card p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl" />
        
        {/* Claim animation overlay */}
        <AnimatePresence>
          {showClaimAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 flex items-center justify-center z-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                className="text-4xl"
              >
                🎉
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Coins className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm">Daily Login Bonus</h3>
                <p className="text-xs text-muted-foreground">100 coins = ₹10</p>
              </div>
            </div>
            
            {/* Streak badge */}
            {bonusData && bonusData.streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-full">
                <Flame className="w-3 h-3 text-orange-500" />
                <span className="text-xs font-bold text-orange-500">{bonusData.streak}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between bg-card/50 rounded-lg p-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Your Coins</p>
              <p className="font-display text-xl font-bold text-yellow-500">
                {bonusData?.coins || 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Worth</p>
              <p className="font-display text-lg font-bold text-green-500">
                ₹{((bonusData?.coins || 0) / 10).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {bonusData?.canClaim ? (
              <Button
                onClick={handleClaim}
                disabled={isClaiming}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-none"
                size="sm"
              >
                {isClaiming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Claim +10 Coins
                  </>
                )}
              </Button>
            ) : (
              <Button
                disabled
                className="flex-1 bg-muted text-muted-foreground border-none"
                size="sm"
              >
                ✓ Claimed Today
              </Button>
            )}
            
            <Button
              onClick={() => setIsConvertOpen(true)}
              disabled={!bonusData || bonusData.coins < 100}
              variant="outline"
              size="sm"
              className="px-3"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Convert Dialog */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              Convert Coins to Wallet
            </DialogTitle>
            <DialogDescription>
              Convert your coins to wallet balance (100 coins = ₹10)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Available Coins</p>
              <p className="font-display text-3xl font-bold text-yellow-500">
                {bonusData?.coins || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Convertible: {convertibleCoins} coins = ₹{rupeesWorth}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Coins to Convert (min 100)
              </label>
              <Input
                type="number"
                placeholder="Enter coins (multiples of 100)"
                value={coinsInput}
                onChange={(e) => setCoinsInput(e.target.value)}
                min={100}
                step={100}
                max={bonusData?.coins || 0}
              />
              {coinsInput && parseInt(coinsInput) >= 100 && (
                <p className="text-sm text-green-500 mt-2">
                  You'll get ₹{(parseInt(coinsInput) / 10).toFixed(1)} in your wallet
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCoinsInput(String(convertibleCoins))}
                disabled={convertibleCoins === 0}
                className="flex-1"
              >
                Max ({convertibleCoins})
              </Button>
              <Button
                onClick={handleConvert}
                disabled={isConverting || !coinsInput || parseInt(coinsInput) < 100 || parseInt(coinsInput) > (bonusData?.coins || 0)}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-none"
              >
                {isConverting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Convert'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DailyBonusCard;
