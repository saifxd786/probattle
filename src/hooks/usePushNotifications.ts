import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePushNotifications = () => {
  const { user } = useAuth();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/pwa-192x192.png',
        tag: 'probattle-notification',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Request permission on mount
    requestPermission();

    // Subscribe to realtime notifications
    const notificationChannel = supabase
      .channel('push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as {
            title: string;
            message: string;
            type: string;
          };

          // Show browser notification
          showNotification(notification.title, notification.message);
        }
      )
      .subscribe();

    // Subscribe to support message replies
    const supportChannel = supabase
      .channel('support-push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        async (payload) => {
          const message = payload.new as {
            ticket_id: string;
            sender_type: string;
            message: string;
          };

          // Only notify if it's an admin reply
          if (message.sender_type === 'admin') {
            // Check if this ticket belongs to the current user
            const { data: ticket } = await supabase
              .from('support_tickets')
              .select('user_id')
              .eq('id', message.ticket_id)
              .single();

            if (ticket && ticket.user_id === user.id) {
              showNotification(
                '💬 Support Reply',
                message.message.substring(0, 100) + (message.message.length > 100 ? '...' : '')
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(supportChannel);
    };
  }, [user, requestPermission, showNotification]);

  return { requestPermission, showNotification };
};

export default usePushNotifications;
