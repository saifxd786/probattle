import { useState } from 'react';
import { Ban, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface BanUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  userName: string;
}

const BanUserDialog = ({ isOpen, onClose, onConfirm, userName }: BanUserDialogProps) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm(reason || 'Violation of terms of service');
    setIsLoading(false);
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="w-5 h-5" />
            Ban User
          </DialogTitle>
          <DialogDescription>
            You are about to ban <span className="font-semibold text-foreground">{userName}</span>. 
            This user will be logged out immediately and cannot access matches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              The ban reason will be shown to the user when they try to log in.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ban-reason">Ban Reason *</Label>
            <Textarea
              id="ban-reason"
              placeholder="Enter the reason for banning this user (e.g., Cheating, Abusive behavior, Fraud, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This message will be displayed to the user on the login page.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Banning...' : 'Confirm Ban'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BanUserDialog;
