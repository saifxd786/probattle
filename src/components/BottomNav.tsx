import { Gamepad2, Trophy, Wallet, Gift, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Gamepad2, label: 'Matches', path: '/matches' },
  { icon: Trophy, label: 'My Games', path: '/my-games' },
  { icon: Gift, label: 'Activity', path: '/activity' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: User, label: 'Account', path: '/profile' },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />
      
      {/* Nav items */}
      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-300',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'relative p-1.5 rounded-xl transition-all duration-300',
                isActive && 'bg-primary/10'
              )}>
                <Icon className={cn(
                  'w-5 h-5 transition-all duration-300',
                  isActive && 'drop-shadow-[0_0_8px_hsl(var(--primary))]'
                )} />
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))]" />
                )}
              </div>
              
              <span className={cn(
                'text-[10px] font-medium mt-0.5 transition-all duration-300',
                isActive && 'text-primary font-display'
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
