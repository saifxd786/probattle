import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Lock, User, ArrowRight, Eye, EyeOff, Gift, ArrowLeft, Calendar, ShieldQuestion } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { generateDeviceFingerprint } from '@/utils/deviceFingerprint';

// Security questions list
const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite movie?",
  "What was your childhood nickname?",
];

// Forgot Password Form Component with Security Question - Step by Step
const ForgotPasswordForm = ({ onBack }: { onBack: () => void }) => {
  const [step, setStep] = useState<'phone' | 'security' | 'reset' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [storedAnswer, setStoredAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Step 1: Verify phone and fetch user data
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (phone.length < 10) {
        toast({
          title: 'Invalid Phone',
          description: 'Please enter a valid 10-digit phone number',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Fetch user profile with security question
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, security_question, security_answer')
        .eq('phone', phone)
        .maybeSingle();

      if (error || !profile) {
        toast({
          title: 'Account Not Found',
          description: 'No account found with this phone number.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Check if user has set up security question
      if (!profile.security_question || !profile.security_answer) {
        toast({
          title: 'Recovery Not Set Up',
          description: 'Security question not set. Please contact support on Telegram.',
        });
        window.open('https://t.me/ProBattleTournament', '_blank');
        setIsLoading(false);
        return;
      }

      // Store data and move to security question step
      setSecurityQuestion(profile.security_question);
      setStoredAnswer(profile.security_answer);
      setUserEmail(profile.email || `${phone}@probattle.app`);
      setStep('security');
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  // Step 2: Verify security answer
  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Verify security answer (case insensitive)
      if (storedAnswer.toLowerCase().trim() !== securityAnswer.toLowerCase().trim()) {
        toast({
          title: 'Incorrect Answer',
          description: 'The answer you provided is incorrect. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Answer correct - move to reset step
      setStep('reset');
      toast({
        title: 'Verified!',
        description: 'You can now set a new password.',
      });
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (newPassword.length < 6) {
        toast({
          title: 'Weak Password',
          description: 'Password must be at least 6 characters',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: 'Password Mismatch',
          description: 'Passwords do not match',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Reset password using Supabase admin API via edge function
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { 
          phone,
          newPassword,
          securityAnswer: securityAnswer.toLowerCase().trim()
        }
      });

      if (error || data?.error) {
        toast({
          title: 'Reset Failed',
          description: data?.error || 'Failed to reset password. Please contact support.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Success
      setStep('success');
      toast({
        title: 'Password Changed!',
        description: 'Your password has been successfully reset.',
      });
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  // Step 1: Phone Input
  if (step === 'phone') {
    return (
      <form onSubmit={handlePhoneSubmit} className="space-y-4">
        <div className="text-center mb-4">
          <Phone className="w-10 h-10 text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Enter your registered phone number</p>
        </div>

        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="Registered Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
            required
            maxLength={10}
          />
        </div>

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
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        <Button 
          type="button" 
          variant="ghost" 
          className="w-full" 
          size="sm"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>
      </form>
    );
  }

  // Step 2: Security Question
  if (step === 'security') {
    return (
      <form onSubmit={handleSecuritySubmit} className="space-y-4">
        <div className="text-center mb-4">
          <ShieldQuestion className="w-10 h-10 text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Answer your security question</p>
        </div>

        {/* Display the security question */}
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-foreground text-center">{securityQuestion}</p>
        </div>

        <div className="relative">
          <ShieldQuestion className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Your Answer"
            value={securityAnswer}
            onChange={(e) => setSecurityAnswer(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
            required
          />
        </div>

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
              Verify Answer
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        <Button 
          type="button" 
          variant="ghost" 
          className="w-full" 
          size="sm"
          onClick={() => setStep('phone')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </form>
    );
  }

  // Step 3: Reset Password
  if (step === 'reset') {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground">Set your new password</p>
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
            required
          />
        </div>

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
              Reset Password
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        <Button 
          type="button" 
          variant="ghost" 
          className="w-full" 
          size="sm"
          onClick={() => setStep('security')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </form>
    );
  }

  // Step 4: Success
  return (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-green-500" />
      </div>
      <h3 className="font-display text-lg font-bold text-green-500">Password Changed!</h3>
      <p className="text-sm text-muted-foreground">
        Your password has been successfully reset. You can now login with your new password.
      </p>
      <Button 
        type="button" 
        variant="neon" 
        className="w-full" 
        size="lg"
        onClick={onBack}
      >
        Login Now
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

type AuthMode = 'login' | 'signup' | 'forgot';

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
    dateOfBirth: '',
    securityQuestion: '',
    securityAnswer: '',
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
  // Support both old domain (proscims.app) and new domain (probattle.app)
  const phoneToEmail = (phone: string) => `${phone}@probattle.app`;
  const phoneToOldEmail = (phone: string) => `${phone}@proscims.app`;

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

        // Validate DOB
        if (!formData.dateOfBirth) {
          toast({
            title: 'Date of Birth Required',
            description: 'Please enter your date of birth for account recovery',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Validate security question
        if (!formData.securityQuestion || !formData.securityAnswer.trim()) {
          toast({
            title: 'Security Question Required',
            description: 'Please select a security question and provide an answer',
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

        // Ensure user is logged in right after signup
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

        // Ensure profile exists with DOB and security question
        if (signupData.user) {
          await supabase.from('profiles').upsert(
            {
              id: signupData.user.id,
              username: formData.username,
              phone: formData.phone,
              email,
              date_of_birth: formData.dateOfBirth,
              security_question: formData.securityQuestion,
              security_answer: formData.securityAnswer.toLowerCase().trim(),
            },
            { onConflict: 'id' }
          );
        }

        // Handle referral if code was provided
        if (referralCode && signupData.user) {
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .maybeSingle();

          if (referrer) {
            await supabase
              .from('profiles')
              .update({ referred_by: referrer.id })
              .eq('id', signupData.user.id);

            await supabase.from('referrals').insert({
              referrer_id: referrer.id,
              referred_id: signupData.user.id,
              referral_code: referralCode,
              reward_amount: REFERRAL_REWARD,
              is_rewarded: false,
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
        // Login - try new domain first, then old domain for backwards compatibility
        let loginData;
        let loginError;
        
        // Try new domain first
        const { data: newDomainData, error: newDomainError } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });
        
        if (newDomainError && newDomainError.message.includes('Invalid login credentials')) {
          // Try old domain (proscims.app) for backwards compatibility
          const oldEmail = phoneToOldEmail(formData.phone);
          const { data: oldDomainData, error: oldDomainError } = await supabase.auth.signInWithPassword({
            email: oldEmail,
            password: formData.password,
          });
          
          loginData = oldDomainData;
          loginError = oldDomainError;
        } else {
          loginData = newDomainData;
          loginError = newDomainError;
        }

        if (loginError) {
          let errorMessage = loginError.message;
          if (loginError.message.includes('Invalid login credentials')) {
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
          {mode !== 'forgot' ? (
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
          ) : (
            <div className="mb-6">
              <h2 className="font-display text-lg font-bold text-center">Reset Password</h2>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Verify your identity to reset password
              </p>
            </div>
          )}

          {mode === 'forgot' ? (
            <ForgotPasswordForm onBack={() => setMode('login')} />
          ) : (
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

            {/* Date of Birth (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground ml-1">Date of Birth *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </div>
            )}

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

            {/* Security Question (signup only) */}
            {mode === 'signup' && (
              <>
                <Select
                  value={formData.securityQuestion}
                  onValueChange={(value) => setFormData({ ...formData, securityQuestion: value })}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/50 focus:border-primary">
                    <SelectValue placeholder="Select a security question *" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <ShieldQuestion className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Your answer *"
                    value={formData.securityAnswer}
                    onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
                    className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </>
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
                <button 
                  type="button" 
                  onClick={() => setMode('forgot')}
                  className="text-xs text-primary hover:underline"
                >
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
          )}

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
