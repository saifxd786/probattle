import { Menu, User, LogOut, Download, RefreshCw, RotateCcw, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import SupportChat from '@/components/SupportChat';
import UpdatePopup from '@/components/UpdatePopup';
import UpdateCheckPopup from '@/components/UpdateCheckPopup';
import DownloadAppDialog from '@/components/DownloadAppDialog';
import { useUpdateAvailable } from '@/hooks/useUpdateAvailable';
import { APP_VERSION } from '@/constants/appVersion';
// Telegram SVG Icon
const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [showCheckPopup, setShowCheckPopup] = useState(false);
  const { user, signOut } = useAuth();
  const { updateAvailable, applyUpdate, checkForUpdate, isChecking, isUpdating } = useUpdateAvailable();

  // Show update popup when update is available
  useEffect(() => {
    if (updateAvailable) {
      setShowUpdatePopup(true);
    }
  }, [updateAvailable]);

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
              <Button 
                variant="outline" 
                size="sm" 
                className="flex gap-1 px-2 h-8 text-xs"
                onClick={() => setShowDownloadDialog(true)}
              >
                <Download className="w-3 h-3" />
                <span className="hidden xs:inline">Install</span>
              </Button>
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

            {/* Telegram - Original Logo */}
            <a
              href="https://t.me/probattleofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-[#0088cc]"
              title="Join Telegram"
            >
              <TelegramIcon />
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
        isMenuOpen ? 'max-h-96' : 'max-h-0'
      )}>
        <div className="container mx-auto px-4 py-4 space-y-2">
          {/* Version Info */}
          <div className="flex items-center justify-between px-4 py-2 mb-2 rounded-lg bg-secondary/20 border border-border/30">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Version</span>
            </div>
            <span className="text-sm font-semibold text-primary">
              v{APP_VERSION}
            </span>
          </div>

          {/* Check for Update Option */}
          <button 
            onClick={async () => {
              setShowCheckPopup(true);
              await checkForUpdate();
            }}
            disabled={isChecking}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors w-full text-left"
          >
            <RotateCcw className={cn("w-5 h-5 text-primary", isChecking && "animate-spin")} />
            <span className="font-medium">
              {isChecking ? 'Checking...' : updateAvailable ? 'Update Available!' : 'Check for Update'}
            </span>
            {updateAvailable && (
              <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                New
              </span>
            )}
          </button>

          {/* Apply Update if available */}
          {updateAvailable && (
            <button 
              onClick={() => {
                applyUpdate();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors w-full text-left"
            >
              <RefreshCw className="w-5 h-5 text-primary" />
              <span className="font-medium text-primary">Apply Update Now</span>
            </button>
          )}

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

      {/* Update Popup - Force update, no close option */}
      <UpdatePopup 
        isOpen={showUpdatePopup} 
        onUpdate={applyUpdate}
        isUpdating={isUpdating}
      />

      {/* Check for Update Popup - Instant feedback */}
      <UpdateCheckPopup
        isOpen={showCheckPopup}
        onClose={() => setShowCheckPopup(false)}
        isChecking={isChecking}
        updateAvailable={updateAvailable}
        onApplyUpdate={applyUpdate}
      />

      {/* Download App Dialog - Android/iOS selection */}
      <DownloadAppDialog 
        open={showDownloadDialog} 
        onOpenChange={setShowDownloadDialog} 
      />
    </header>
  );
};

export default Header;
