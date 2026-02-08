import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Import Ludo avatars
import ludoAvatarRed from '@/assets/ludo-avatar-red.png';
import ludoAvatarBlue from '@/assets/ludo-avatar-blue.png';
import ludoAvatarGreen from '@/assets/ludo-avatar-green.png';
import ludoAvatarYellow from '@/assets/ludo-avatar-yellow.png';

export const LUDO_AVATARS = [ludoAvatarRed, ludoAvatarBlue, ludoAvatarGreen, ludoAvatarYellow];

export interface PublicChallenge {
  id: string;
  creator_id: string;
  entry_amount: number;
  player_mode: 2 | 4;
  status: string;
  room_code: string | null;
  matched_user_id: string | null;
  created_at: string;
  expires_at: string;
  creator?: {
    username: string;
    avatar_url: string | null;
  };
  waitingTime: number; // Calculated in seconds
  isRealPlayer?: boolean; // Flag to identify real player challenges
  canConnectWithBot?: boolean; // True after 7 seconds waiting
}

// Custom amounts: 10, 20, 30, 40, 50... up to 2000
export const CUSTOM_AMOUNTS = Array.from({ length: 200 }, (_, i) => (i + 1) * 10);

export const usePublicLudoChallenge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myChallenge, setMyChallenge] = useState<PublicChallenge | null>(null);

  // Fetch all waiting challenges
  const fetchChallenges = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('ludo_public_challenges')
        .select('*')
        .eq('status', 'waiting')
        .gt('expires_at', now)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Get creator profiles
        const creatorIds = [...new Set(data.map(c => c.creator_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', creatorIds);

        const nowMs = Date.now();
        const BOT_DELAY_SECONDS = 7; // Wait 7s before connecting real challenges with bots
        
        const challengesWithProfiles: PublicChallenge[] = data.map(c => {
          const waitingTime = Math.floor((nowMs - new Date(c.created_at).getTime()) / 1000);
          return {
            ...c,
            player_mode: c.player_mode as 2 | 4,
            creator: profiles?.find(p => p.id === c.creator_id),
            waitingTime,
            isRealPlayer: true, // Mark as real player challenge
            canConnectWithBot: waitingTime >= BOT_DELAY_SECONDS, // Can connect with bot after 7s
          };
        });

        setChallenges(challengesWithProfiles);

        // Check if user has an active challenge
        if (user) {
          const userChallenge = challengesWithProfiles.find(c => c.creator_id === user.id);
          setMyChallenge(userChallenge || null);
        } else {
          setMyChallenge(null);
        }
      } else {
        setChallenges([]);
        // CRITICAL: Always clear myChallenge when no challenges exist
        setMyChallenge(null);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  }, [user]);

  // Create a new challenge
  const createChallenge = async (entryAmount: number, playerMode: 2 | 4) => {
    if (!user) return { success: false, error: 'Not logged in' };

    setIsLoading(true);
    try {
      // Check wallet balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.wallet_balance || 0) < entryAmount) {
        toast({
          title: "Insufficient Balance",
          description: "Please add money to your wallet",
          variant: "destructive",
        });
        return { success: false, error: 'Insufficient balance' };
      }

      // Check if user already has a NON-EXPIRED waiting challenge
      // (The join list filters out expired challenges, so this check must match that behavior)
      const now = new Date().toISOString();
      const { data: existing, error: existingError } = await supabase
        .from('ludo_public_challenges')
        .select('id')
        .eq('creator_id', user.id)
        .eq('status', 'waiting')
        .gt('expires_at', now)
        .limit(1);

      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        toast({
          title: "Challenge Already Active",
          description: "You already have an active challenge",
          variant: "destructive",
        });
        return { success: false, error: 'Already have active challenge' };
      }

      const { data, error } = await supabase
        .from('ludo_public_challenges')
        .insert({
          creator_id: user.id,
          entry_amount: entryAmount,
          player_mode: playerMode,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Challenge Created!",
        description: "Waiting for opponent to join...",
      });

      await fetchChallenges();
      return { success: true, challengeId: data.id };
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Accept/join a challenge
  const acceptChallenge = async (challengeId: string) => {
    if (!user) return { success: false, error: 'Not logged in' };

    setIsLoading(true);
    try {
      // Get challenge details with creator profile
      const { data: challenge } = await supabase
        .from('ludo_public_challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('status', 'waiting')
        .single();

      if (!challenge) {
        toast({
          title: "Challenge Not Found",
          description: "This challenge may have expired or been taken",
          variant: "destructive",
        });
        return { success: false, error: 'Challenge not found' };
      }

      if (challenge.creator_id === user.id) {
        toast({
          title: "Cannot Join",
          description: "You cannot join your own challenge",
          variant: "destructive",
        });
        return { success: false, error: 'Cannot join own challenge' };
      }

      // Check wallet balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.wallet_balance || 0) < challenge.entry_amount) {
        toast({
          title: "Insufficient Balance",
          description: "Please add money to your wallet",
          variant: "destructive",
        });
        return { success: false, error: 'Insufficient balance' };
      }

      const playerMode = challenge.player_mode as 2 | 4;

      // For 1v1v1 and 1v1v1v1 (playerMode > 2), use bot-based matches
      // Because ludo_rooms only supports 2-player (1v1) games
      if (playerMode > 2) {
        // Get creator profile for preset bot info
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', challenge.creator_id)
          .single();

        // Cancel the challenge (joiner will start bot game locally)
        await supabase
          .from('ludo_public_challenges')
          .update({
            status: 'matched',
            matched_user_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', challengeId)
          .eq('status', 'waiting');

        toast({
          title: "Challenge Accepted!",
          description: "Starting the game...",
        });

        // Return special flag for bot game
        return { 
          success: true, 
          isBotGame: true,
          playerMode,
          entryAmount: challenge.entry_amount,
          creatorName: creatorProfile?.username || 'Player',
          creatorAvatar: creatorProfile?.avatar_url || LUDO_AVATARS[0],
        };
      }

      // 1v1 mode: Create Ludo room (Friend system)
      const { data: roomData, error: roomError } = await supabase
        .rpc('create_ludo_room', { p_entry_amount: challenge.entry_amount });

      if (roomError) throw roomError;

      const roomResult = roomData as { 
        success: boolean; 
        room_id?: string;
        room_code?: string; 
        entry_amount?: number;
        reward_amount?: number;
        error?: string;
      };
      if (!roomResult.success || !roomResult.room_id || !roomResult.room_code) {
        throw new Error(roomResult.error || 'Failed to create room');
      }

      // Update challenge as matched
      const { error: updateError } = await supabase
        .from('ludo_public_challenges')
        .update({
          status: 'matched',
          matched_user_id: user.id,
          room_code: roomResult.room_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', challengeId)
        .eq('status', 'waiting');

      if (updateError) throw updateError;

      toast({
        title: "Challenge Accepted!",
        description: "Starting the game...",
      });

      return { 
        success: true, 
        roomId: roomResult.room_id,
        roomCode: roomResult.room_code,
        entryAmount: roomResult.entry_amount || challenge.entry_amount,
        rewardAmount: roomResult.reward_amount || (challenge.entry_amount * (challenge.player_mode === 4 ? 3 : 1.5)),
      };
    } catch (error: any) {
      console.error('Error accepting challenge:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel my challenge (silent = true skips toast, used for bot auto-connection)
  const cancelChallenge = async (silent: boolean = false) => {
    if (!user || !myChallenge) return { success: false };

    try {
      const { error } = await supabase
        .from('ludo_public_challenges')
        .update({ status: 'cancelled' })
        .eq('id', myChallenge.id)
        .eq('creator_id', user.id);

      if (error) throw error;

      setMyChallenge(null);
      await fetchChallenges();
      
      // Only show toast if not silent (user manually cancelled)
      if (!silent) {
        toast({
          title: "Challenge Cancelled",
          description: "Your challenge has been cancelled",
        });
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling challenge:', error);
      return { success: false, error: error.message };
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    fetchChallenges();

    const channel = supabase
      .channel('public-ludo-challenges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ludo_public_challenges' },
        (payload) => {
          console.log('[PublicChallenge] Realtime update:', payload);
          fetchChallenges();

          // If my challenge was matched, notify
          if (
            payload.eventType === 'UPDATE' &&
            payload.new.status === 'matched' &&
            payload.new.creator_id === user?.id
          ) {
            toast({
              title: "🎮 Opponent Found!",
              description: "Someone accepted your challenge!",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChallenges, toast]);

  // Update waiting times every second (also updates canConnectWithBot flag)
  useEffect(() => {
    const BOT_DELAY_SECONDS = 7;
    const interval = setInterval(() => {
      setChallenges(prev => prev.map(c => {
        const newWaitingTime = c.waitingTime + 1;
        return {
          ...c,
          waitingTime: newWaitingTime,
          canConnectWithBot: c.isRealPlayer ? newWaitingTime >= BOT_DELAY_SECONDS : undefined,
        };
      }));
      
      // CRITICAL: Also update myChallenge's waiting time so the 7s animation triggers
      setMyChallenge(prev => {
        if (!prev) return null;
        const newWaitingTime = prev.waitingTime + 1;
        return {
          ...prev,
          waitingTime: newWaitingTime,
          canConnectWithBot: prev.isRealPlayer ? newWaitingTime >= BOT_DELAY_SECONDS : undefined,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    challenges,
    myChallenge,
    isLoading,
    createChallenge,
    acceptChallenge,
    cancelChallenge,
    refetch: fetchChallenges,
  };
};
