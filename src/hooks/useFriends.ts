import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
  user_code: string | null;
  is_online?: boolean;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: Friend;
  receiver?: Friend;
}

export const useFriends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;

    try {
      // Fetch friendships where current user is either user1 or user2
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) throw error;

      // Get friend IDs
      const friendIds = friendships?.map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      ) || [];

      if (friendIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, user_code')
          .in('id', friendIds);

        if (profilesError) throw profilesError;
        setFriends(profiles || []);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchRequests = async () => {
    if (!user) return;

    try {
      // Fetch pending requests received
      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;

      // Get sender profiles
      if (received && received.length > 0) {
        const senderIds = received.map(r => r.sender_id);
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, user_code')
          .in('id', senderIds);

        const requestsWithSenders = received.map(r => ({
          ...r,
          sender: senderProfiles?.find(p => p.id === r.sender_id)
        }));
        setPendingRequests(requestsWithSenders);
      } else {
        setPendingRequests([]);
      }

      // Fetch sent requests
      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;
      setSentRequests(sent || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const sendFriendRequest = async (userCode: string) => {
    if (!user) return { success: false, error: 'Not logged in' };

    try {
      // Find user by code
      const { data: targetUser, error: findError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('user_code', userCode.toUpperCase())
        .single();

      if (findError || !targetUser) {
        return { success: false, error: 'User not found' };
      }

      if (targetUser.id === user.id) {
        return { success: false, error: 'Cannot add yourself' };
      }

      // Check if already friends
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUser.id}),and(user1_id.eq.${targetUser.id},user2_id.eq.${user.id})`)
        .single();

      if (existing) {
        return { success: false, error: 'Already friends' };
      }

      // Check for existing request
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${user.id})`)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        return { success: false, error: 'Request already pending' };
      }

      // Send request
      const { error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetUser.id
        });

      if (insertError) throw insertError;

      toast({
        title: "Request Sent!",
        description: `Friend request sent to ${targetUser.username}`,
      });

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      console.error('Error sending request:', error);
      return { success: false, error: error.message };
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Friend Added!",
        description: "You are now friends",
      });

      await Promise.all([fetchFriends(), fetchRequests()]);
      return { success: true };
    } catch (error: any) {
      console.error('Error accepting request:', error);
      return { success: false, error: error.message };
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return { success: false, error: 'Not logged in' };

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user.id})`);

      if (error) throw error;

      toast({
        title: "Friend Removed",
        description: "Friend has been removed",
      });

      await fetchFriends();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([fetchFriends(), fetchRequests()]).finally(() => {
        setIsLoading(false);
      });

      // Subscribe to realtime updates
      const channel = supabase
        .channel('friends-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` },
          () => fetchRequests()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships' },
          () => fetchFriends()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    refetch: () => Promise.all([fetchFriends(), fetchRequests()])
  };
};
