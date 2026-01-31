import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Shield, Eye, EyeOff, Lock, Phone, ArrowLeft, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateDeviceFingerprint } from '@/utils/deviceFingerprint';
import { useRateLimit } from '@/hooks/useRateLimit';
import { safeError } from '@/utils/safeLogger';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverLockout, setServerLockout] = useState<number | null>(null);

  // Auto-decrement server lockout so the UI unlocks without requiring a refresh
  useEffect(() => {
    if (serverLockout === null) return;

    const id = window.setInterval(() => {
      setServerLockout((s) => {
        if (s === null) return null;
        if (s <= 1) return null;
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [serverLockout !== null]);

  // Client-side rate limiting as first layer of defense
  const loginRateLimit = useRateLimit('admin-login', {
    maxAttempts: 3,
    windowMs: 60000,
    lockoutMs: 600000, // 10 min client-side lockout
  });

  const normalizePhone = (raw: string) => {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (digits.length <= 10) return digits;
    return digits.slice(-10); // handle +91 / 0 prefix etc.
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    // Read from actual DOM values (supports browser autofill that doesn't trigger onChange)
    const rawPhone = String(fd.get('phone') ?? phone ?? '');
    const rawPassword = String(fd.get('password') ?? password ?? '');
    
    // Check client-side rate limit first
    if (loginRateLimit.isLocked) {
      toast({
        title: 'Too Many Attempts',
        description: `Please wait ${loginRateLimit.remainingLockoutTime} seconds before trying again.`,
        variant: 'destructive',
      });
      return;
    }

    // Check server-side lockout
    if (serverLockout && serverLockout > 0) {
      toast({
        title: 'Account Locked',
        description: `Please wait ${serverLockout} seconds before trying again.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Record client-side attempt
      if (!loginRateLimit.recordAttempt()) {
        toast({
          title: 'Too Many Attempts',
          description: 'You\'ve been locked out. Please wait 10 minutes.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const cleanPhone = normalizePhone(rawPhone);
      const cleanPassword = rawPassword;
      
      if (cleanPhone.length < 10) {
        toast({
          title: 'Invalid Phone',
          description: 'Please enter a valid 10-digit phone number',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Get device fingerprint for additional security
      const deviceFingerprint = await generateDeviceFingerprint();

      // Call secure admin login edge function
      const response = await supabase.functions.invoke('secure-admin-login', {
        body: {
          phone: cleanPhone,
          password: cleanPassword,
          deviceFingerprint,
        }
      });

      const { data, error } = response;

      // Handle network/invocation errors (non-2xx responses also land here)
      if (error) {
        console.error('[AdminLogin] Function error:', error);

        // Try to extract the JSON body returned by the function (e.g. { error, code, lockedFor })
        let serverPayload: any = null;
        try {
          // Most common shape in supabase-js FunctionsHttpError
          const ctx = (error as any)?.context;
          if (ctx?.body) {
            if (typeof ctx.body === 'string') {
              try {
                serverPayload = JSON.parse(ctx.body);
              } catch {
                serverPayload = { error: ctx.body };
              }
            } else {
              serverPayload = ctx.body;
            }
          }

          const res = (error as any)?.context?.response as Response | undefined;
          if (res) {
            const text = await res.text();
            try {
              serverPayload = JSON.parse(text);
            } catch {
              serverPayload = { error: text };
            }
          }
        } catch {
          // ignore parsing errors
        }

        if (serverPayload?.code === 'RATE_LIMITED') {
          setServerLockout(serverPayload.lockedFor);
          toast({
            title: 'Too Many Attempts',
            description: `Your IP has been temporarily locked. Please wait ${serverPayload.lockedFor} seconds.`,
            variant: 'destructive',
          });
          return;
        }

        if (serverPayload?.code === 'EMAIL_NOT_CONFIRMED') {
          throw new Error(serverPayload?.error || 'Account verification pending.');
        }

        if (serverPayload?.code === 'ACCOUNT_NOT_FOUND') {
          throw new Error(serverPayload?.error || 'Account not found for this phone number.');
        }

        const message = serverPayload?.error || error.message || 'Login failed. Please try again.';
        throw new Error(message);
      }

      // Handle error responses from the edge function
      if (data?.code === 'RATE_LIMITED') {
        setServerLockout(data.lockedFor);
        toast({
          title: 'Too Many Attempts',
          description: `Your IP has been temporarily locked. Please wait ${data.lockedFor} seconds.`,
          variant: 'destructive',
        });
        return;
      }

      if (data?.code === 'AUTH_FAILED' || data?.code === 'UNAUTHORIZED' || data?.code === 'DEVICE_BANNED') {
        throw new Error(data?.error || 'Invalid credentials');
      }

      if (data?.error || !data?.success) {
        throw new Error(data?.error || 'Authentication failed');
      }

      // Set the session from the edge function response
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        // Ensure session is fully hydrated before routing (prevents redirect back to login)
        await supabase.auth.getUser();
      }

      // Reset rate limits on success
      loginRateLimit.resetAttempts();
      setServerLockout(null);

      toast({
        title: '✅ Welcome Admin!',
        description: 'Redirecting to dashboard...',
      });

      navigate('/admin');
    } catch (error: any) {
      safeError('AdminLogin', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const lockedSeconds = Math.max(loginRateLimit.remainingLockoutTime, serverLockout ?? 0);
  const isLocked = lockedSeconds > 0;

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
                disabled={isLoading || isLocked}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : isLocked ? (
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Locked ({lockedSeconds}s)
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
