import { Menu, User, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/50" />
      
      <div className="relative container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-gradient tracking-wider">
              ProScims
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
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </Button>
            
            <Link to="/auth">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <User className="w-4 h-4 mr-2" />
                Login
              </Button>
            </Link>

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
        isMenuOpen ? 'max-h-64' : 'max-h-0'
      )}>
        <div className="container mx-auto px-4 py-4 space-y-2">
          <Link 
            to="/auth" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            <User className="w-5 h-5 text-primary" />
            <span className="font-medium">Login / Sign Up</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
