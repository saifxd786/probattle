import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Lock, User, ArrowRight, Eye, EyeOff, Gift } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { generateDeviceFingerprint } from '@/utils/deviceFingerprint';

type AuthMode = 'login' | 'signup';

// Validation schemas
const phoneSchema = z.string().trim().min(10, { message: 'Phone number must be at least 10 digits' }).max(15).regex(/^[0-9]+$/, { message: 'Phone number must contain only digits' });
const passwordSchema = z.string().min(6, { message: 'Password must be at least 6 characters' }).max(72);
const usernameSchema = z.string().trim().min(3, { message: 'Username must be at least 3 characters' }).max(30);

const REFERRAL_REWARD = 10;

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
  });

  // Check for referral code in URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
      setMode('signup');
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Generate email from phone number for Supabase auth
  const phoneToEmail = (phone: string) => `${phone}@probattle.app`;

  // Check device ban
  const checkDeviceBan = async () => {
    const fingerprint = await generateDeviceFingerprint();
    const { data: banData } = await supabase
      .from('device_bans')
      .select('*')
      .eq('device_fingerprint', fingerprint)
      .maybeSingle();
    return banData;
  };

  // Save device fingerprint to profile
  const saveDeviceFingerprint = async (userId: string) => {
    const fingerprint = await generateDeviceFingerprint();
    await supabase
      .from('profiles')
      .update({ device_fingerprint: fingerprint })
      .eq('id', userId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check device ban first
      const deviceBan = await checkDeviceBan();
      if (deviceBan) {
        toast({
          title: '🚫 Device Banned',
          description: `This device has been banned. Reason: ${deviceBan.reason || 'Policy violation'}`,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Validate phone
      const phoneResult = phoneSchema.safeParse(formData.phone);
      if (!phoneResult.success) {
        toast({
          title: 'Validation Error',
          description: phoneResult.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Validate password
      const passwordResult = passwordSchema.safeParse(formData.password);
      if (!passwordResult.success) {
        toast({
          title: 'Validation Error',
          description: passwordResult.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const email = phoneToEmail(formData.phone);

      if (mode === 'signup') {
        // Validate username - now compulsory
        if (!formData.username.trim()) {
          toast({
            title: 'Name Required',
            description: 'Please enter your name to create an account',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const usernameResult = usernameSchema.safeParse(formData.username);
        if (!usernameResult.success) {
          toast({
            title: 'Validation Error',
            description: usernameResult.error.errors[0].message,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: 'Error',
            description: 'Passwords do not match',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Sign up
        const redirectUrl = `${window.location.origin}/`;
        const { data: signupData, error } = await supabase.auth.signUp({
          email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              username: formData.username,
              phone: formData.phone,
            },
          },
        });

        if (error) {
          let errorMessage = error.message;
          if (error.message.includes('already registered')) {
            errorMessage = 'This phone number is already registered. Please login instead.';
          }
          toast({
            title: 'Signup Error',
            description: errorMessage,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Ensure user is logged in right after signup (prevents "signed up but not logged in")
        if (!signupData.session) {
          const { error: signInAfterSignupError } = await supabase.auth.signInWithPassword({
            email,
            password: formData.password,
          });

          if (signInAfterSignupError) {
            toast({
              title: 'Signup Successful',
              description: 'Account created, but login failed. Please sign in now.',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
        }

        // Ensure profile exists (so wallet/referrals work reliably)
        if (signupData.user) {
          await supabase.from('profiles').upsert(
            {
              id: signupData.user.id,
              username: formData.username,
              phone: formData.phone,
              email,
            },
            { onConflict: 'id' }
          );
        }

        // Handle referral if code was provided - reward on first deposit only
        if (referralCode && signupData.user) {
          // Find the referrer by referral code
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .maybeSingle();

          if (referrer) {
            // Update the new user's profile with referred_by
            await supabase
              .from('profiles')
              .update({ referred_by: referrer.id })
              .eq('id', signupData.user.id);

            // Create referral record with is_rewarded = false (will be rewarded on first deposit)
            await supabase.from('referrals').insert({
              referrer_id: referrer.id,
              referred_id: signupData.user.id,
              referral_code: referralCode,
              reward_amount: REFERRAL_REWARD,
              is_rewarded: false, // Will be set to true on first deposit
            });
          }
        }

        // Save device fingerprint
        if (signupData.user) {
          await saveDeviceFingerprint(signupData.user.id);
        }

        toast({
          title: 'Account created!',
          description: 'Welcome to ProBattle! You are now logged in.',
        });
        navigate('/');
      } else {
        // Login
        const { data: loginData, error } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });

        if (error) {
          let errorMessage = error.message;
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid phone number or password. Please try again.';
          }
          toast({
            title: 'Login Error',
            description: errorMessage,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Check if user is banned
        if (loginData.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_banned, ban_reason, banned_at')
            .eq('id', loginData.user.id)
            .maybeSingle();

          if (profileData?.is_banned) {
            // Sign out the banned user immediately
            await supabase.auth.signOut();
            
            const banDate = profileData.banned_at 
              ? new Date(profileData.banned_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Unknown date';
            
            toast({
              title: '🚫 Account Banned',
              description: `Your account was banned on ${banDate}. Reason: ${profileData.ban_reason || 'Violation of terms'}`,
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
        }

        // Update device fingerprint on login
        if (loginData.user) {
          await saveDeviceFingerprint(loginData.user.id);
        }

        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 cyber-grid">
      {/* Decorative elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="block text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gradient">ProBattle</h1>
          <p className="text-xs text-muted-foreground mt-1">Play. Compete. Win.</p>
        </Link>

        {/* Card */}
        <div className="glass-card p-6 md:p-8">
          {/* Toggle */}
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg mb-6">
            {(['login', 'signup'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-md font-display text-xs uppercase tracking-wider transition-all duration-300 ${
                  mode === m
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (signup only - compulsory) */}
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Your Name *"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
            )}

            {/* Phone */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
            )}

            {/* Referral Code (signup only) */}
            {mode === 'signup' && (
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Referral Code (optional)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>
            )}

            {/* Forgot password */}
            {mode === 'login' && (
              <div className="text-right">
                <button type="button" className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <Button 
              type="submit" 
              variant="neon" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Terms */}
          {mode === 'signup' && (
            <p className="text-[10px] text-muted-foreground text-center mt-4">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          )}
        </div>

        {/* Account link */}
        <p className="text-center mt-6 text-sm text-muted-foreground">
          <Link to="/profile" className="hover:text-primary transition-colors">
            ← Go to Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
