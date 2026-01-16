import { motion } from 'framer-motion';
import { useState } from 'react';
import { Calendar, Check, Lock, Loader2, Gift, Coins, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyBonus } from '@/hooks/useDailyBonus';
import { useAuth } from '@/contexts/AuthContext';
import ConfettiCelebration from './ConfettiCelebration';

const DAYS = [
  { day: 1, name: 'Mon', coins: 10 },
  { day: 2, name: 'Tue', coins: 10 },
  { day: 3, name: 'Wed', coins: 10 },
  { day: 4, name: 'Thu', coins: 10 },
  { day: 5, name: 'Fri', coins: 10 },
  { day: 6, name: 'Sat', coins: 10 },
  { day: 7, name: 'Sun', coins: 10, bonus: 50 },
];

const DailyLoginReward = () => {
  const { user } = useAuth();
  const { bonusData, isLoading, isClaiming, isConverting, claimDailyBonus, convertCoins } = useDailyBonus();
  const [convertAmount, setConvertAmount] = useState(100);
  const [showConfetti, setShowConfetti] = useState(false);

  if (!user) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Login to claim daily rewards</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const streak = bonusData?.streak || 0;
  const totalCoins = bonusData?.coins || 0;
  const canClaim = bonusData?.canClaim || false;

  const handleConvert = async () => {
    await convertCoins(convertAmount);
  };

  const handleClaimBonus = async () => {
    const isStreakBonus = streak === 6 && canClaim; // Will be day 7 after claiming
    await claimDailyBonus();
    if (isStreakBonus) {
      setShowConfetti(true);
    }
  };

  return (
    <>
      <ConfettiCelebration isActive={showConfetti} onComplete={() => setShowConfetti(false)} />
      <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Daily Login Rewards
          </div>
          <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-500">{totalCoins}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 7-Day Streak Bonus Info */}
        {streak >= 6 && canClaim && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-400">🔥 7-Day Streak Bonus!</p>
              <p className="text-xs text-orange-300/80">Claim today for +50 bonus coins!</p>
            </div>
          </motion.div>
        )}

        {/* 7-Day Streak Display */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day, index) => {
            const dayNum = index + 1;
            const isClaimed = streak >= dayNum;
            const isNext = streak + 1 === dayNum && canClaim;
            const isSundayBonus = dayNum === 7 && streak === 6 && canClaim;
            
            return (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative flex flex-col items-center p-2 rounded-xl transition-all ${
                  isSundayBonus
                    ? 'bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-2 border-orange-500 ring-2 ring-orange-500/30'
                    : isNext
                    ? 'bg-primary/20 border-2 border-primary ring-2 ring-primary/30'
                    : isClaimed
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-secondary/30 border border-border/50'
                }`}
              >
                {/* Day Name */}
                <span className={`text-[10px] font-medium mb-1 ${
                  isSundayBonus ? 'text-orange-400' : isNext ? 'text-primary' : isClaimed ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  {day.name}
                </span>
                
                {/* Reward Box */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${
                  isClaimed
                    ? 'bg-green-500/20'
                    : isSundayBonus
                    ? 'bg-gradient-to-br from-orange-500/30 to-yellow-500/30'
                    : isNext
                    ? 'bg-gradient-to-br from-primary/30 to-accent/30'
                    : 'bg-secondary/50'
                }`}>
                  {isClaimed ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : isSundayBonus ? (
                    <Flame className="w-4 h-4 text-orange-500" />
                  ) : isNext ? (
                    <Gift className="w-4 h-4 text-primary" />
                  ) : (
                    <Lock className="w-3 h-3 text-muted-foreground/50" />
                  )}
                </div>
                
                {/* Coins Amount */}
                <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                  isClaimed ? 'text-green-500' : isSundayBonus ? 'text-orange-400' : isNext ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  <Coins className="w-3 h-3" />
                  {day.coins}
                </span>
                
                {/* Bonus Badge for Sunday */}
                {day.bonus && (
                  <span className="text-[8px] font-bold text-orange-400 mt-0.5">+{day.bonus}</span>
                )}
                
                {/* Next Indicator */}
                {(isNext || isSundayBonus) && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isSundayBonus ? 'bg-orange-500' : 'bg-primary'}`}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Claim Button */}
        {canClaim && (
          <Button
            onClick={handleClaimBonus}
            disabled={isClaiming}
            className={`w-full font-display ${
              streak === 6 
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:opacity-90' 
                : 'bg-gradient-to-r from-primary to-accent hover:opacity-90'
            }`}
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : streak === 6 ? (
              <>
                <Flame className="w-4 h-4 mr-2" />
                Claim 10 + 50 Bonus Coins!
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Claim 10 Coins Today
              </>
            )}
          </Button>
        )}

        {!canClaim && (
          <div className="text-center py-2">
            <p className="text-sm text-green-500 flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              Today's reward claimed!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Come back tomorrow for more coins
            </p>
          </div>
        )}

        {/* Convert Section */}
        {totalCoins >= 100 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Convert to Wallet</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">
                100 Coins = ₹10
              </span>
            </div>
            <div className="flex gap-2">
              <select
                value={convertAmount}
                onChange={(e) => setConvertAmount(Number(e.target.value))}
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm"
              >
                {[100, 200, 300, 400, 500].filter(v => v <= totalCoins).map(value => (
                  <option key={value} value={value}>
                    {value} Coins = ₹{value / 10}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleConvert}
                disabled={isConverting || totalCoins < 100}
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Convert'}
              </Button>
            </div>
          </div>
        )}

        {/* Streak & Info */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Flame className={`w-4 h-4 ${streak >= 5 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground">Streak</span>
            <span className="text-sm font-bold text-primary">{streak}/7 days</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {streak === 7 ? '🎉 Max streak!' : `${7 - streak} days to bonus`}
          </span>
        </div>
      </CardContent>
    </Card>
    </>
  );
};

export default DailyLoginReward;
