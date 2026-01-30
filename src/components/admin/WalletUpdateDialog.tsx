import { useState } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Plus, Minus, Wallet } from 'lucide-react';

// Strict validation schema
const walletUpdateSchema = z.object({
  amount: z
    .number()
    .min(1, 'Amount must be at least ₹1')
    .max(100000, 'Amount cannot exceed ₹100,000')
    .refine(val => Number.isFinite(val) && !Number.isNaN(val), {
      message: 'Invalid amount',
    }),
  reason: z
    .string()
    .min(3, 'Reason must be at least 3 characters')
    .max(200, 'Reason cannot exceed 200 characters'),
});

interface WalletUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    username: string | null;
    wallet_balance: number;
  } | null;
  onConfirm: (userId: string, amount: number, reason: string) => Promise<void>;
}

export const WalletUpdateDialog = ({
  open,
  onOpenChange,
  user,
  onConfirm,
}: WalletUpdateDialogProps) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [operation, setOperation] = useState<'credit' | 'debit'>('credit');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});

  const handleSubmit = async () => {
    if (!user) return;

    // Parse and validate
    const numAmount = parseFloat(amount);
    const result = walletUpdateSchema.safeParse({ amount: numAmount, reason });

    if (!result.success) {
      const fieldErrors: { amount?: string; reason?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path[0] === 'amount') fieldErrors.amount = err.message;
        if (err.path[0] === 'reason') fieldErrors.reason = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Additional safety check for debit
    const finalAmount = operation === 'debit' ? -numAmount : numAmount;
    const newBalance = user.wallet_balance + finalAmount;

    if (newBalance < 0) {
      setErrors({ amount: 'Cannot debit more than current balance' });
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await onConfirm(user.id, finalAmount, reason);
      // Reset form
      setAmount('');
      setReason('');
      setOperation('credit');
      onOpenChange(false);
    } catch (error) {
      setErrors({ amount: 'Failed to update wallet. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setReason('');
    setOperation('credit');
    setErrors({});
    onOpenChange(false);
  };

  if (!user) return null;

  const numAmount = parseFloat(amount) || 0;
  const finalAmount = operation === 'debit' ? -numAmount : numAmount;
  const newBalance = Math.max(0, user.wallet_balance + finalAmount);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Update Wallet Balance
          </DialogTitle>
          <DialogDescription>
            Modify wallet for <span className="font-medium">{user.username || 'User'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Balance Display */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold text-foreground">₹{user.wallet_balance.toFixed(2)}</p>
          </div>

          {/* Operation Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={operation === 'credit' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setOperation('credit')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Credit
            </Button>
            <Button
              type="button"
              variant={operation === 'debit' ? 'destructive' : 'outline'}
              className="flex-1"
              onClick={() => setOperation('debit')}
            >
              <Minus className="w-4 h-4 mr-2" />
              Debit
            </Button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max="100000"
              step="1"
              className={errors.amount ? 'border-destructive' : ''}
            />
            {errors.amount && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.amount}
              </p>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for update</Label>
            <Input
              id="reason"
              type="text"
              placeholder="e.g., Refund for cancelled match"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              className={errors.reason ? 'border-destructive' : ''}
            />
            {errors.reason && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.reason}
              </p>
            )}
          </div>

          {/* Preview */}
          {numAmount > 0 && (
            <div className={`p-3 rounded-lg border ${
              operation === 'credit' 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <p className="text-sm text-muted-foreground">New Balance After Update</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">₹{user.wallet_balance.toFixed(2)}</span>
                <span className={operation === 'credit' ? 'text-green-500' : 'text-red-500'}>
                  {operation === 'credit' ? '+' : '-'}₹{numAmount.toFixed(2)}
                </span>
                <span className="text-muted-foreground">=</span>
                <span className="text-xl font-bold">₹{newBalance.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !amount || !reason}
            variant={operation === 'debit' ? 'destructive' : 'default'}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Confirm ${operation === 'credit' ? 'Credit' : 'Debit'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WalletUpdateDialog;
