import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from './AdminSidebar';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const AdminLayout = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (data) {
        setIsAdmin(true);
      }
      setCheckingRole(false);
    };

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !checkingRole) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/');
      }
    }
  }, [user, isAdmin, authLoading, checkingRole, navigate]);

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
