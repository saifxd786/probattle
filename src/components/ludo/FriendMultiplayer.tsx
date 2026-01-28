import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Check, ArrowLeft, Loader2, Signal, Wifi, WifiOff } from 'lucide-react';
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

  const rewardAmount = Math.floor(entryAmount * 2 * 1.5);

  const handleCreateRoom = async () => {
    if (walletBalance < entryAmount) {
      toast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_ludo_room', {
        p_entry_amount: entryAmount
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

      // Subscribe to room updates
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
              toast.success('Friend joined! Game starting...');
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
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-display text-xl font-bold text-white">Friend Multiplayer</h2>
        </div>

        {/* Entry Info */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400">Entry Amount</p>
              <p className="text-xl font-bold text-white">₹{entryAmount}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Winner Gets</p>
              <p className="text-xl font-bold text-yellow-400">₹{rewardAmount}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            1.5x of total pool (₹{entryAmount} × 2 = ₹{entryAmount * 2})
          </p>
        </div>

        <div className="grid gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCreateRoom()}
            disabled={walletBalance < entryAmount || isLoading}
            className="p-6 rounded-2xl bg-gradient-to-br from-green-600 to-green-800 text-white text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Create Room</h3>
                <p className="text-sm opacity-80">Get a code to share with friend</p>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('join')}
            className="p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl">#</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Join Room</h3>
                <p className="text-sm opacity-80">Enter friend's room code</p>
              </div>
            </div>
          </motion.button>
        </div>

        {walletBalance < entryAmount && (
          <p className="text-center text-red-400 text-sm">
            ⚠️ Insufficient balance. Need ₹{entryAmount}
          </p>
        )}
      </div>
    );
  }

  // Create Room - Waiting for player
  if (mode === 'create') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={handleCancelRoom} disabled={isLoading}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-display text-xl font-bold text-white">Room Created</h2>
        </div>

        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-6"
          >
            {/* Room Code Display */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/20 border border-purple-500/40">
              <p className="text-sm text-gray-400 mb-2">Share this code with your friend</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-4xl font-bold text-white tracking-widest">
                  {createdRoomCode}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyRoomCode}
                  className="text-white hover:bg-white/10"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Waiting Animation */}
            <div className="py-8">
              <motion.div
                className="w-20 h-20 mx-auto rounded-full border-4 border-yellow-500/30 border-t-yellow-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="mt-4 text-gray-400">Waiting for friend to join...</p>
              
              {/* Connection Status in Waiting Room */}
              <div className="flex items-center justify-center gap-3 mt-4">
                {/* Ping Indicator */}
                {pingLatency !== null && pingLatency !== undefined && (
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                    pingLatency < 100 ? 'bg-green-500/20' : 
                    pingLatency < 200 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                  }`}>
                    <Signal className={`w-4 h-4 ${
                      pingLatency < 100 ? 'text-green-400' : 
                      pingLatency < 200 ? 'text-yellow-400' : 'text-red-400'
                    }`} />
                    <span className={`text-xs font-mono ${
                      pingLatency < 100 ? 'text-green-400' : 
                      pingLatency < 200 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {pingLatency}ms
                    </span>
                  </div>
                )}
                
                {/* Opponent Status */}
                {opponentOnline !== undefined && (
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                    opponentOnline ? 'bg-green-500/20' : 'bg-gray-500/20'
                  }`}>
                    {opponentOnline ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">Friend Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-400">Waiting...</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Prize Info */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Entry Amount</span>
                <span className="text-white">₹{entryAmount}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-400">Winner Prize</span>
                <span className="text-yellow-400 font-bold">₹{rewardAmount}</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleCancelRoom}
              disabled={isLoading}
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cancel & Get Refund
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Join Room
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setMode('select')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-display text-xl font-bold text-white">Join Room</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Enter 6-digit Room Code</label>
          <Input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="000000"
            className="text-center text-2xl font-mono tracking-widest bg-white/5 border-white/20 text-white"
            maxLength={6}
          />
        </div>

        {/* Entry Info */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-400 text-center mb-2">
            Entry fee will be deducted upon joining
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Your Balance</span>
            <span className="text-white">₹{walletBalance.toFixed(2)}</span>
          </div>
        </div>

        <Button
          onClick={handleJoinRoom}
          disabled={roomCode.length !== 6 || isLoading}
          className="w-full py-6 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Joining...
            </>
          ) : (
            'Join Room'
          )}
        </Button>
      </div>
    </div>
  );
};

export default FriendMultiplayer;
