import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Shield, Eye, EyeOff, Lock, Phone, ArrowLeft, KeyRound, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminPasswordReset = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'answer' | 'password'>('phone');

  const handleFetchSecurityQuestion = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          action: 'get_question',
          phone: cleanPhone,
        },
      });

      if (error || data?.error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch security question',
          variant: 'destructive',
        });
        return;
      }

      if (!data?.exists) {
        toast({
          title: 'Account Not Found',
          description: 'No account found with this phone number',
          variant: 'destructive',
        });
        return;
      }

      if (!data?.hasSecurityQuestion || !data?.securityQuestion) {
        toast({
          title: 'Security Question Not Set',
          description: 'This account does not have a security question configured. Contact support.',
          variant: 'destructive',
        });
        return;
      }

      setSecurityQuestion(data.securityQuestion);
      setStep('answer');
    } catch (error) {
      console.error('Error fetching security question:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch security question',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAnswer = async () => {
    if (!securityAnswer.trim()) {
      toast({
        title: 'Answer Required',
        description: 'Please enter your security answer',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');

      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          action: 'verify',
          phone: cleanPhone,
          securityAnswer: securityAnswer.toLowerCase().trim(),
        },
      });

      if (error || data?.error) {
        toast({
          title: 'Incorrect Answer',
          description: data?.error || 'Security answer does not match',
          variant: 'destructive',
        });
        return;
      }

      setStep('password');
    } catch (error) {
      console.error('Error verifying answer:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify security answer',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
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

    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          phone: cleanPhone,
          newPassword,
          securityAnswer: securityAnswer.toLowerCase().trim(),
        },
      });

      if (error) {
        throw new Error(error.message || 'Password reset failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: '✅ Password Reset Successful',
        description: 'You can now login with your new password',
      });

      navigate('/admin/login');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to reset password',
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-card border-orange-500/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display">Admin Password Reset</CardTitle>
              <CardDescription>
                Reset your admin password using security question
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {step === 'phone' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your admin phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-11"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleFetchSecurityQuestion}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Fetching...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            )}

            {step === 'answer' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Security Question:</p>
                      <p className="font-medium">{securityQuestion}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="answer">Your Answer</Label>
                  <Input
                    id="answer"
                    type="text"
                    placeholder="Enter your security answer"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleVerifyAnswer}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify Answer'
                  )}
                </Button>
              </div>
            )}

            {step === 'password' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-sm text-green-400">✓ Security verified! Set your new password.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-11 pr-11"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleResetPassword}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resetting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Reset Password
                    </span>
                  )}
                </Button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border space-y-2">
              {step !== 'phone' && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    if (step === 'answer') setStep('phone');
                    else if (step === 'password') setStep('answer');
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => navigate('/admin/login')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin Login
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          🔒 Secured with security question verification
        </p>
      </motion.div>
    </div>
  );
};

export default AdminPasswordReset;
