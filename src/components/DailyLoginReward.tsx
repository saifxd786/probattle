import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Calendar, Check, Lock, Loader2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const DAYS = [
  { day: 1, name: 'Mon', reward: 10, dayIndex: 1 },
  { day: 2, name: 'Tue', reward: 15, dayIndex: 2 },
  { day: 3, name: 'Wed', reward: 20, dayIndex: 3 },
  { day: 4, name: 'Thu', reward: 25, dayIndex: 4 },
  { day: 5, name: 'Fri', reward: 30, dayIndex: 5 },
  { day: 6, name: 'Sat', reward: 40, dayIndex: 6 },
  { day: 7, name: 'Sun', reward: 50, dayIndex: 0 }, // Sunday is 0 in JS
];

const DailyLoginReward = () => {
  const { user } = useAuth();
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [today, setToday] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLoginStatus();
    }
  }, [user]);

  const fetchLoginStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_weekly_login_status');
      
      if (error) throw error;
      
      const result = data as { success: boolean; today: number; claimed_days: number[] };
      
      if (result.success) {
        setToday(result.today);
        setClaimedDays(result.claimed_days || []);
      }
    } catch (error) {
      console.error('Error fetching login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const claimReward = async () => {
    if (isClaiming) return;
    
    setIsClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_weekly_login_reward');
      
      if (error) throw error;
      
      const result = data as { success: boolean; message: string; reward_amount?: number };
      
      if (result.success) {
        toast({
          title: '🎁 Reward Claimed!',
          description: `₹${result.reward_amount} added to your wallet!`,
        });
        setClaimedDays([...claimedDays, today]);
      } else {
        toast({
          title: 'Info',
          description: result.message,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const canClaimToday = !claimedDays.includes(today);
  const todayDayInfo = DAYS.find(d => d.dayIndex === today);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-primary" />
          Daily Login Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 7-Day Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day, index) => {
            const isClaimed = claimedDays.includes(day.dayIndex);
            const isToday = day.dayIndex === today;
            const isPast = !isToday && !isClaimed && (
              (today > day.dayIndex && day.dayIndex !== 0) ||
              (today === 0 && day.dayIndex !== 0)
            );
            
            return (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative flex flex-col items-center p-2 rounded-xl transition-all ${
                  isToday
                    ? isClaimed
                      ? 'bg-green-500/20 border-2 border-green-500/50'
                      : 'bg-primary/20 border-2 border-primary ring-2 ring-primary/30'
                    : isClaimed
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-secondary/30 border border-border/50'
                }`}
              >
                {/* Day Name */}
                <span className={`text-[10px] font-medium mb-1 ${
                  isToday ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {day.name}
                </span>
                
                {/* Reward Box */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${
                  isClaimed
                    ? 'bg-green-500/20'
                    : isToday
                    ? 'bg-gradient-to-br from-primary/30 to-accent/30'
                    : 'bg-secondary/50'
                }`}>
                  {isClaimed ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : isPast ? (
                    <Lock className="w-3 h-3 text-muted-foreground/50" />
                  ) : (
                    <Gift className={`w-4 h-4 ${isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                </div>
                
                {/* Reward Amount */}
                <span className={`text-[10px] font-bold ${
                  isClaimed ? 'text-green-500' : isToday ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  ₹{day.reward}
                </span>
                
                {/* Today Indicator */}
                {isToday && !isClaimed && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Claim Button */}
        {canClaimToday && todayDayInfo && (
          <Button
            onClick={claimReward}
            disabled={isClaiming}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 font-display"
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Claim ₹{todayDayInfo.reward} Today
              </>
            )}
          </Button>
        )}

        {!canClaimToday && (
          <div className="text-center py-2">
            <p className="text-sm text-green-500 flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              Today's reward claimed!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Come back tomorrow for more rewards
            </p>
          </div>
        )}

        {/* Total Possible */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Weekly Total</span>
          <span className="text-sm font-bold text-gradient">₹190</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyLoginReward;
