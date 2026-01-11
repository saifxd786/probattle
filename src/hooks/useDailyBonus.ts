import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

type BonusData = {
  coins: number;
  streak: number;
  lastClaimDate: string | null;
  canClaim: boolean;
};

export const useDailyBonus = () => {
  const { user } = useAuth();
  const [bonusData, setBonusData] = useState<BonusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const fetchBonusData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('daily_login_bonus')
        .select('coins, streak, last_claim_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const canClaim = !data?.last_claim_date || data.last_claim_date !== today;

      setBonusData({
        coins: data?.coins || 0,
        streak: data?.streak || 0,
        lastClaimDate: data?.last_claim_date || null,
        canClaim,
      });
    } catch (error) {
      console.error('Error fetching bonus data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBonusData();
  }, [user]);

  const claimDailyBonus = async () => {
    if (!user || isClaiming) return;

    setIsClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_daily_bonus');

      if (error) throw error;

      const result = data as {
        success: boolean;
        message: string;
        coins_earned?: number;
        total_coins?: number;
        streak?: number;
      };

      if (result.success) {
        toast({
          title: '🎉 Daily Bonus Claimed!',
          description: `+${result.coins_earned} coins! Streak: ${result.streak} days`,
        });
        setBonusData({
          coins: result.total_coins || 0,
          streak: result.streak || 1,
          lastClaimDate: new Date().toISOString().split('T')[0],
          canClaim: false,
        });
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

  const convertCoins = async (coinsToConvert: number) => {
    if (!user || isConverting) return;

    if (coinsToConvert < 100) {
      toast({
        title: 'Minimum 100 coins',
        description: 'You need at least 100 coins to convert',
        variant: 'destructive',
      });
      return;
    }

    setIsConverting(true);
    try {
      const { data, error } = await supabase.rpc('convert_coins_to_wallet', {
        coins_to_convert: coinsToConvert,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        message: string;
        coins_converted?: number;
        rupees_earned?: number;
      };

      if (result.success) {
        toast({
          title: '💰 Coins Converted!',
          description: `₹${result.rupees_earned} added to wallet!`,
        });
        await fetchBonusData();
        return true;
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
        return false;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsConverting(false);
    }
  };

  return {
    bonusData,
    isLoading,
    isClaiming,
    isConverting,
    claimDailyBonus,
    convertCoins,
    refetch: fetchBonusData,
  };
};
