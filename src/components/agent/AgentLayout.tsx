import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AgentSidebar from './AgentSidebar';
import { cn } from '@/lib/utils';
import { Loader2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const AgentLayout = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkAgentRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'agent')
        .maybeSingle();

      if (data) {
        setIsAgent(true);
      }
      setCheckingRole(false);
    };

    if (!authLoading) {
      checkAgentRole();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !checkingRole) {
      if (!user) {
        navigate('/agent/login');
      } else if (!isAgent) {
        navigate('/');
      }
    }
  }, [user, isAgent, authLoading, checkingRole, navigate]);

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAgent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <AgentSidebar 
              collapsed={false} 
              onToggle={() => {}} 
              onNavigate={() => setMobileOpen(false)}
              isMobile 
            />
          </SheetContent>
        </Sheet>
        <span className="font-display text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent ml-3">
          Agent Panel
        </span>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AgentSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          'pt-14 lg:pt-0',
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AgentLayout;