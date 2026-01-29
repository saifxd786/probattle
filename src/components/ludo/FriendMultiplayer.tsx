import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Check, ArrowLeft, Loader2, Signal, Wifi, WifiOff, Gamepad2, Hash, Trophy, Coins, UserPlus, Link2, Gift, Zap } from 'lucide-react';
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

  // Mode Selection - Flat Design
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] p-4 pb-24">
        {/* Subtle gradient background */}
        <div 
          className="fixed inset-0 -z-10"
          style={{
            background: `
              radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 70% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 40%),
              #0A0A0F
            `,
          }}
        />

        {/* Dot pattern */}
        <div 
          className="fixed inset-0 -z-5 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-gray-900/50 border border-gray-800 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-white">Friend Match</h1>
            <p className="text-xs text-gray-500">Challenge your friends</p>
          </div>
        </motion.div>

        {/* Match Type Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-5"
        >
          {/* Paid Match */}
          <button
            onClick={() => setIsFreeMatch(false)}
            className={`relative p-4 rounded-xl border transition-all ${
              !isFreeMatch
                ? 'bg-amber-500/10 border-amber-500/50'
                : 'bg-gray-900/50 border-gray-800'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                !isFreeMatch ? 'bg-amber-500' : 'bg-gray-800'
              }`}>
                <Coins className={`w-5 h-5 ${!isFreeMatch ? 'text-amber-900' : 'text-gray-500'}`} />
              </div>
              <div className="text-center">
                <p className={`font-semibold text-sm ${!isFreeMatch ? 'text-white' : 'text-gray-500'}`}>
                  Paid
                </p>
                <p className={`text-xs ${!isFreeMatch ? 'text-amber-400' : 'text-gray-600'}`}>
                  Win ₹{Math.floor(entryAmount * 1.5)}
                </p>
              </div>
            </div>
            {!isFreeMatch && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-amber-900" />
              </div>
            )}
          </button>

          {/* Free Match */}
          <button
            onClick={() => setIsFreeMatch(true)}
            className={`relative p-4 rounded-xl border transition-all ${
              isFreeMatch
                ? 'bg-indigo-500/10 border-indigo-500/50'
                : 'bg-gray-900/50 border-gray-800'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isFreeMatch ? 'bg-indigo-500' : 'bg-gray-800'
              }`}>
                <Gift className={`w-5 h-5 ${isFreeMatch ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="text-center">
                <p className={`font-semibold text-sm ${isFreeMatch ? 'text-white' : 'text-gray-500'}`}>
                  Free
                </p>
                <p className={`text-xs ${isFreeMatch ? 'text-indigo-400' : 'text-gray-600'}`}>
                  Just for fun!
                </p>
              </div>
            </div>
            {isFreeMatch && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </button>
        </motion.div>

        {/* Prize Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-5"
        >
          {isFreeMatch ? (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center">
              <Gift className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">Free Match</p>
              <p className="text-xs text-indigo-400">Play for fun, no money involved!</p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Entry</p>
                    <p className="text-lg font-bold text-white">₹{entryAmount}</p>
                  </div>
                </div>
                
                <div className="text-center px-3">
                  <Zap className="w-4 h-4 text-indigo-400 mx-auto" />
                  <span className="text-[10px] text-gray-500">1.5x</span>
                </div>
                
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase">Prize</p>
                  <p className="text-lg font-bold text-emerald-400">₹{rewardAmount}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Create Room */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleCreateRoom()}
            disabled={(!isFreeMatch && walletBalance < entryAmount) || isLoading}
            className="w-full p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left disabled:opacity-50 flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Link2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">Create Room</p>
                {isFreeMatch && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-400 text-[10px] font-medium">
                    FREE
                  </span>
                )}
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />}
              </div>
              <p className="text-xs text-gray-500">Get a code to share with friend</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-emerald-400 rotate-180" />
          </motion.button>

          {/* Join Room */}
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => setMode('join')}
            className="w-full p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-left flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Join Room</p>
              <p className="text-xs text-gray-500">Enter friend's room code</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-blue-400 rotate-180" />
          </motion.button>
        </div>

        {/* Insufficient Balance Warning */}
        {!isFreeMatch && walletBalance < entryAmount && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center"
          >
            <p className="text-sm text-red-400">⚠️ Insufficient balance. Need ₹{entryAmount}</p>
          </motion.div>
        )}

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-5 p-4 rounded-xl bg-gray-900/50 border border-gray-800"
        >
          <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-indigo-400" />
            How it works
          </h4>
          <div className="space-y-1.5 text-xs text-gray-500">
            <p>1. Create a room or join using friend's code</p>
            {isFreeMatch ? (
              <>
                <p>2. No entry fee - completely free!</p>
                <p>3. Play for fun and bragging rights 🎉</p>
              </>
            ) : (
              <>
                <p>2. Both players pay ₹{entryAmount} entry</p>
                <p>3. Winner takes ₹{rewardAmount} (1.5x)</p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Create Room - Waiting Screen
  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] p-4 pb-24">
        {/* Background */}
        <div 
          className="fixed inset-0 -z-10"
          style={{
            background: `
              radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
              #0A0A0F
            `,
          }}
        />

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button 
            onClick={handleCancelRoom}
            disabled={isLoading}
            className="w-10 h-10 rounded-xl bg-gray-900/50 border border-gray-800 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-white">Room Created</h1>
            <p className="text-xs text-gray-500">Share code with friend</p>
          </div>
        </motion.div>

        {/* Room Code Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-xl bg-gray-900/50 border border-gray-800 mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-indigo-400" />
            <p className="text-xs text-gray-500 uppercase tracking-wider">Room Code</p>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex gap-1">
              {createdRoomCode.split('').map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  className="w-10 h-12 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center font-mono text-xl font-bold text-white"
                >
                  {char}
                </motion.span>
              ))}
            </div>
            
            <button
              onClick={copyRoomCode}
              className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Copy className="w-5 h-5 text-indigo-400" />
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Share this code with your friend
          </p>
        </motion.div>

        {/* Waiting Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center py-8"
        >
          {/* Radar */}
          <div className="relative w-28 h-28 mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-indigo-500/30"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: [0, 0.5, 0] }}
                transition={{
                  duration: 2,
                  delay: i * 0.5,
                  repeat: Infinity,
                  ease: 'easeOut'
                }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
              >
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <p className="text-sm font-medium text-white mb-1">Waiting for friend...</p>
          <p className="text-xs text-gray-500">They need to enter the code</p>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2 mt-4">
            {pingLatency !== null && pingLatency !== undefined && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                pingLatency < 100 ? 'bg-emerald-500/20 border border-emerald-500/30' : 
                pingLatency < 200 ? 'bg-amber-500/20 border border-amber-500/30' : 
                'bg-red-500/20 border border-red-500/30'
              }`}>
                <Signal className={`w-3 h-3 ${
                  pingLatency < 100 ? 'text-emerald-400' : 
                  pingLatency < 200 ? 'text-amber-400' : 'text-red-400'
                }`} />
                <span className={`text-[10px] font-mono ${
                  pingLatency < 100 ? 'text-emerald-400' : 
                  pingLatency < 200 ? 'text-amber-400' : 'text-red-400'
                }`}>{pingLatency}ms</span>
              </div>
            )}
            
            {opponentOnline !== undefined && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                opponentOnline ? 'bg-emerald-500/20 border border-emerald-500/30' : 
                'bg-gray-800 border border-gray-700'
              }`}>
                {opponentOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500">Waiting</span>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Prize Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-5"
        >
          {isFreeMatch ? (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center">
              <div className="flex items-center justify-center gap-2">
                <Gift className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-indigo-400">Free Match - Just for Fun!</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Your Entry</span>
                <span className="text-sm font-medium text-white">₹{entryAmount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  Winner Prize
                </span>
                <span className="text-base font-bold text-emerald-400">₹{rewardAmount}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Cancel Button */}
        <button
          onClick={handleCancelRoom}
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gray-900/50 border border-red-500/30 text-red-400 font-medium text-sm flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isFreeMatch ? 'Cancel Room' : 'Cancel & Get Refund'}
        </button>
      </div>
    );
  }

  // Join Room Screen
  return (
    <div className="min-h-screen bg-[#0A0A0F] p-4 pb-24">
      {/* Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
            #0A0A0F
          `,
        }}
      />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <button 
          onClick={() => setMode('select')}
          className="w-10 h-10 rounded-xl bg-gray-900/50 border border-gray-800 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 className="font-bold text-lg text-white">Join Room</h1>
          <p className="text-xs text-gray-500">Enter friend's room code</p>
        </div>
      </motion.div>

      {/* Code Input */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-gray-900/50 border border-gray-800 mb-5"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Hash className="w-4 h-4 text-blue-400" />
          <p className="text-xs text-gray-500 uppercase tracking-wider">Enter 6-Digit Code</p>
        </div>
        
        <Input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="000000"
          className="text-center text-2xl font-mono tracking-[0.4em] bg-gray-800/50 border-gray-700 text-white h-14 rounded-xl"
          maxLength={6}
        />
      </motion.div>

      {/* Balance Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-3 rounded-xl bg-gray-900/50 border border-gray-800 mb-5"
      >
        <p className="text-[10px] text-gray-500 text-center mb-2">
          Entry fee will be deducted upon joining
        </p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Your Balance</span>
          <span className="text-sm font-medium text-white">₹{walletBalance.toFixed(2)}</span>
        </div>
      </motion.div>

      {/* Join Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={handleJoinRoom}
        disabled={roomCode.length !== 6 || isLoading}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Joining...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Join Room
          </>
        )}
      </motion.button>

      {/* Prize Preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center"
      >
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-gray-400">Winner takes</span>
          <span className="text-sm font-bold text-amber-400">1.5x</span>
          <span className="text-xs text-gray-400">of combined entry</span>
        </div>
      </motion.div>
    </div>
  );
};

export default FriendMultiplayer;
