import { LayoutDashboard, Gamepad2, Users, CreditCard, Settings, LogOut, ChevronLeft, ArrowLeftRight, Bell, Dices, Trophy, Ticket, Gem, MessageCircle, RotateCcw, Calendar, ShieldBan, UserX, Timer, Smartphone, MapPin } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

const navItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Matches', url: '/admin/matches', icon: Gamepad2 },
  { title: 'TDM Scheduler', url: '/admin/tdm-scheduler', icon: Timer },
  { title: 'Classic Scheduler', url: '/admin/classic-scheduler', icon: MapPin },
  { title: 'Ludo', url: '/admin/ludo', icon: Dices },
  { title: 'Thimble', url: '/admin/thimble', icon: Trophy },
  { title: 'Mines', url: '/admin/mines', icon: Gem },
  { title: 'Spin Wheel', url: '/admin/spin-wheel', icon: RotateCcw },
  { title: 'Daily Login', url: '/admin/daily-login', icon: Calendar },
  { title: 'Redeem Codes', url: '/admin/redeem-codes', icon: Ticket },
  { title: 'Support', url: '/admin/support', icon: MessageCircle },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Multi-Account', url: '/admin/multi-account', icon: UserX },
  { title: 'Devices', url: '/admin/devices', icon: Smartphone },
  { title: 'Device Bans', url: '/admin/device-bans', icon: ShieldBan },
  { title: 'Match Management', url: '/admin/payments', icon: CreditCard },
  { title: 'Transactions', url: '/admin/transactions', icon: ArrowLeftRight },
  { title: 'Notifications', url: '/admin/notifications', icon: Bell },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const AdminSidebar = ({ collapsed, onToggle, onNavigate, isMobile }: AdminSidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r border-border transition-all duration-300 flex flex-col',
        isMobile ? 'w-full' : 'fixed left-0 top-0 z-50',
        !isMobile && (collapsed ? 'w-16' : 'w-64')
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {(!collapsed || isMobile) && (
          <span className="font-display text-lg font-bold text-gradient">ProBattle Admin</span>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn('shrink-0', collapsed && 'mx-auto')}
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/admin'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                collapsed && !isMobile && 'justify-center px-2'
              )
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {(!collapsed || isMobile) && <span className="text-sm font-medium">{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200',
            collapsed && !isMobile && 'justify-center px-2'
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
