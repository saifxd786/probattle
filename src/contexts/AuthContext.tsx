import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { generateDeviceFingerprint } from '@/utils/deviceFingerprint';

// Helper to detect device name
const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) {
    const match = ua.match(/Android.*?;\s*([^;)]+)/);
    return match ? match[1].trim() : 'Android Device';
  }
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Unknown Device';
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isRefreshing: boolean; // Indicates token refresh in progress
  lastUserId: string | null; // Preserved user ID during refresh
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Component to initialize push notifications - using forwardRef to handle ref properly
const PushNotificationInitializer = React.forwardRef<HTMLDivElement>(
  function PushNotificationInitializer(_props, _ref) {
    usePushNotifications();
    return null;
  }
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const isInitialized = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track the last known user ID for game state preservation
  const updateLastUserId = useCallback((userId: string | null) => {
    if (userId) {
      lastUserIdRef.current = userId;
    }
  }, []);

  useEffect(() => {
    // Prevent double initialization
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Get existing session FIRST (synchronous with local storage)
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      // Only update if we have a valid session
      if (existingSession?.user) {
        console.log('[Auth] Initial session found:', existingSession.user.id);
        setSession(existingSession);
        setUser(existingSession.user);
        updateLastUserId(existingSession.user.id);
      }
      setIsLoading(false);
    });

    // THEN set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession) => {
        console.log('[Auth] Auth state changed:', event, newSession?.user?.id);
        
        // Handle token refresh specifically
        if (event === 'TOKEN_REFRESHED') {
          console.log('[Auth] Token refreshed - preserving game state');
          setIsRefreshing(true);
          
          // Clear any existing refresh timeout
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          
          // Mark refresh as complete after a short delay
          refreshTimeoutRef.current = setTimeout(() => {
            setIsRefreshing(false);
            console.log('[Auth] Token refresh complete');
          }, 500);
          
          // Update session but preserve user continuity
          if (newSession?.user) {
            // Verify same user
            if (lastUserIdRef.current && lastUserIdRef.current !== newSession.user.id) {
              console.error('[Auth] CRITICAL: User ID changed during token refresh!', {
                expected: lastUserIdRef.current,
                received: newSession.user.id
              });
              // Don't update - this is an anomaly
              return;
            }
            setSession(newSession);
            setUser(newSession.user);
          }
          return;
        }
        
        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          lastUserIdRef.current = null;
          setIsRefreshing(false);
          return;
        }
        
        // Handle initial session and sign in
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          if (newSession?.user) {
            // Check for unexpected user change during active session
            if (lastUserIdRef.current && lastUserIdRef.current !== newSession.user.id) {
              console.warn('[Auth] User ID changed!', {
                old: lastUserIdRef.current,
                new: newSession.user.id
              });
            }
            setSession(newSession);
            setUser(newSession.user);
            updateLastUserId(newSession.user.id);
            
            // Log session for multi-account detection
            if (event === 'SIGNED_IN') {
              logUserSession();
            }
          }
          setIsLoading(false);
          return;
        }
        
        // Handle other events (USER_UPDATED, PASSWORD_RECOVERY, etc.)
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          updateLastUserId(newSession.user.id);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [updateLastUserId]);

  const signOut = async () => {
    console.log('[Auth] Signing out user:', user?.id);
    await supabase.auth.signOut();
  };

  // Log user session via edge function (captures real IP)
  const logUserSession = async () => {
    try {
      const fingerprint = await generateDeviceFingerprint();
      const deviceName = getDeviceName();
      
      // Use edge function to capture real IP address
      const { error } = await supabase.functions.invoke('log-session', {
        body: {
          device_fingerprint: fingerprint,
          user_agent: navigator.userAgent,
          device_name: deviceName
        }
      });
      
      if (error) {
        console.error('[Auth] Edge function error:', error);
      }
    } catch (error) {
      console.error('[Auth] Failed to log session:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      isRefreshing,
      lastUserId: lastUserIdRef.current,
      signOut 
    }}>
      <PushNotificationInitializer />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
