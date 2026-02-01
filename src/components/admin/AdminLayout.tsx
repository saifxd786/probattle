import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from './AdminSidebar';
import { cn } from '@/lib/utils';
import { Loader2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAdminAccess } from '@/hooks/useAdminAccess';

const AdminLayout = () => {
  const { user, isLoading: authLoading, session } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status, errorMessage, retry } = useAdminAccess({
    user,
    session,
    authLoading,
    timeoutMs: 8000,
  });

  useEffect(() => {
    if (authLoading) return;

    // Keep the same end behavior, but avoid infinite "Verifying...".
    if (status === 'needs_login') {
      navigate('/admin/login', { replace: true });
      return;
    }

    if (status === 'unauthorized') {
      navigate('/', { replace: true });
      return;
    }
  }, [authLoading, status, navigate]);

  // Loading / verifying
  if (authLoading || status === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (status === 'needs_login') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  // If verification failed (network/cold start/etc.), don't get stuck.
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6 max-w-sm">
          <p className="text-foreground font-medium">Unable to verify access</p>
          <p className="text-muted-foreground text-sm">
            {errorMessage ?? 'Please retry or login again.'}
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={retry}>Retry</Button>
            <Button variant="ghost" onClick={() => navigate('/admin/login', { replace: true })}>
              Go to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized will redirect; show a small interim state.
  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-muted-foreground">Access denied. Redirecting…</p>
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
