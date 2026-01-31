import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Generate a unique session ID for this browser tab
const generateSessionId = () => {
  const stored = sessionStorage.getItem('probattle_session_id');
  if (stored) return stored;
  
  const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  sessionStorage.setItem('probattle_session_id', newId);
  return newId;
};

const SingleSessionEnforcer = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const sessionId = useRef(generateSessionId());
  const [isValidSession, setIsValidSession] = useState(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRegistering = useRef(false);
  const hasLoggedOut = useRef(false);

  // Register this session as the active one
  const registerSession = useCallback(async () => {
    if (!user?.id || isRegistering.current) return;
    
    isRegistering.current = true;
    
    try {
      const { error } = await supabase.rpc('set_active_session', {
        _user_id: user.id,
        _session_id: sessionId.current,
      });
      
      if (error) {
        console.error('[SingleSession] Failed to register session:', error);
      } else {
        console.log('[SingleSession] Session registered:', sessionId.current.slice(-8));
      }
    } catch (err) {
      console.error('[SingleSession] Registration error:', err);
    } finally {
      isRegistering.current = false;
    }
  }, [user?.id]);

  // Check if current session is still valid
  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return true;
    
    try {
      const { data, error } = await supabase.rpc('is_session_valid', {
        _user_id: user.id,
        _session_id: sessionId.current,
      });
      
      if (error) {
        console.error('[SingleSession] Validation error:', error);
        return true; // Don't logout on error
      }
      
      return data === true;
    } catch (err) {
      console.error('[SingleSession] Validation failed:', err);
      return true;
    }
  }, [user?.id]);

  // Force logout if session is invalid
  const handleInvalidSession = useCallback(async () => {
    if (!isValidSession || hasLoggedOut.current) return;
    
    hasLoggedOut.current = true;
    setIsValidSession(false);
    
    // Clear interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    // Clear session storage to prevent auto re-login
    sessionStorage.removeItem('probattle_session_id');
    
    // Mark session as forcefully expired (AuthPage will use this to clear form)
    sessionStorage.setItem('session_force_expired', 'true');
    
    toast({
      title: '🔐 Session Expired',
      description: 'You have been logged in from another device/tab. Please login again.',
      variant: 'destructive',
      duration: 6000,
    });
    
    // Sign out locally
    await signOut();
    
    // Redirect to auth page with session_expired flag
    navigate('/auth?session_expired=true');
  }, [isValidSession, signOut, navigate]);

  // Register session on mount and when user changes
  useEffect(() => {
    if (!user?.id) {
      // Reset state when user logs out
      hasLoggedOut.current = false;
      setIsValidSession(true);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }
    
    // Generate fresh session ID if not exists
    if (!sessionStorage.getItem('probattle_session_id')) {
      sessionId.current = generateSessionId();
    }
    
    // Small delay to ensure login is complete
    const registerTimeout = setTimeout(() => {
      registerSession();
    }, 1000);
    
    // Set up periodic validation (every 10 seconds)
    checkIntervalRef.current = setInterval(async () => {
      const isValid = await validateSession();
      
      if (!isValid) {
        handleInvalidSession();
      }
    }, 10000);
    
    return () => {
      clearTimeout(registerTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [user?.id, registerSession, validateSession, handleInvalidSession]);

  // Also validate on visibility change (when user returns to tab)
  useEffect(() => {
    if (!user?.id) return;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !hasLoggedOut.current) {
        const isValid = await validateSession();
        if (!isValid) {
          handleInvalidSession();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, validateSession, handleInvalidSession]);

  // Listen for realtime changes to the profile's active_session_id
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase
      .channel(`session_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          const newSessionId = (payload.new as any)?.active_session_id;
          
          // If session ID changed and it's not ours, logout
          if (newSessionId && newSessionId !== sessionId.current && !hasLoggedOut.current) {
            console.log('[SingleSession] Session invalidated by another login');
            handleInvalidSession();
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, handleInvalidSession]);

  // This component doesn't render anything
  return null;
};

export default SingleSessionEnforcer;
