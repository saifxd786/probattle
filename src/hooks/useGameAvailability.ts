import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface GameAvailability {
  bgmi: boolean;
  ludo: boolean;
  thimble: boolean;
  mines: boolean;
  freefire: boolean;
}

const DEFAULT_AVAILABILITY: GameAvailability = {
  bgmi: true,
  ludo: true,
  thimble: true,
  mines: true,
  freefire: false,
};

export const useGameAvailability = () => {
  const [availability, setAvailability] = useState<GameAvailability>(DEFAULT_AVAILABILITY);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch game availability from database
  const fetchAvailability = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'game_availability')
        .maybeSingle();

      if (error) {
        console.error('[GameAvailability] Error fetching:', error);
        return;
      }

      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const parsed = data.value as Record<string, boolean>;
        setAvailability({
          bgmi: parsed.bgmi ?? true,
          ludo: parsed.ludo ?? true,
          thimble: parsed.thimble ?? true,
          mines: parsed.mines ?? true,
          freefire: parsed.freefire ?? false,
        });
      }
    } catch (err) {
      console.error('[GameAvailability] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Update a specific game's availability
  const updateGameAvailability = useCallback(async (
    game: keyof GameAvailability, 
    enabled: boolean,
    callbacks?: { onSuccess?: () => void; onError?: (error: Error) => void }
  ) => {
    setIsUpdating(true);
    
    const newAvailability = { ...availability, [game]: enabled };
    
    // Optimistic update
    setAvailability(newAvailability);
    
    try {
      // First check if the record exists
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', 'game_availability')
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing - cast to Json type
        const result = await supabase
          .from('app_settings')
          .update({ 
            value: newAvailability as unknown as Json, 
            updated_at: new Date().toISOString() 
          })
          .eq('key', 'game_availability');
        error = result.error;
      } else {
        // Insert new - cast to Json type
        const result = await supabase
          .from('app_settings')
          .insert({ 
            key: 'game_availability', 
            value: newAvailability as unknown as Json 
          });
        error = result.error;
      }

      if (error) throw error;
      
      callbacks?.onSuccess?.();
    } catch (err) {
      // Rollback on error
      setAvailability(availability);
      console.error('[GameAvailability] Update error:', err);
      callbacks?.onError?.(err as Error);
    } finally {
      setIsUpdating(false);
    }
  }, [availability]);

  // Check if a specific game is available
  const isGameAvailable = useCallback((game: keyof GameAvailability): boolean => {
    return availability[game] ?? false;
  }, [availability]);

  return {
    availability,
    isLoading,
    isUpdating,
    updateGameAvailability,
    isGameAvailable,
    refetch: fetchAvailability
  };
};
