import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Shield, Eye, EyeOff, Lock, Phone, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Warm up backend function to reduce cold-start timeouts (especially on mobile networks)
  useEffect(() => {
    let cancelled = false;

    const warmUp = async () => {
      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('warmup-timeout')), 6000),
        );

        // Intentionally invalid input -> returns fast, but wakes the function runtime.
        const invoke = supabase.functions.invoke('secure-admin-login', {
          body: { phone: '0', password: '0' },
        });

        await Promise.race([invoke, timeout]);
      } catch {
        // Ignore warmup failures (offline / slow network). Real login still works.
      }
    };

    // small delay so it doesn't compete with initial app boot
    const t = setTimeout(() => {
      if (!cancelled) warmUp();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const normalizePhone = (raw: string) => {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (digits.length <= 10) return digits;
    return digits.slice(-10);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const rawPhone = String(fd.get('phone') ?? phone ?? '').trim();
    const rawPassword = String(fd.get('password') ?? password ?? '').trim();

    const cleanPhone = normalizePhone(rawPhone);

    if (cleanPhone.length < 10) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!rawPassword || rawPassword.length < 4) {
      toast({
        title: 'Invalid Password',
        description: 'Please enter your password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call edge function with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please try again')), 25000)
      );

      const loginPromise = supabase.functions.invoke('secure-admin-login', {
        body: { phone: cleanPhone, password: rawPassword }
      });

      const response = await Promise.race([loginPromise, timeoutPromise]) as any;
      const { data, error } = response;

      if (error) {
        console.error('[AdminLogin] Error:', error);
        throw new Error(error.message || 'Connection failed');
      }

      // Handle auth errors
      if (data?.code && data.code !== 'SUCCESS') {
        throw new Error(data.error || 'Login failed');
      }

      // Handle missing session
      if (!data?.success || !data?.session) {
        throw new Error(data?.error || 'Authentication failed');
      }

      // SUCCESS - Set session
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // Wait longer for session to propagate properly (especially on mobile)
      await new Promise(r => setTimeout(r, 500));

      toast({ title: '✅ Welcome Admin!', description: 'Redirecting to dashboard...' });
      navigate('/admin');

    } catch (err: any) {
      console.error('[AdminLogin] Catch:', err);
      toast({
        title: 'Login Failed',
        description: err?.message?.includes('Request timeout')
          ? 'Network slow hai. Please 1 minute baad retry karein.'
          : (err.message || 'Invalid credentials'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
                Secure login for ProBattle administrators
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    autoComplete="tel"
                    inputMode="numeric"
                    className="pl-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
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

            <div className="mt-6 pt-4 border-t border-border space-y-2">
              <Button
                variant="ghost"
                className="w-full text-orange-400 hover:text-orange-300"
                onClick={() => navigate('/admin/reset-password')}
              >
                Forgot Password?
              </Button>
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
          🔒 Secured with end-to-end encryption
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
