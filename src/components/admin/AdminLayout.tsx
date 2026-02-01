import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { cn } from '@/lib/utils';
import { Loader2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const AdminLayout = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Switch manifest for admin PWA
  useEffect(() => {
    // Find and update manifest link for admin
    const existingManifest = document.querySelector('link[rel="manifest"]');
    const originalHref = existingManifest?.getAttribute('href');
    
    if (existingManifest) {
      existingManifest.setAttribute('href', '/admin-manifest.json');
    } else {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/admin-manifest.json';
      document.head.appendChild(link);
    }
    
    // Update theme color and app name for admin
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute('content', '#0a0a0a');
    }
    
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) {
      appleTitle.setAttribute('content', 'PB Admin');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-title';
      meta.content = 'PB Admin';
      document.head.appendChild(meta);
    }
    
    // Cleanup - restore original manifest when leaving admin
    return () => {
      if (existingManifest && originalHref) {
        existingManifest.setAttribute('href', originalHref);
      }
      if (appleTitle) {
        appleTitle.setAttribute('content', 'ProBattle');
      }
    };
  }, []);

  useEffect(() => {
    // Simple check - is admin access granted in sessionStorage?
    const adminAccess = sessionStorage.getItem('adminAccess');
    const accessTime = sessionStorage.getItem('adminAccessTime');
    
    if (adminAccess === 'granted' && accessTime) {
      // Optional: Check if access is still valid (e.g., within 24 hours)
      const grantedAt = parseInt(accessTime, 10);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (now - grantedAt < maxAge) {
        setHasAccess(true);
      } else {
        // Access expired
        sessionStorage.removeItem('adminAccess');
        sessionStorage.removeItem('adminAccessTime');
        navigate('/admin/login', { replace: true });
      }
    } else {
      // No access - redirect to login
      navigate('/admin/login', { replace: true });
    }
    
    setIsChecking(false);
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting to login…</p>
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
