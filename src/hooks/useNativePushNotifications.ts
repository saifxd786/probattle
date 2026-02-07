import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useNativePushNotifications = () => {
  const { user } = useAuth();
  const isRegistering = useRef(false);

  // Save FCM token to database
  const saveToken = useCallback(async (token: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);
      
      if (error) {
        console.error('[NativePush] Failed to save token:', error);
      } else {
        console.log('[NativePush] Token saved successfully');
      }
    } catch (err) {
      console.error('[NativePush] Error saving token:', err);
    }
  }, [user]);

  // Register for push notifications
  const registerPushNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[NativePush] Not a native platform, skipping');
      return;
    }

    if (isRegistering.current) return;
    isRegistering.current = true;

    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('[NativePush] Permission not granted');
        isRegistering.current = false;
        return;
      }

      // Register with FCM
      await PushNotifications.register();
      console.log('[NativePush] Registered for push notifications');
    } catch (err) {
      console.error('[NativePush] Registration error:', err);
    } finally {
      isRegistering.current = false;
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    // Listen for registration success
    const registrationListener = PushNotifications.addListener('registration', (token: Token) => {
      console.log('[NativePush] FCM Token:', token.value);
      saveToken(token.value);
    });

    // Listen for registration errors
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('[NativePush] Registration error:', error);
    });

    // Listen for incoming notifications (foreground)
    const notificationListener = PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[NativePush] Notification received:', notification);
      // You can show a local notification or update UI here
    });

    // Listen for notification taps
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[NativePush] Notification action:', action);
      // Handle notification tap - navigate to relevant screen
      const data = action.notification.data;
      if (data?.route) {
        window.location.href = data.route;
      }
    });

    // Register for notifications
    registerPushNotifications();

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      notificationListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [user, registerPushNotifications, saveToken]);

  return { registerPushNotifications };
};

export default useNativePushNotifications;
