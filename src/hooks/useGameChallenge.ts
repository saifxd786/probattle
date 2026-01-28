import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  game_type: string;
  entry_amount: number;
  status: string;
  room_id: string | null;
  expires_at: string;
  created_at: string;
  challenger?: {
    username: string;
    avatar_url: string | null;
  };
  challenged?: {
    username: string;
    avatar_url: string | null;
  };
}

export const useGameChallenge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingChallenges, setPendingChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChallenges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('game_challenges')
        .select('*')
        .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;

      if (data && data.length > 0) {
        // Get user profiles
        const userIds = [...new Set(data.flatMap(c => [c.challenger_id, c.challenged_id]))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const challengesWithProfiles = data.map(c => ({
          ...c,
          challenger: profiles?.find(p => p.id === c.challenger_id),
          challenged: profiles?.find(p => p.id === c.challenged_id)
        }));

        setPendingChallenges(challengesWithProfiles);
      } else {
        setPendingChallenges([]);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  };

  const sendChallenge = async (friendId: string, gameType: string, entryAmount: number) => {
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
        return { success: false, error: 'Insufficient balance' };
      }

      // Check for existing pending challenge
      const { data: existing } = await supabase
        .from('game_challenges')
        .select('id')
        .eq('challenger_id', user.id)
        .eq('challenged_id', friendId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existing) {
        return { success: false, error: 'Challenge already sent' };
      }

      const { data, error } = await supabase
        .from('game_challenges')
        .insert({
          challenger_id: user.id,
          challenged_id: friendId,
          game_type: gameType,
          entry_amount: entryAmount
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Challenge Sent!",
        description: "Waiting for friend to accept...",
      });

      await fetchChallenges();
      return { success: true, challengeId: data.id };
    } catch (error: any) {
      console.error('Error sending challenge:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const acceptChallenge = async (challengeId: string) => {
    if (!user) return { success: false, error: 'Not logged in' };

    setIsLoading(true);
    try {
      const { data: challenge } = await supabase
        .from('game_challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (!challenge) {
        return { success: false, error: 'Challenge not found' };
      }

      if (challenge.challenged_id !== user.id) {
        return { success: false, error: 'Not authorized' };
      }

      // Check wallet balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.wallet_balance || 0) < challenge.entry_amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      // For Ludo, create a room
      if (challenge.game_type === 'ludo') {
        const { data: roomData, error: roomError } = await supabase
          .rpc('create_ludo_room', { p_entry_amount: challenge.entry_amount });

        if (roomError) throw roomError;
        
        const roomResult = roomData as { success: boolean; room_code?: string; error?: string };
        if (!roomResult.success) {
          throw new Error(roomResult.error);
        }

        // Update challenge with room info
        await supabase
          .from('game_challenges')
          .update({ status: 'accepted', room_id: roomResult.room_code })
          .eq('id', challengeId);

        // Notify challenger via realtime (they'll see the update)
        toast({
          title: "Challenge Accepted!",
          description: "Starting the game...",
        });

        // Navigate to ludo with room code
        navigate(`/ludo?room=${roomResult.room_code}&challenge=${challengeId}`);
        return { success: true, roomCode: roomResult.room_code };
      }

      // For other games
      await supabase
        .from('game_challenges')
        .update({ status: 'accepted' })
        .eq('id', challengeId);

      toast({
        title: "Challenge Accepted!",
        description: "Starting the game...",
      });

      navigate(`/${challenge.game_type}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error accepting challenge:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const rejectChallenge = async (challengeId: string) => {
    try {
      await supabase
        .from('game_challenges')
        .update({ status: 'rejected' })
        .eq('id', challengeId);

      await fetchChallenges();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const cancelChallenge = async (challengeId: string) => {
    try {
      await supabase
        .from('game_challenges')
        .update({ status: 'expired' })
        .eq('id', challengeId)
        .eq('challenger_id', user?.id);

      await fetchChallenges();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    if (user) {
      fetchChallenges();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('challenges-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_challenges' },
          (payload) => {
            fetchChallenges();
            
            // Show toast for incoming challenges
            if (payload.eventType === 'INSERT' && payload.new.challenged_id === user.id) {
              toast({
                title: "🎮 New Challenge!",
                description: "Someone challenged you to a game!",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    pendingChallenges,
    isLoading,
    sendChallenge,
    acceptChallenge,
    rejectChallenge,
    cancelChallenge,
    refetch: fetchChallenges
  };
};
