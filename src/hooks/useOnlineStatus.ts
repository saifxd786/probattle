import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnlineUser {
  id: string;
  online_at: string;
  username?: string;
}

export const useOnlineStatus = (userIds: string[]) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || userIds.length === 0) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        
        Object.keys(state).forEach((key) => {
          if (userIds.includes(key)) {
            online.add(key);
          }
        });
        
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, async ({ key, newPresences }) => {
        if (userIds.includes(key)) {
          setOnlineUsers(prev => new Set([...prev, key]));
          
          // Show notification when friend comes online
          if (key !== user.id && 'Notification' in window && Notification.permission === 'granted') {
            // Get friend's username
            const { data: friendProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', key)
              .maybeSingle();
            
            if (friendProfile) {
              const notification = new Notification('👋 Friend Online!', {
                body: `${friendProfile.username} is now online`,
                icon: '/pwa-192x192.png',
                tag: `friend-online-${key}`,
              });
              
              notification.onclick = () => {
                window.focus();
                window.location.href = '/friends';
                notification.close();
              };
              
              setTimeout(() => notification.close(), 8000);
            }
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userIds.join(',')]);

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);

  return { onlineUsers, isOnline };
};
