import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Check, ArrowLeft, Loader2, Signal, Wifi, WifiOff, Gamepad2, Hash, Trophy, Coins, Sparkles, UserPlus, Link2, Gift, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FriendMultiplayerProps {
  entryAmount: number;
  walletBalance: number;
  onRoomCreated: (roomId: string, roomCode: string, isHost: boolean, entryAmount: number, rewardAmount: number) => void;
  onBack: () => void;
  pingLatency?: number | null;
  opponentOnline?: boolean;
}

const FriendMultiplayer = ({ 
  entryAmount, 
  walletBalance, 
  onRoomCreated, 
  onBack,
  pingLatency,
  opponentOnline
}: FriendMultiplayerProps) => {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [roomCode, setRoomCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitingForPlayer, setWaitingForPlayer] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isFreeMatch, setIsFreeMatch] = useState(false);

  const actualEntryAmount = isFreeMatch ? 0 : entryAmount;
  const rewardAmount = isFreeMatch ? 0 : Math.floor(entryAmount * 1.5);

  const handleCreateRoom = async () => {
    // Only check balance for paid matches
    if (!isFreeMatch && walletBalance < entryAmount) {
      toast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_ludo_room', {
        p_entry_amount: actualEntryAmount
      });

      if (error) throw error;
      
      const result = data as { success: boolean; message?: string; room_id?: string; room_code?: string };
      
      if (!result.success) {
        toast.error(result.message || 'Failed to create room');
        return;
      }

      setCreatedRoomCode(result.room_code!);
      setCurrentRoomId(result.room_id!);
      setWaitingForPlayer(true);
      setMode('create');

      const channel = supabase
        .channel(`room-${result.room_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ludo_rooms',
            filter: `id=eq.${result.room_id}`
          },
          (payload) => {
            const newData = payload.new as { status: string; guest_id: string; entry_amount: number; reward_amount: number };
            if (newData.status === 'ready' && newData.guest_id) {
              toast.success(isFreeMatch ? 'Friend joined! Free game starting...' : 'Friend joined! Game starting...');
              onRoomCreated(result.room_id!, result.room_code!, true, newData.entry_amount, newData.reward_amount);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error: any) {
      toast.error(error.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || roomCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('join_ludo_room', {
        p_room_code: roomCode.toUpperCase()
      });

      if (error) throw error;
      
      const result = data as { success: boolean; message?: string; room_id?: string; room_code?: string; entry_amount?: number; reward_amount?: number };
      
      if (!result.success) {
        toast.error(result.message || 'Failed to join room');
        return;
      }

      toast.success('Joined room! Game starting...');
      onRoomCreated(result.room_id!, result.room_code!, false, result.entry_amount || entryAmount, result.reward_amount || rewardAmount);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRoom = async () => {
    if (!currentRoomId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('cancel_ludo_room', {
        p_room_id: currentRoomId
      });

      if (error) throw error;
      
      const result = data as { success: boolean; message?: string };
      
      if (result.success) {
        toast.success('Room cancelled. Amount refunded!');
      }
      onBack();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel room');
    } finally {
      setIsLoading(false);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Mode Selection
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="h-10 w-10 rounded-xl bg-card/50 border border-border/50 hover:bg-card"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Friend Match</h1>
            <p className="text-xs text-muted-foreground">Challenge your friends</p>
          </div>
        </motion.div>

        {/* Free Match Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <div className="grid grid-cols-2 gap-3">
            {/* Paid Match Option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFreeMatch(false)}
              className={`relative p-4 rounded-xl transition-all duration-300 overflow-hidden ${
                !isFreeMatch
                  ? 'bg-gradient-to-br from-yellow-500/20 via-card to-amber-600/10 border-2 border-yellow-500/50'
                  : 'bg-card/50 border-2 border-border/50'
              }`}
            >
              {!isFreeMatch && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at 50% 30%, rgba(255,193,7,0.2) 0%, transparent 60%)',
                  }}
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              )}
              <div className="relative flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  !isFreeMatch 
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-600' 
                    : 'bg-muted'
                }`}>
                  <Coins className={`w-6 h-6 ${!isFreeMatch ? 'text-amber-900' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-center">
                  <p className={`font-bold text-sm ${!isFreeMatch ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Paid Match
                  </p>
                  <p className={`text-xs ${!isFreeMatch ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                    Win ₹{Math.floor(entryAmount * 1.5)}
                  </p>
                </div>
              </div>
              {!isFreeMatch && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-amber-900" />
                </motion.div>
              )}
            </motion.button>

            {/* Free Match Option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFreeMatch(true)}
              className={`relative p-4 rounded-xl transition-all duration-300 overflow-hidden ${
                isFreeMatch
                  ? 'bg-gradient-to-br from-purple-500/20 via-card to-violet-600/10 border-2 border-purple-500/50'
                  : 'bg-card/50 border-2 border-border/50'
              }`}
            >
              {isFreeMatch && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at 50% 30%, rgba(168,85,247,0.2) 0%, transparent 60%)',
                  }}
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              )}
              <div className="relative flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isFreeMatch 
                    ? 'bg-gradient-to-br from-purple-400 to-violet-600' 
                    : 'bg-muted'
                }`}>
                  <Gift className={`w-6 h-6 ${isFreeMatch ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-center">
                  <p className={`font-bold text-sm ${isFreeMatch ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Free Match
                  </p>
                  <p className={`text-xs ${isFreeMatch ? 'text-purple-400' : 'text-muted-foreground'}`}>
                    Just for fun!
                  </p>
                </div>
              </div>
              {isFreeMatch && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Prize Pool Card - Shows based on match type */}
        <AnimatePresence mode="wait">
          {isFreeMatch ? (
            <motion.div
              key="free-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative mb-6 p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 via-card to-violet-500/10 border border-purple-500/30 overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl" />
              
              <div className="relative text-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-500/30"
                >
                  <Gift className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="font-bold text-lg text-foreground mb-1">Free Match</h3>
                <p className="text-sm text-purple-400">Play for fun, no money involved!</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Winner gets bragging rights 🏆</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="paid-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative mb-6 p-5 rounded-2xl bg-gradient-to-br from-primary/20 via-card to-primary/10 border border-primary/30 overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-yellow-500/20 rounded-full blur-2xl" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Entry Fee</p>
                    <p className="text-2xl font-bold text-foreground">₹{entryAmount}</p>
                  </div>
                </div>
                
                <div className="text-center px-4">
                  <Sparkles className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground">1.5x</span>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Winner Gets</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">₹{rewardAmount}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode Selection Cards */}
        <div className="grid gap-4">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCreateRoom()}
            disabled={(!isFreeMatch && walletBalance < entryAmount) || isLoading}
            className="relative p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-card to-emerald-600/10 border border-emerald-500/30 text-left disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
          >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Link2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-foreground">Create Room</h3>
                  {isFreeMatch && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-semibold">
                      FREE
                    </span>
                  )}
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />}
                </div>
                <p className="text-sm text-muted-foreground">Get a unique code to share with your friend</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <ArrowLeft className="w-4 h-4 text-emerald-400 rotate-180" />
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('join')}
            className="relative p-5 rounded-2xl bg-gradient-to-br from-blue-500/20 via-card to-blue-600/10 border border-blue-500/30 text-left overflow-hidden group"
          >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <UserPlus className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground">Join Room</h3>
                <p className="text-sm text-muted-foreground">Enter your friend's room code to join</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ArrowLeft className="w-4 h-4 text-blue-400 rotate-180" />
              </div>
            </div>
          </motion.button>
        </div>

        {!isFreeMatch && walletBalance < entryAmount && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-center"
          >
            <p className="text-sm text-destructive">
              ⚠️ Insufficient balance. Need ₹{entryAmount}
            </p>
          </motion.div>
        )}

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-xl bg-card/50 border border-border/50"
        >
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-primary" />
            How it works
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>1. Create a room or join using a friend's code</p>
            {isFreeMatch ? (
              <>
                <p>2. No entry fee required - completely free!</p>
                <p>3. Play for fun and bragging rights 🎉</p>
              </>
            ) : (
              <>
                <p>2. Both players pay ₹{entryAmount} entry fee</p>
                <p>3. Winner takes ₹{rewardAmount} (1.5x pool)</p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Create Room - Waiting for player
  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCancelRoom}
            disabled={isLoading}
            className="h-10 w-10 rounded-xl bg-card/50 border border-border/50 hover:bg-card"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Room Created</h1>
            <p className="text-xs text-muted-foreground">Share code with your friend</p>
          </div>
        </motion.div>

        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6"
          >
            {/* Room Code Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/20 via-card to-purple-500/10 border border-primary/30 overflow-hidden"
            >
              {/* Animated background */}
              <div className="absolute inset-0 opacity-30">
                <motion.div
                  className="absolute top-1/2 left-1/2 w-64 h-64 -translate-x-1/2 -translate-y-1/2 bg-primary/30 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
              
              <div className="relative text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Hash className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">Room Code</p>
                </div>
                
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex gap-1.5">
                    {createdRoomCode.split('').map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="w-11 h-14 rounded-lg bg-background/80 border border-border flex items-center justify-center font-mono text-2xl font-bold text-foreground"
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyRoomCode}
                    className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 hover:bg-primary/30"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-primary" />
                    )}
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Share this code with your friend to join
                </p>
              </div>
            </motion.div>

            {/* Waiting Animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative py-8 flex flex-col items-center"
            >
              {/* Radar animation */}
              <div className="relative w-32 h-32 mb-4">
                {[1, 2, 3].map((ring) => (
                  <motion.div
                    key={ring}
                    className="absolute inset-0 rounded-full border-2 border-primary/30"
                    animate={{
                      scale: [1, 2],
                      opacity: [0.6, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: ring * 0.4,
                      ease: "easeOut",
                    }}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/50 flex items-center justify-center">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                </div>
              </div>
              
              <p className="text-base font-medium text-foreground mb-2">Waiting for friend...</p>
              <p className="text-xs text-muted-foreground">They need to enter the code above</p>
              
              {/* Connection Status */}
              <div className="flex items-center justify-center gap-3 mt-4">
                {pingLatency !== null && pingLatency !== undefined && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                    pingLatency < 100 ? 'bg-emerald-500/20 border border-emerald-500/30' : 
                    pingLatency < 200 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-red-500/20 border border-red-500/30'
                  }`}>
                    <Signal className={`w-3.5 h-3.5 ${
                      pingLatency < 100 ? 'text-emerald-400' : 
                      pingLatency < 200 ? 'text-yellow-400' : 'text-red-400'
                    }`} />
                    <span className={`text-xs font-mono ${
                      pingLatency < 100 ? 'text-emerald-400' : 
                      pingLatency < 200 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {pingLatency}ms
                    </span>
                  </div>
                )}
                
                {opponentOnline !== undefined && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                    opponentOnline ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-muted/50 border border-border'
                  }`}>
                    {opponentOnline ? (
                      <>
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-emerald-400">Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Waiting...</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Prize Info - Conditional based on free match */}
            {isFreeMatch ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30"
              >
                <div className="flex items-center justify-center gap-3">
                  <Gift className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">Free Match - Just for Fun!</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-xl bg-card/50 border border-border/50"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-muted-foreground">Your Entry</span>
                  <span className="text-sm font-medium text-foreground">₹{entryAmount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Winner Prize
                  </span>
                  <span className="text-lg font-bold text-yellow-400">₹{rewardAmount}</span>
                </div>
              </motion.div>
            )}

            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={handleCancelRoom}
              disabled={isLoading}
              className="w-full py-6 border-destructive/50 text-destructive hover:bg-destructive/10 rounded-xl"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isFreeMatch ? 'Cancel Room' : 'Cancel & Get Refund'}
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Join Room
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 pb-24">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setMode('select')}
          className="h-10 w-10 rounded-xl bg-card/50 border border-border/50 hover:bg-card"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Join Room</h1>
          <p className="text-xs text-muted-foreground">Enter friend's room code</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Code Input Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 via-card to-blue-600/10 border border-blue-500/30 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Hash className="w-5 h-5 text-blue-400" />
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Enter 6-Digit Code</p>
            </div>
            
            <Input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="000000"
              className="text-center text-3xl font-mono tracking-[0.5em] bg-background/50 border-border/50 text-foreground h-16 rounded-xl"
              maxLength={6}
            />
          </div>
        </motion.div>

        {/* Balance Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-card/50 border border-border/50"
        >
          <p className="text-xs text-muted-foreground text-center mb-3">
            Entry fee will be deducted upon joining
          </p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Your Balance</span>
            <span className="text-base font-medium text-foreground">₹{walletBalance.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Join Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handleJoinRoom}
            disabled={roomCode.length !== 6 || isLoading}
            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl shadow-lg shadow-blue-500/25"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                Join Room
              </>
            )}
          </Button>
        </motion.div>

        {/* Prize Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20"
        >
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-muted-foreground">Winner takes</span>
            <span className="text-lg font-bold text-yellow-400">1.5x</span>
            <span className="text-sm text-muted-foreground">of combined entry</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default FriendMultiplayer;
