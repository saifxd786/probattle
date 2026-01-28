import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
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
  const isInitialized = React.useRef(false);

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
      }
      setIsLoading(false);
    });

    // THEN set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[Auth] Auth state changed:', event, newSession?.user?.id);
        
        // Validate session before updating
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else if (newSession?.user) {
          // Verify user ID consistency
          setSession(prevSession => {
            if (prevSession?.user?.id && prevSession.user.id !== newSession.user.id) {
              console.warn('[Auth] User ID changed unexpectedly!', {
                old: prevSession.user.id,
                new: newSession.user.id
              });
            }
            return newSession;
          });
          setUser(newSession.user);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    console.log('[Auth] Signing out user:', user?.id);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
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
