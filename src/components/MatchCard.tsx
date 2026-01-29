import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Trophy, Zap, Lock, Copy, Check, AlertCircle, Wallet, Radio, Ban, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import MatchParticipantsDialog from './MatchParticipantsDialog';

// Map images
import mapErangel from '@/assets/map-erangel.jpg';
import mapMiramar from '@/assets/map-miramar.jpg';
import mapSanhok from '@/assets/map-sanhok.jpg';
import mapLivik from '@/assets/map-livik.jpg';
import mapVikendi from '@/assets/map-vikendi.jpg';
import mapTdm from '@/assets/map-tdm.jpg';

// Gun category images
import gunM416 from '@/assets/gun-m416.jpg';
import gunShotgun from '@/assets/gun-shotgun.jpg';
import gunAny from '@/assets/gun-any.jpg';

// Map name to image mapping
const mapImages: Record<string, string> = {
  'erangel': mapErangel,
  'miramar': mapMiramar,
  'sanhok': mapSanhok,
  'vikendi': mapVikendi,
  'livik': mapLivik,
  'tdm': mapTdm,
  'warehouse': mapTdm,
  'hangar': mapTdm,
  'ruins': mapTdm,
};

// Gun category to image mapping
const gunCategoryImages: Record<string, string> = {
  'm416_only': gunM416,
  'shotgun_only': gunShotgun,
  'any_gun': gunAny,
};

// Gun category labels
const gunCategoryLabels: Record<string, string> = {
  'm416_only': 'M416 ONLY',
  'shotgun_only': 'SHOTGUN ONLY',
  'any_gun': 'ANY GUN',
};

interface MatchCardProps {
  id: string;
  title: string;
  mode: string;
  map: string;
  entryFee: number;
  prize: number;
  prizePerKill?: number;
  firstPlacePrize?: number;
  secondPlacePrize?: number;
  thirdPlacePrize?: number;
  slots: { current: number; total: number };
  time: string;
  nowMs: number;
  status: 'open' | 'filling' | 'full';
  roomId?: string | null;
  roomPassword?: string | null;
  isRegistered?: boolean;
  isFreeMatch?: boolean;
  isClassicMatch?: boolean;
  gunCategory?: string | null;
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
  prizePerKill = 0,
  firstPlacePrize = 0,
  secondPlacePrize = 0,
  thirdPlacePrize = 0,
  slots,
  time,
  nowMs,
  status,
  roomId,
  roomPassword,
  isRegistered = false,
  isFreeMatch = false,
  isClassicMatch = false,
  gunCategory = null,
  onRegister,
  delay = 0 
}: MatchCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
  const [copiedField, setCopiedField] = useState<'id' | 'password' | 'matchId' | null>(null);
  const [secureRoomId, setSecureRoomId] = useState<string | null>(null);
  const [secureRoomPassword, setSecureRoomPassword] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isBanned, setIsBanned] = useState(false);
  
  // Generate short match ID from UUID
  const shortMatchId = id.slice(0, 8).toUpperCase();
  
  // Get map image based on map name OR gun category for TDM
  const getMapImage = () => {
    // For TDM matches with gun category, use gun category image
    if (gunCategory && gunCategoryImages[gunCategory]) {
      return gunCategoryImages[gunCategory];
    }
    const mapKey = map.toLowerCase().replace(/\s+/g, '');
    return mapImages[mapKey] || mapErangel;
  };
  
  // Check if this is a TDM match with gun category
  const isTdmMatch = mode.toLowerCase().includes('tdm');
  const displayGunCategory = gunCategory && gunCategoryLabels[gunCategory];
  
  // Form fields
  const [bgmiIngameName, setBgmiIngameName] = useState('');
  const [bgmiPlayerId, setBgmiPlayerId] = useState('');
  const [bgmiPlayerLevel, setBgmiPlayerLevel] = useState('');

  const isFree = entryFee === 0 || isFreeMatch;
  const slotsPercentage = (slots.current / slots.total) * 100;
  const hasEnoughBalance = walletBalance >= entryFee;

  const matchTimeMs = useMemo(() => {
    const raw = (time ?? '').trim();
    if (!raw) return Number.NaN;

    // Some WebViews/Safari builds are picky; normalize common "YYYY-MM-DD HH:mm" shapes.
    const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
    return new Date(normalized).getTime();
  }, [time]);

  const timeRemaining = useMemo(() => {
    if (!Number.isFinite(matchTimeMs)) return null;

    const diffMs = matchTimeMs - nowMs;
    if (diffMs <= 0) return { hours: 0, minutes: 0, seconds: 0 };

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds };
  }, [matchTimeMs, nowMs]);

  // Check if match is live (countdown finished)
  const isMatchLive =
    timeRemaining !== null &&
    timeRemaining.hours === 0 &&
    timeRemaining.minutes === 0 &&
    timeRemaining.seconds === 0;

  // Format display time
  const formatDisplayTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-IN', { 
      weekday: 'short', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance, is_banned')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setWalletBalance(data.wallet_balance || 0);
      setIsBanned(data.is_banned || false);
    }
  };

  const fetchSecureCredentials = async () => {
    if (!user) return;
    
    setIsLoadingCredentials(true);
    try {
      const { data, error } = await supabase.rpc('get_match_room_credentials', {
        _match_id: id
      });
      
      if (error) {
        console.error('Error fetching credentials:', error);
        toast({ title: 'Error', description: 'Could not fetch room credentials', variant: 'destructive' });
      } else if (data && data.length > 0) {
        setSecureRoomId(data[0].room_id);
        setSecureRoomPassword(data[0].room_password);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const handleJoinClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Check if user is banned
    if (isBanned) {
      toast({ 
        title: 'Account Banned', 
        description: 'Your account has been banned. You cannot join matches.', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (isRegistered) {
      fetchSecureCredentials();
      setIsRoomDialogOpen(true);
      return;
    }
    
    setIsDialogOpen(true);
  };

  const handleRegister = async () => {
    if (!user) return;
    
    // Validate BGMI fields
    if (!bgmiIngameName.trim()) {
      toast({ title: 'Error', description: 'Please enter your BGMI In-Game Name', variant: 'destructive' });
      return;
    }
    if (!bgmiPlayerId.trim()) {
      toast({ title: 'Error', description: 'Please enter your BGMI Player ID', variant: 'destructive' });
      return;
    }
    const level = parseInt(bgmiPlayerLevel);
    if (!bgmiPlayerLevel || isNaN(level)) {
      toast({ title: 'Error', description: 'Please enter your BGMI Player Level', variant: 'destructive' });
      return;
    }
    if (level < 30) {
      toast({ title: 'Level Too Low', description: 'Minimum level 30 is required to participate', variant: 'destructive' });
      return;
    }
    
    // Check wallet balance for paid matches
    if (!isFree && !hasEnoughBalance) {
      toast({ title: 'Insufficient Balance', description: 'Please add funds to your wallet', variant: 'destructive' });
      navigate('/wallet');
      return;
    }
    
    setIsLoading(true);
    
    // If paid match, deduct from wallet first
    if (!isFree) {
      // Get current profile data including wager requirement
      const { data: profileData } = await supabase
        .from('profiles')
        .select('wallet_balance, wager_requirement')
        .eq('id', user.id)
        .single();
      
      const currentWager = (profileData?.wager_requirement as number) || 0;
      const newBalance = walletBalance - entryFee;
      const newWager = Math.max(0, currentWager - entryFee); // Reduce wager requirement
      
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ 
          wallet_balance: newBalance,
          wager_requirement: newWager
        })
        .eq('id', user.id);
      
      if (walletError) {
        toast({ title: 'Error', description: 'Failed to deduct entry fee', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      
      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: entryFee,
        type: 'entry_fee',
        status: 'completed',
        description: `Entry fee for ${title}`
      });
    }
    
    // Register for match - directly approved since payment is done via wallet
    const { error } = await supabase
      .from('match_registrations')
      .insert({
        match_id: id,
        user_id: user.id,
        team_name: bgmiIngameName,
        bgmi_ingame_name: bgmiIngameName,
        bgmi_player_id: bgmiPlayerId,
        bgmi_player_level: level,
        payment_status: 'approved',
        is_approved: true,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already Registered', description: 'You have already registered for this match.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        // Refund if registration failed
        if (!isFree) {
          await supabase
            .from('profiles')
            .update({ wallet_balance: walletBalance })
            .eq('id', user.id);
        }
      }
    } else {
      toast({ title: 'Joined Successfully!', description: 'Room details will be available before match starts.' });
      setIsDialogOpen(false);
      setBgmiIngameName('');
      setBgmiPlayerId('');
      setBgmiPlayerLevel('');
      onRegister?.();
    }
    
    setIsLoading(false);
  };

  const handleCopy = (text: string, field: 'id' | 'password' | 'matchId') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied!', description: 'Copied to clipboard' });
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
        {/* Map Banner Image */}
        <div className="relative h-24 overflow-hidden">
          <img 
            src={getMapImage()} 
            alt={map} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Show map badge only for non-TDM or when no gun category */}
              {(!gunCategory || !gunCategoryLabels[gunCategory]) && (
                <span className="px-2 py-0.5 bg-background/80 backdrop-blur-sm rounded text-xs font-medium border border-border/50">
                  {map}
                </span>
              )}
              {/* Gun category badge for TDM matches */}
              {displayGunCategory && (
                <span className="px-2 py-0.5 bg-primary/90 backdrop-blur-sm rounded text-xs font-bold text-primary-foreground border border-primary/50">
                  {displayGunCategory}
                </span>
              )}
            </div>
            {isBanned && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive/80 backdrop-blur-sm rounded text-xs text-white">
                <Ban className="w-3 h-3" />
                Banned
              </span>
            )}
          </div>
        </div>
        
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
                
                {isMatchLive && (
                  <span className="flex items-center gap-1 text-[10px] text-red-500 animate-pulse">
                    <Radio className="w-3 h-3" />
                    LIVE
                  </span>
                )}

                {!isMatchLive && status === 'filling' && (
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
              
              <h4 className="font-display text-base font-bold tracking-wide">{title}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">
                  {mode}{displayGunCategory ? ` • ${displayGunCategory}` : (map && map.toLowerCase() !== 'tbd' ? ` • ${map}` : '')}
                </p>
                <button 
                  onClick={() => handleCopy(shortMatchId, 'matchId')}
                  className="flex items-center gap-1 text-[10px] text-primary/80 hover:text-primary transition-colors"
                  title="Copy Match ID"
                >
                  <Hash className="w-3 h-3" />
                  {shortMatchId}
                  {copiedField === 'matchId' && <Check className="w-3 h-3" />}
                </button>
              </div>
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
          
          {/* Rewards Display for Classic Matches */}
          {isClassicMatch && (firstPlacePrize > 0 || secondPlacePrize > 0 || thirdPlacePrize > 0 || prizePerKill > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {firstPlacePrize > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded-full border border-yellow-500/30">
                  🥇 ₹{firstPlacePrize}
                </span>
              )}
              {secondPlacePrize > 0 && (
                <span className="px-2 py-0.5 bg-gray-400/20 text-gray-300 text-[10px] rounded-full border border-gray-400/30">
                  🥈 ₹{secondPlacePrize}
                </span>
              )}
              {thirdPlacePrize > 0 && (
                <span className="px-2 py-0.5 bg-amber-600/20 text-amber-500 text-[10px] rounded-full border border-amber-600/30">
                  🥉 ₹{thirdPlacePrize}
                </span>
              )}
              {prizePerKill > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full border border-red-500/30">
                  💀 ₹{prizePerKill}/kill
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 pt-3 space-y-3">
          {/* Slots Progress with View Opponents */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <button 
                onClick={() => setIsParticipantsOpen(true)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                title="View participants"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Slots</span>
                <span className="text-primary text-[10px]">(View)</span>
              </button>
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

          {/* Live Timer */}
          {timeRemaining && (timeRemaining.hours > 0 || timeRemaining.minutes > 0 || timeRemaining.seconds > 0) && (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-primary">
                <Clock className="w-4 h-4 animate-pulse" />
                <span className="bg-primary/20 px-2 py-0.5 rounded border border-primary/30">
                  {timeRemaining.hours > 0 
                    ? `${timeRemaining.hours}h ${String(timeRemaining.minutes).padStart(2, '0')}m ${String(timeRemaining.seconds).padStart(2, '0')}s`
                    : `${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Time & Join Button */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {formatDisplayTime(time)}
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
              <Label>BGMI In-Game Name <span className="text-destructive">*</span></Label>
              <Input
                value={bgmiIngameName}
                onChange={(e) => setBgmiIngameName(e.target.value)}
                placeholder="Your BGMI username"
              />
            </div>

            <div>
              <Label>BGMI Player ID <span className="text-destructive">*</span></Label>
              <Input
                value={bgmiPlayerId}
                onChange={(e) => setBgmiPlayerId(e.target.value)}
                placeholder="e.g., 5123456789"
              />
            </div>

            <div>
              <Label>BGMI Player Level <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={bgmiPlayerLevel}
                onChange={(e) => setBgmiPlayerLevel(e.target.value)}
                placeholder="Minimum level 30"
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Level 30+ required to participate
              </p>
            </div>

            {!isFree && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Entry Fee</span>
                  <span className="font-bold text-primary">₹{entryFee}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Wallet className="w-4 h-4" />
                    Wallet Balance
                  </span>
                  <span className={cn(
                    'font-medium',
                    hasEnoughBalance ? 'text-green-400' : 'text-destructive'
                  )}>
                    ₹{walletBalance}
                  </span>
                </div>
                {!hasEnoughBalance && (
                  <p className="text-xs text-destructive mt-2">
                    Insufficient balance. Please add ₹{entryFee - walletBalance} to your wallet.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="neon" 
                onClick={handleRegister} 
                disabled={isLoading || (!isFree && !hasEnoughBalance)} 
                className="flex-1"
              >
                {isLoading ? 'Joining...' : isFree ? 'Join Now' : `Pay ₹${entryFee} & Join`}
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
            {isLoadingCredentials ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Loading room details...</p>
              </div>
            ) : secureRoomId && secureRoomPassword ? (
              <>
                <div className="space-y-2">
                  <Label>Room ID</Label>
                  <div className="flex gap-2">
                    <Input value={secureRoomId} readOnly />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleCopy(secureRoomId, 'id')}
                    >
                      {copiedField === 'id' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input value={secureRoomPassword} readOnly />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleCopy(secureRoomPassword, 'password')}
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

      {/* Participants Dialog */}
      <MatchParticipantsDialog
        matchId={id}
        matchTitle={title}
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
      />
    </>
  );
};

export default MatchCard;