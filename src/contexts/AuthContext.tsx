import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { logDeviceToServer } from '@/utils/deviceInfo';
import { isPWAStandalone } from '@/utils/pwaAuthStorage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isRefreshing: boolean; // Indicates token refresh in progress
  lastUserId: string | null; // Preserved user ID during refresh
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Component to initialize push notifications
const PushNotificationInitializer = () => {
  usePushNotifications();
  return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const lastUserIdRef = useRef<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track the last known user ID for game state preservation
  const updateLastUserId = useCallback((userId: string | null) => {
    if (userId) {
      lastUserIdRef.current = userId;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Cleanup any existing subscription first (handles strict mode)
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    // Safety timeout - reduced to 3 seconds for faster fallback
    loadingTimeoutRef.current = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('[Auth] Safety timeout - forcing load complete');
        setIsLoading(false);
      }
    }, 3000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession) => {
        if (!mounted) return;
        
        console.log('[Auth] Event:', event, newSession?.user?.id?.slice(0, 8));
        
        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          setIsRefreshing(true);
          if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = setTimeout(() => {
            if (mounted) setIsRefreshing(false);
          }, 300);
          
          if (newSession?.user) {
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
          setIsLoading(false);
          return;
        }
        
        // Handle initial session and sign in
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          if (newSession?.user) {
            setSession(newSession);
            setUser(newSession.user);
            updateLastUserId(newSession.user.id);
            
            if (event === 'SIGNED_IN') {
              logUserSession();
            }
          } else {
            setSession(null);
            setUser(null);
          }
          setIsLoading(false);
          return;
        }
        
        // Handle other events
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          updateLastUserId(newSession.user.id);
        }
        setIsLoading(false);
      }
    );

    subscriptionRef.current = subscription;

    // Get existing session
    const initSession = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (existingSession?.user) {
          console.log('[Auth] Found existing session:', existingSession.user.id.slice(0, 8));
          setSession(existingSession);
          setUser(existingSession.user);
          updateLastUserId(existingSession.user.id);
          setIsLoading(false);
          return;
        }
        
        // No session - set loading false immediately
        console.log('[Auth] No session found');
        setIsLoading(false);
      } catch (error) {
        console.error('[Auth] Session check failed:', error);
        if (mounted) setIsLoading(false);
      }
    };
    
    initSession();

    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [updateLastUserId]);

  const signOut = async () => {
    console.log('[Auth] Signing out user:', user?.id);
    await supabase.auth.signOut();
  };

  // Log user session via edge function (captures real IP and geolocation)
  const logUserSession = async () => {
    try {
      // Use the comprehensive device logging (for login sessions, not registration)
      const result = await logDeviceToServer(supabase, false);
      
      if (result.success) {
        console.log('[Auth] Login session logged', result.location ? `from ${result.location}` : '');
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
