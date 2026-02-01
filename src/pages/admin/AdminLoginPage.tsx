import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Shield, Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

// Master password for admin access - simple and direct
const ADMIN_MASTER_PASSWORD = 'probattle@admin2024';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawPassword = password.trim();

    if (!rawPassword) {
      toast({
        title: 'Password Required',
        description: 'Please enter the admin password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Simple password check - no backend calls, no sessions
    await new Promise(r => setTimeout(r, 500)); // Small delay for UX

    if (rawPassword === ADMIN_MASTER_PASSWORD) {
      // Store admin access in sessionStorage (clears when browser closes)
      sessionStorage.setItem('adminAccess', 'granted');
      sessionStorage.setItem('adminAccessTime', Date.now().toString());
      
      toast({ title: '✅ Welcome Admin!', description: 'Redirecting to dashboard...' });
      navigate('/admin');
    } else {
      toast({
        title: 'Access Denied',
        description: 'Incorrect password',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-card border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display">Admin Access</CardTitle>
              <CardDescription>
                Enter password to access admin panel
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pl-11 pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="neon"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Access Admin Panel
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          🔒 Admin access only
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
