import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from './AdminSidebar';
import { cn } from '@/lib/utils';
import { Loader2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const AdminLayout = () => {
  const { user, isLoading: authLoading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = not checked yet
  const [checkingRole, setCheckingRole] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [forceLoginRedirect, setForceLoginRedirect] = useState(false);
  
  // Track if we've already verified admin status to prevent re-checking on every render
  const hasVerifiedRef = useRef(false);
  const lastCheckedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAdminRole = async () => {
      // Skip if no user or still loading auth
      if (!user || !session) {
        setIsAdmin(null);
        setCheckingRole(false);
        return;
      }

      // Skip re-checking if we already verified this user
      if (hasVerifiedRef.current && lastCheckedUserIdRef.current === user.id) {
        setCheckingRole(false);
        return;
      }

      console.log('[AdminLayout] Checking admin role for user:', user.id);
      setCheckingRole(true);
      
      try {
        // Get fresh token
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token || session?.access_token;

        if (!accessToken) {
          console.log('[AdminLayout] No access token available');
          setForceLoginRedirect(true);
          setIsAdmin(false);
          setCheckingRole(false);
          return;
        }

        // Single call with timeout protection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const { data, error } = await supabase.functions.invoke('admin-check-access', {
          body: {},
          headers: { Authorization: `Bearer ${accessToken}` },
        } as any);

        clearTimeout(timeoutId);

        if (error) {
          const status = (error as any)?.context?.response?.status;
          console.error('[AdminLayout] admin-check-access failed:', error);
          
          if (status === 401) {
            setForceLoginRedirect(true);
          }
          setIsAdmin(false);
          setCheckingRole(false);
          return;
        }

        const adminStatus = Boolean((data as any)?.isAdmin);
        console.log('[AdminLayout] Admin status:', adminStatus);
        setIsAdmin(adminStatus);
        hasVerifiedRef.current = true;
        lastCheckedUserIdRef.current = user.id;
        setCheckingRole(false);
      } catch (err) {
        console.error('[AdminLayout] Unexpected error:', err);
        setIsAdmin(false);
        setCheckingRole(false);
      }
    };

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, session, authLoading]);

  // Reset verification when user changes
  useEffect(() => {
    if (user?.id !== lastCheckedUserIdRef.current) {
      hasVerifiedRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && !checkingRole) {
      if (forceLoginRedirect) {
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!user) {
        // Small grace period: after setting a session, AuthContext may take a moment
        // to reflect the new user. Avoid redirect loops.
        const t = window.setTimeout(() => {
          navigate('/admin/login');
        }, 300);

        return () => window.clearTimeout(t);
      } else if (isAdmin === false && hasVerifiedRef.current) {
        // Only redirect to home if we've actually verified and user is NOT admin
        console.log('[AdminLayout] User is not admin, redirecting to home');
        navigate('/');
      }
    }
  }, [user, isAdmin, authLoading, checkingRole, forceLoginRedirect, navigate]);

  // Show loading while auth is loading OR while checking role OR while isAdmin hasn't been determined yet
  if (authLoading || checkingRole || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Never show a blank screen. If user is missing, show a small redirect state.
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  // If user is logged in but not admin, the effect above will redirect to home.
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {forceLoginRedirect ? 'Session expired, please login again…' : 'Verifying admin access…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <AdminSidebar 
              collapsed={false} 
              onToggle={() => {}} 
              onNavigate={() => setMobileOpen(false)}
              isMobile 
            />
          </SheetContent>
        </Sheet>
        <span className="font-display text-lg font-bold text-gradient ml-3">ProBattle Admin</span>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      <main
        className={cn(
          'flex-1 min-h-screen transition-all duration-300',
          'pt-14 lg:pt-0', // Add top padding on mobile for fixed header
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
