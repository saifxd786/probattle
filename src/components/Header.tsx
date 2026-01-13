import { Menu, User, LogOut, Download, Smartphone, RefreshCw, Headset, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import SupportChat from '@/components/SupportChat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateAvailable } from '@/hooks/useUpdateAvailable';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, signOut } = useAuth();
  const { updateAvailable, applyUpdate } = useUpdateAvailable();

  useEffect(() => {
    // Check if mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    
    // Check if already installed as PWA
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(true);
    }
    
    checkMobile();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/50" />
      
      <div className="relative container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-gradient tracking-wider">
              ProBattle
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/matches" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Matches
            </Link>
            <Link to="/my-games" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              My Games
            </Link>
            <Link to="/wallet" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Wallet
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {showInstallPrompt && isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex gap-1 px-2 h-8 text-xs"
                  >
                    <Download className="w-3 h-3" />
                    <span className="hidden xs:inline">Install</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/install" className="flex items-center gap-2 cursor-pointer">
                      <Smartphone className="w-4 h-4" />
                      <span>PWA Install</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => window.open('/apk/probattle.apk', '_blank')}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download APK</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Update Available Button */}
            {updateAvailable && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={applyUpdate}
                className="flex gap-2 border-primary/50 text-primary hover:bg-primary/10 animate-pulse"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Update</span>
              </Button>
            )}


            {/* Telegram Support */}
            <a
              href="https://t.me/probattleofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              title="Telegram Support"
            >
              <Headset className="w-5 h-5 text-primary" />
            </a>

            {/* Live Chat Support */}
            <SupportChat />
            
            <NotificationBell />
            
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    {user.email?.split('@')[0]}
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="hidden md:flex">
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}

            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={cn(
        'absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 md:hidden transition-all duration-300 overflow-hidden',
        isMenuOpen ? 'max-h-80' : 'max-h-0'
      )}>
        <div className="container mx-auto px-4 py-4 space-y-2">
          {user ? (
            <>
              <Link 
                to="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/30"
              >
                <User className="w-5 h-5 text-primary" />
                <span className="font-medium">{user.email?.split('@')[0]}</span>
              </Link>
              <Link 
                to="/wallet"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <span className="font-medium">💰 Wallet</span>
              </Link>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5 text-destructive" />
                <span className="font-medium">Logout</span>
              </button>
            </>
          ) : (
            <Link 
              to="/auth" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <User className="w-5 h-5 text-primary" />
              <span className="font-medium">Login / Sign Up</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
