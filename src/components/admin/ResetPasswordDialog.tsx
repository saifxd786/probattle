import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ResetPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string | null;
  hasSecurityQuestion: boolean;
}

const ResetPasswordDialog = ({
  isOpen,
  onClose,
  userId,
  username,
  hasSecurityQuestion,
}: ResetPasswordDialogProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword) {
      toast({ title: 'Error', description: 'Please enter a new password', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, newPassword },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast({
        title: 'Password Reset',
        description: `Password for ${username || 'user'} has been reset successfully.`,
      });

      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Manually reset password for <strong>{username || 'this user'}</strong>
          </DialogDescription>
        </DialogHeader>

        {hasSecurityQuestion && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-500">
              This user has a security question set. They can reset their own password using the "Forgot Password" feature.
            </p>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-sm text-destructive">Passwords do not match</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            disabled={isLoading || !newPassword || newPassword !== confirmPassword}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
