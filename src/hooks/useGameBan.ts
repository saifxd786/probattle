import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type GameId = 'bgmi' | 'ludo' | 'thimble' | 'freefire' | 'mines';

export const useGameBan = (gameId: GameId) => {
  const { user } = useAuth();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkBan = async () => {
      if (!user) {
        setIsBanned(false);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, banned_games, ban_reason')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.is_banned) {
          setIsBanned(true);
          setBanReason(profile.ban_reason);
        } else if (profile.banned_games && profile.banned_games.includes(gameId)) {
          setIsBanned(true);
          setBanReason(`You are banned from ${gameId}`);
        } else {
          setIsBanned(false);
          setBanReason(null);
        }
      }
      setIsLoading(false);
    };

    checkBan();
  }, [user, gameId]);

  return { isBanned, banReason, isLoading };
};
