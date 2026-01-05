import { useState } from 'react';
import { Ban, AlertTriangle, Gamepad2, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BanUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, banType: 'full' | 'game', selectedGames?: string[], deviceBan?: boolean) => void;
  userName: string;
}

const AVAILABLE_GAMES = [
  { id: 'bgmi', label: 'BGMI' },
  { id: 'ludo', label: 'Ludo' },
  { id: 'thimble', label: 'Thimble' },
  { id: 'freefire', label: 'Free Fire' },
];

const BanUserDialog = ({ isOpen, onClose, onConfirm, userName }: BanUserDialogProps) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [banType, setBanType] = useState<'full' | 'game'>('full');
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [deviceBan, setDeviceBan] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm(
      reason || 'Violation of terms of service',
      banType,
      banType === 'game' ? selectedGames : undefined,
      deviceBan
    );
    setIsLoading(false);
    setReason('');
    setSelectedGames([]);
    setDeviceBan(false);
    setBanType('full');
    onClose();
  };

  const toggleGame = (gameId: string) => {
    setSelectedGames(prev => 
      prev.includes(gameId) 
        ? prev.filter(g => g !== gameId)
        : [...prev, gameId]
    );
  };

  const canConfirm = banType === 'full' || (banType === 'game' && selectedGames.length > 0);

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
          </DialogDescription>
        </DialogHeader>

        <Tabs value={banType} onValueChange={(v) => setBanType(v as 'full' | 'game')} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="full" className="gap-2">
              <Ban className="w-4 h-4" />
              Full Ban
            </TabsTrigger>
            <TabsTrigger value="game" className="gap-2">
              <Gamepad2 className="w-4 h-4" />
              Game Ban
            </TabsTrigger>
          </TabsList>

          <TabsContent value="full" className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                This user will be completely banned from all games and cannot access matches or withdraw funds.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="game" className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Gamepad2 className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                This user will only be banned from selected games. They can still play other games.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Select Games to Ban From</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_GAMES.map((game) => (
                  <div
                    key={game.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedGames.includes(game.id)
                        ? 'border-destructive bg-destructive/10'
                        : 'border-border bg-secondary/30 hover:bg-secondary/50'
                    }`}
                    onClick={() => toggleGame(game.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={selectedGames.includes(game.id)}
                        onCheckedChange={() => toggleGame(game.id)}
                      />
                      <span className="font-medium">{game.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 py-2">
          {/* Device Ban Option */}
          <div 
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              deviceBan 
                ? 'border-destructive bg-destructive/10' 
                : 'border-border bg-secondary/30 hover:bg-secondary/50'
            }`}
            onClick={() => setDeviceBan(!deviceBan)}
          >
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={deviceBan}
                onCheckedChange={(checked) => setDeviceBan(checked === true)}
              />
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-destructive" />
                <div>
                  <p className="font-medium">Device Ban</p>
                  <p className="text-xs text-muted-foreground">
                    Block this device from creating new accounts
                  </p>
                </div>
              </div>
            </div>
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
              This message will be displayed to the user.
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
            disabled={isLoading || !canConfirm}
          >
            {isLoading ? 'Banning...' : banType === 'game' ? 'Ban from Games' : 'Full Ban'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BanUserDialog;
