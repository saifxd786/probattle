import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Trophy, Zap, Lock, Copy, Check, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface MatchCardProps {
  id: string;
  title: string;
  mode: string;
  map: string;
  entryFee: number;
  prize: number;
  slots: { current: number; total: number };
  time: string;
  status: 'open' | 'filling' | 'full';
  roomId?: string | null;
  roomPassword?: string | null;
  isRegistered?: boolean;
  isFreeMatch?: boolean;
  onRegister?: () => void;
  delay?: number;
}

const MatchCard = ({ 
  id,
  title,
  mode, 
  map, 
  entryFee, 
  prize, 
  slots, 
  time, 
  status,
  roomId,
  roomPassword,
  isRegistered = false,
  isFreeMatch = false,
  onRegister,
  delay = 0 
}: MatchCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [copiedField, setCopiedField] = useState<'id' | 'password' | null>(null);

  const isFree = entryFee === 0 || isFreeMatch;
  const slotsPercentage = (slots.current / slots.total) * 100;

  const handleJoinClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (isRegistered) {
      setIsRoomDialogOpen(true);
      return;
    }
    
    setIsDialogOpen(true);
  };

  const handleRegister = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    const { error } = await supabase
      .from('match_registrations')
      .insert({
        match_id: id,
        user_id: user.id,
        team_name: teamName || null,
        payment_status: isFree ? 'approved' : 'pending',
        is_approved: isFree,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already Registered', description: 'You have already registered for this match.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      if (isFree) {
        toast({ title: 'Registered!', description: 'You have successfully joined the match. Room details will be shown before match starts.' });
      } else {
        toast({ title: 'Registration Submitted', description: 'Please complete the payment. Your registration is pending approval.' });
      }
      setIsDialogOpen(false);
      setTeamName('');
      onRegister?.();
    }
    
    setIsLoading(false);
  };

  const handleCopy = (text: string, field: 'id' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay }}
        className="glass-card overflow-hidden group hover:border-primary/40 transition-all duration-300"
      >
        {/* Header */}
        <div className="relative p-4 pb-3 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider',
                  isFree 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-primary/20 text-primary border border-primary/30'
                )}>
                  {isFree ? 'Free' : `₹${entryFee}`}
                </span>
                
                {status === 'filling' && (
                  <span className="flex items-center gap-1 text-[10px] text-yellow-400">
                    <Zap className="w-3 h-3" />
                    Filling Fast
                  </span>
                )}

                {isRegistered && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400">
                    <Check className="w-3 h-3" />
                    Joined
                  </span>
                )}
              </div>
              
              <h4 className="font-display text-base font-bold tracking-wide">{mode}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{map}</p>
            </div>
            
            {prize > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary">
                  <Trophy className="w-4 h-4" />
                  <span className="font-display font-bold">₹{prize}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Prize Pool</span>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 pt-3 space-y-3">
          {/* Slots Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                Slots
              </span>
              <span className={cn(
                'font-medium',
                slotsPercentage >= 80 ? 'text-yellow-400' : 'text-foreground'
              )}>
                {slots.current}/{slots.total}
              </span>
            </div>
            
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  slotsPercentage >= 80 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : 'bg-gradient-to-r from-neon-blue to-neon-cyan'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${slotsPercentage}%` }}
                transition={{ duration: 0.8, delay: delay + 0.2 }}
              />
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {time}
            </span>
            
            <Button 
              variant={status === 'full' && !isRegistered ? 'secondary' : isRegistered ? 'outline' : 'neon'} 
              size="sm"
              disabled={status === 'full' && !isRegistered}
              onClick={handleJoinClick}
              className="text-xs h-8"
            >
              {status === 'full' && !isRegistered ? 'Full' : isRegistered ? 'View Room' : 'Join Match'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Registration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Match</DialogTitle>
            <DialogDescription>
              {title} - {mode} ({map})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Team Name (Optional)</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter your team/player name"
              />
            </div>

            {!isFree && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium">Entry Fee: ₹{entryFee}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After registration, make payment via UPI and upload screenshot. Your entry will be approved by admin.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="neon" onClick={handleRegister} disabled={isLoading} className="flex-1">
                {isLoading ? 'Registering...' : isFree ? 'Join Now' : 'Register'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Details Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room Details</DialogTitle>
            <DialogDescription>
              {title} - {mode} ({map})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {roomId && roomPassword ? (
              <>
                <div className="space-y-2">
                  <Label>Room ID</Label>
                  <div className="flex gap-2">
                    <Input value={roomId} readOnly />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleCopy(roomId, 'id')}
                    >
                      {copiedField === 'id' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input value={roomPassword} readOnly />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleCopy(roomPassword, 'password')}
                    >
                      {copiedField === 'password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Room details are shared 15 minutes before match
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Room details not available yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Room ID and password will be shared 15 minutes before match starts
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MatchCard;
