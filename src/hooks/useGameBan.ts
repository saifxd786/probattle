import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type GameId = 'bgmi' | 'ludo' | 'thimble' | 'freefire';

export const useGameBan = (gameId: GameId) => {
  const { user } = useAuth();
  const [isBanned, setIsBanned] = useState(false);
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
        .select('is_banned, banned_games')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        // Full ban takes precedence
        if (profile.is_banned) {
          setIsBanned(true);
        } else if (profile.banned_games && profile.banned_games.includes(gameId)) {
          setIsBanned(true);
        } else {
          setIsBanned(false);
        }
      }
      setIsLoading(false);
    };

    checkBan();
  }, [user, gameId]);

  return { isBanned, isLoading };
};
