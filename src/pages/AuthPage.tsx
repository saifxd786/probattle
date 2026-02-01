import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Lock, User, ArrowRight, Eye, EyeOff, Gift, ArrowLeft, Calendar, ShieldQuestion, AlertTriangle, Info } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { generateDeviceFingerprint } from '@/utils/deviceFingerprint';
import { logDeviceToServer } from '@/utils/deviceInfo';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { 
  generateCorrelationId, 
  logError, 
  formatErrorWithCorrelation, 
  validatePassword,
  type ErrorType 
} from '@/utils/errorLogger';

// Security questions list
const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite movie?",
  "What was your childhood nickname?",
];

// Timeout wrapper for async operations - converts PromiseLike to Promise
const withTimeout = async <T,>(promiseLike: Promise<T> | PromiseLike<T>, ms: number, label: string): Promise<T> => {
  // Convert PromiseLike to proper Promise
  const promise = Promise.resolve(promiseLike);
  
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

// Forgot Password Form Component with Security Question - Step by Step
const ForgotPasswordForm = ({ onBack }: { onBack: () => void }) => {
  const [step, setStep] = useState<'phone' | 'security' | 'reset' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Verify phone and fetch user data
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone before setting loading
    if (phone.length < 10) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');

      // Fetch security question via backend function (works even when DB is locked down)
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          action: 'get_question',
          phone: cleanPhone,
        },
      });

      if (error || data?.error) {
        toast({
          title: 'Error',
          description: 'Unable to fetch security question. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (!data?.exists) {
        toast({
          title: 'Account Not Found',
          description: 'इस नंबर से कोई अकाउंट नहीं मिला। कृपया सही नंबर डालें।',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Check if user has set up security question
      if (!data?.hasSecurityQuestion || !data?.securityQuestion) {
        toast({
          title: 'Security Question Not Set',
          description: 'आपने Security Question सेट नहीं किया है। कृपया Telegram पर Support से संपर्क करें।',
          variant: 'destructive',
        });
        window.open('https://t.me/ProBattleTournament', '_blank');
        setIsLoading(false);
        return;
      }

      // Store data and move to security question step
      setSecurityQuestion(data.securityQuestion);
      setStep('security');
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify security answer
  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const normalizedAnswer = securityAnswer.toLowerCase().trim();

      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          action: 'verify',
          phone: cleanPhone,
          securityAnswer: normalizedAnswer,
        },
      });

      if (error || data?.error) {
        toast({
          title: 'Incorrect Answer',
          description: data?.error || 'The answer you provided is incorrect. Please try again.',
          variant: 'destructive',
        });
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
    } finally {
      setIsLoading(false);
    }
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
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: 'Password Mismatch',
          description: 'Passwords do not match',
          variant: 'destructive',
        });
        return;
      }

      // Reset password using Supabase admin API via edge function
      const cleanPhone = phone.replace(/\D/g, '');
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { 
          phone: cleanPhone,
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
    } finally {
      setIsLoading(false);
    }
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
            autoComplete="tel"
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

        {/* Password Strength Meter for Reset */}
        <PasswordStrengthMeter password={newPassword} />

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
  const [deviceBanned, setDeviceBanned] = useState(false);
  const [banReason, setBanReason] = useState('');

  // Load saved credentials from localStorage
  const getSavedCredentials = () => {
    try {
      const saved = localStorage.getItem('probattle_saved_login');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  };

  const savedCreds = getSavedCredentials();

  const [formData, setFormData] = useState({
    phone: savedCreds?.phone || '',
    password: savedCreds?.password || '',
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
    
    // Check if session was forcefully expired (single-session enforcement)
    // This clears the form to prevent instant re-login loops
    const sessionExpired = searchParams.get('session_expired') === 'true' || 
                           sessionStorage.getItem('session_force_expired') === 'true';
    
    if (sessionExpired) {
      // Clear the flag
      sessionStorage.removeItem('session_force_expired');
      
      // Remove query param from URL without reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
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

  const normalizePhone = (raw: string) => {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (digits.length <= 10) return digits;
    return digits.slice(-10); // handle +91/0 prefixes etc.
  };

  // Check device ban (non-blocking with timeout)
  const checkDeviceBan = async () => {
    try {
      const fingerprint = await withTimeout(generateDeviceFingerprint(), 5000, 'fingerprint');
      const result = await withTimeout(
        supabase
          .from('device_bans')
          .select('*')
          .eq('device_fingerprint', fingerprint)
          .maybeSingle()
          .then(res => res),
        5000,
        'ban-check'
      );
      return result.data;
    } catch {
      // If fingerprint or ban check fails/times out, allow signup to proceed
      return null;
    }
  };

  // Save device fingerprint to profile (non-blocking)
  const saveDeviceFingerprint = async (userId: string) => {
    try {
      const fingerprint = await withTimeout(generateDeviceFingerprint(), 5000, 'fingerprint-save');
      await withTimeout(
        supabase
          .from('profiles')
          .update({ device_fingerprint: fingerprint })
          .eq('id', userId)
          .then(res => res),
        5000,
        'save-fingerprint'
      );
    } catch {
      // Non-blocking - fingerprint save skipped
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    // Read from DOM too (supports browser autofill that doesn't trigger onChange)
    const rawPhone = String(fd.get('phone') ?? formData.phone ?? '');
    const rawPassword = String(fd.get('password') ?? formData.password ?? '');
    const phoneForAuth = normalizePhone(rawPhone);
    const passwordForAuth = rawPassword;

    setIsLoading(true);

    try {
      // Legacy device ban check
      const deviceBan = await checkDeviceBan();
      if (deviceBan) {
        setDeviceBanned(true);
        setBanReason(deviceBan.reason || 'Violating regulations');
        toast({
          title: '🚫 Device Banned',
          description: 'Your device has been banned for violating regulations.',
          variant: 'destructive',
        });
        return;
      }

      // Validate phone
      const phoneResult = phoneSchema.safeParse(phoneForAuth);
      if (!phoneResult.success) {
        toast({
          title: 'Validation Error',
          description: phoneResult.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      // Validate password (basic check)
      const passwordResult = passwordSchema.safeParse(passwordForAuth);
      if (!passwordResult.success) {
        toast({
          title: 'Validation Error',
          description: passwordResult.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      // For signup: just log password strength but don't block (indicator shows user feedback)

      const email = phoneToEmail(phoneForAuth);

      if (mode === 'signup') {
        // Validate username - now compulsory
        if (!formData.username.trim()) {
          toast({
            title: 'Name Required',
            description: 'Please enter your name to create an account',
            variant: 'destructive',
          });
          return;
        }

        const usernameResult = usernameSchema.safeParse(formData.username);
        if (!usernameResult.success) {
          toast({
            title: 'Validation Error',
            description: usernameResult.error.errors[0].message,
            variant: 'destructive',
          });
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          toast({
            title: 'Error',
            description: 'Passwords do not match',
            variant: 'destructive',
          });
          return;
        }

        // Validate DOB
        if (!formData.dateOfBirth) {
          toast({
            title: 'Date of Birth Required',
            description: 'Please enter your date of birth for account recovery',
            variant: 'destructive',
          });
          return;
        }

        // Validate security question
        if (!formData.securityQuestion || !formData.securityAnswer.trim()) {
          toast({
            title: 'Security Question Required',
            description: 'Please select a security question and provide an answer',
            variant: 'destructive',
          });
          return;
        }

        // Sign up with timeout
        const redirectUrl = `${window.location.origin}/`;
        const { data: signupData, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password: formData.password,
            options: {
              emailRedirectTo: redirectUrl,
              data: {
                username: formData.username,
                phone: phoneForAuth,
              },
            },
          }),
          20000,
          'signup'
        );

        if (error) {
          const correlationId = generateCorrelationId();
          let errorMessage = error.message;
          if (error.message.includes('already registered')) {
            errorMessage = 'This phone number is already registered. Please login instead.';
          }
          
          // Log error with correlation ID
          logError({
            correlationId,
            errorType: 'signup_error',
            errorMessage: error.message,
            errorDetails: { code: error.name, phone: phoneForAuth },
          });
          
          toast({
            title: 'Signup Error',
            description: formatErrorWithCorrelation(errorMessage, correlationId),
            variant: 'destructive',
          });
          return;
        }

        // Ensure user is logged in right after signup
        if (!signupData.session) {
          const { error: signInAfterSignupError } = await withTimeout(
            supabase.auth.signInWithPassword({
              email,
                  password: passwordForAuth,
            }),
            15000,
            'signin-after-signup'
          );

          if (signInAfterSignupError) {
            toast({
              title: 'Signup Successful',
              description: 'Account created, but login failed. Please sign in now.',
              variant: 'destructive',
            });
            setMode('login');
            return;
          }
        }

        // Update profile with additional details (trigger already created base profile)
        const userId = signupData.user?.id;
        if (userId && typeof userId === 'string' && userId.length > 0) {
          try {
            // Wait a moment for the trigger to complete profile creation
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const profileResult = await withTimeout(
              supabase.from('profiles').update({
                username: formData.username,
                phone: phoneForAuth,
                email,
                date_of_birth: formData.dateOfBirth,
                security_question: formData.securityQuestion,
                security_answer: formData.securityAnswer.toLowerCase().trim(),
              }).eq('id', userId).then(res => res),
              15000,
              'profile-update'
            );

            // If update failed (maybe trigger didn't create profile yet), try insert
            if (profileResult.error) {
              await withTimeout(
                supabase.from('profiles').insert({
                  id: userId,
                  username: formData.username,
                  phone: phoneForAuth,
                  email,
                  date_of_birth: formData.dateOfBirth,
                  security_question: formData.securityQuestion,
                  security_answer: formData.securityAnswer.toLowerCase().trim(),
                }).then(res => res),
                15000,
                'profile-insert'
              );
            }
          } catch (profileError) {
            // Log profile error but don't block signup
            const correlationId = generateCorrelationId();
            logError({
              correlationId,
              errorType: 'profile_error',
              errorMessage: profileError instanceof Error ? profileError.message : 'Profile save failed',
              errorDetails: { userId },
              userId,
            });
          }
        }

        // Handle referral if code was provided (non-blocking)
        if (referralCode && userId) {
          try {
            const referrerResult = await withTimeout(
              supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', referralCode)
                .maybeSingle()
                .then(res => res),
              8000,
              'referrer-lookup'
            );
            const referrer = referrerResult.data;

            if (referrer) {
              await Promise.all([
                supabase
                  .from('profiles')
                  .update({ referred_by: referrer.id })
                  .eq('id', userId),
                supabase.from('referrals').insert({
                  referrer_id: referrer.id,
                  referred_id: userId,
                  referral_code: referralCode,
                  reward_amount: REFERRAL_REWARD,
                  is_rewarded: false,
                }),
              ]);
            }
          } catch (referralError) {
            // Log referral error but don't block signup
            const correlationId = generateCorrelationId();
            logError({
              correlationId,
              errorType: 'referral_error',
              errorMessage: referralError instanceof Error ? referralError.message : 'Referral processing failed',
              errorDetails: { referralCode, userId },
              userId,
            });
          }
        }

        // Log comprehensive device info with geolocation for registration (non-blocking)
        // This captures IP, location, device details for fraud prevention
        logDeviceToServer(supabase, true).then(result => {
          if (result.location) {
            console.log('[Auth] Registration device logged from:', result.location);
          }
        }).catch(err => {
          console.error('[Auth] Failed to log registration device:', err);
        });


        toast({
          title: 'Account created!',
          description: 'Welcome to ProBattle! You are now logged in.',
        });
        navigate('/');
      } else {
        // Login
        const { data: loginData, error: loginError } = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password: passwordForAuth,
          }),
          15000,
          'login'
        );

        if (loginError) {
          const correlationId = generateCorrelationId();
          let errorMessage = loginError.message;
          if (loginError.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid phone number or password.';
          }
          
          // Log login error with correlation ID
          logError({
            correlationId,
            errorType: 'login_error',
            errorMessage: loginError.message,
            errorDetails: { code: loginError.name, phone: phoneForAuth },
          });
          
          toast({
            title: 'Login Error',
            description: formatErrorWithCorrelation(errorMessage, correlationId),
            variant: 'destructive',
          });
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
            return;
          }
        }

        // Update device fingerprint on login (non-blocking)
        if (loginData.user) {
          saveDeviceFingerprint(loginData.user.id);
          
          // Save credentials to localStorage for auto-fill on next login
          try {
            localStorage.setItem('probattle_saved_login', JSON.stringify({
              phone: phoneForAuth,
              password: passwordForAuth,
            }));
          } catch {
            // Ignore storage errors
          }
        }

        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate('/');
      }
    } catch (error) {
      const correlationId = generateCorrelationId();
      const message = error instanceof Error ? error.message : '';
      
      // Log the general auth error
      logError({
        correlationId,
        errorType: 'general_auth_error',
        errorMessage: message || 'Unknown error',
        errorDetails: { mode, phone: phoneForAuth },
      });
      
      if (message.startsWith('TIMEOUT:')) {
        toast({
          title: 'Network Slow',
          description: formatErrorWithCorrelation('Request timeout. Please check your internet and try again.', correlationId),
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: formatErrorWithCorrelation('An unexpected error occurred. Please try again.', correlationId),
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
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
          {/* Device Banned Warning */}
          {deviceBanned && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-destructive shrink-0" />
                <div>
                  <h3 className="font-bold text-destructive text-sm">Device Banned</h3>
                  <p className="text-xs text-destructive/80 mt-1">
                    Your device has been banned for violating regulations.
                    {banReason && banReason !== 'Violating regulations' && ` Reason: ${banReason}`}
                  </p>
                </div>
              </div>
            </div>
          )}


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
                  name="username"
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
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                autoComplete="tel"
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
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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

            {/* Password Strength Meter with validation hints (signup only) */}
            {mode === 'signup' && (
              <>
                <PasswordStrengthMeter password={formData.password} />
                {formData.password && !validatePassword(formData.password).isValid && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
                    <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <ul className="text-[10px] text-warning space-y-0.5">
                      {validatePassword(formData.password).errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  autoComplete="new-password"
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
              disabled={isLoading || deviceBanned}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : deviceBanned ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Device Banned
                </>
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
