import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, BellRing, Shield, Gamepad2, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Pages that should bypass the notification gate
const EXCLUDED_PATHS = ['/auth', '/admin', '/agent', '/terms', '/fair-play', '/rules', '/faqs', '/install'];

interface NotificationPermissionGateProps {
  children: React.ReactNode;
}

const NotificationPermissionGate = ({ children }: NotificationPermissionGateProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showGate, setShowGate] = useState(false);

  // Check if current path should bypass the gate
  const isExcludedPath = EXCLUDED_PATHS.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    const checkPermission = async () => {
      // Skip gate for excluded paths or non-logged-in users
      if (!user || isExcludedPath) {
        setShowGate(false);
        setHasPermission(true);
        return;
      }

      // Check if user already granted permission in database
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_permission_granted')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.notification_permission_granted) {
        setHasPermission(true);
        setShowGate(false);
        return;
      }

      // Check browser permission status
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          // Update database and allow access
          await supabase
            .from('profiles')
            .update({ notification_permission_granted: true })
            .eq('id', user.id);
          setHasPermission(true);
          setShowGate(false);
        } else if (Notification.permission === 'denied') {
          // Permission was denied, still show gate with instructions
          setHasPermission(false);
          setShowGate(true);
        } else {
          // Permission not yet requested
          setHasPermission(false);
          setShowGate(true);
        }
      } else {
        // Notifications not supported, skip gate
        await supabase
          .from('profiles')
          .update({ notification_permission_granted: true })
          .eq('id', user.id);
        setHasPermission(true);
        setShowGate(false);
      }
    };

    checkPermission();
  }, [user, isExcludedPath]);

  const requestPermission = async () => {
    if (!user) return;
    setIsRequesting(true);

    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          // Update database
          await supabase
            .from('profiles')
            .update({ notification_permission_granted: true })
            .eq('id', user.id);
          
          setHasPermission(true);
          setShowGate(false);

          // Show welcome notification
          new Notification('🎮 Welcome to ProBattle!', {
            body: 'You will now receive important game updates and friend requests!',
            icon: '/pwa-192x192.png',
          });
        } else {
          // Permission denied
          setHasPermission(false);
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  // Loading state
  if (hasPermission === null && user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Bell className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  // Show gate if needed
  if (showGate && user) {
    const isDenied = 'Notification' in window && Notification.permission === 'denied';

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-primary/20 overflow-hidden">
            {/* Header Animation */}
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 text-center relative overflow-hidden">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="inline-block"
              >
                <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                  <BellRing className="w-10 h-10 text-primary" />
                </div>
              </motion.div>
              
              <h1 className="text-2xl font-bold mb-2">Enable Notifications</h1>
              <p className="text-muted-foreground">
                Stay updated with game alerts & friend activity
              </p>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Game Challenges</p>
                    <p className="text-xs text-muted-foreground">Get notified when friends challenge you</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Friend Activity</p>
                    <p className="text-xs text-muted-foreground">Know when friends come online</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Match Updates</p>
                    <p className="text-xs text-muted-foreground">Room details & result announcements</p>
                  </div>
                </div>
              </div>

              {isDenied ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium mb-2">
                      Notifications Blocked
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please enable notifications in your browser settings:
                    </p>
                    <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                      <li>Click the lock icon in address bar</li>
                      <li>Find "Notifications" setting</li>
                      <li>Change to "Allow"</li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => window.location.reload()}
                  >
                    I've Enabled Notifications
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full gap-2" 
                  size="lg"
                  onClick={requestPermission}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Bell className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                  {isRequesting ? 'Requesting...' : 'Allow Notifications'}
                </Button>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Shield className="w-4 h-4" />
                <span>We only send important updates</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Permission granted, render children
  return <>{children}</>;
};

export default NotificationPermissionGate;
