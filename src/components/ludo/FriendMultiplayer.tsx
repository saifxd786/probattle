import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Check, ArrowLeft, Loader2, Signal, Wifi, WifiOff, Gamepad2, Hash, Trophy, Coins, UserPlus, Link2, Gift, Zap, Crown, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface FriendMultiplayerProps {
  entryAmount: number;
  walletBalance: number;
  onRoomCreated: (roomId: string, roomCode: string, isHost: boolean, entryAmount: number, rewardAmount: number, playerCount?: number) => void;
  onBack: () => void;
  pingLatency?: number | null;
  opponentOnline?: boolean;
}

// Player mode options
type PlayerMode = 2 | 3 | 4;

const PLAYER_MODES: { mode: PlayerMode; label: string; icon: any; multiplier: string; description: string }[] = [
  { mode: 2, label: '1v1', icon: Swords, multiplier: '1.8x', description: '2 players' },
  { mode: 3, label: '1v1v1', icon: Users, multiplier: '2.7x', description: '3 players' },
  { mode: 4, label: '1v1v1v1', icon: Crown, multiplier: '3.6x', description: '4 players - Winner Takes All' },
];

// Calculate reward based on player count
// Platform takes ~10% commission, winner gets rest
const calculateReward = (entryAmount: number, playerCount: PlayerMode): number => {
  if (entryAmount === 0) return 0;
  switch (playerCount) {
    case 2: return Math.floor(entryAmount * 2 * 0.9); // 1.8x - 10% platform fee
    case 3: return Math.floor(entryAmount * 3 * 0.9); // 2.7x - 10% platform fee  
    case 4: return Math.floor(entryAmount * 4 * 0.9); // 3.6x - Winner takes all (10% fee)
    default: return Math.floor(entryAmount * 1.8);
  }
};

interface RoomPlayer {
  user_id: string;
  username: string;
  avatar_url: string | null;
  player_color: string;
  slot_index: number;
}

// Entry amounts for friend matches
const FRIEND_ENTRY_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000];

const FriendMultiplayer = ({ 
  entryAmount: initialEntryAmount, 
  walletBalance, 
  onRoomCreated, 
  onBack,
  pingLatency,
  opponentOnline
}: FriendMultiplayerProps) => {
  const [mode, setMode] = useState<'select' | 'create' | 'join' | 'confirm-join'>('select');
  const [roomCode, setRoomCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitingForPlayer, setWaitingForPlayer] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isFreeMatch, setIsFreeMatch] = useState(false);
  const [playerMode, setPlayerMode] = useState<PlayerMode>(2);
  const [currentPlayers, setCurrentPlayers] = useState<RoomPlayer[]>([]);
  const [roomPlayerCount, setRoomPlayerCount] = useState<number>(2);
  const [selectedEntryAmount, setSelectedEntryAmount] = useState(initialEntryAmount || 50);
  
  // Room preview info for join confirmation
  const [roomPreview, setRoomPreview] = useState<{
    roomCode: string;
    entryAmount: number;
    rewardAmount: number;
    isFree: boolean;
    hostName: string;
    hostAvatar: string | null;
    playerCount: number;
    currentPlayers: number;
    players: RoomPlayer[];
  } | null>(null);

  const actualEntryAmount = isFreeMatch ? 0 : selectedEntryAmount;
  const rewardAmount = calculateReward(actualEntryAmount, playerMode);

  const handleCreateRoom = async () => {
    if (!isFreeMatch && walletBalance < selectedEntryAmount) {
      toast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);
    try {
      // Use multiplayer RPC for all modes
      const { data, error } = await supabase.rpc('create_ludo_room_multiplayer', {
        p_entry_amount: actualEntryAmount,
        p_player_count: playerMode
      });

      if (error) throw error;
      
      const result = data as { 
        success: boolean; 
        message?: string; 
        room_id?: string; 
        room_code?: string;
        player_count?: number;
        player_color?: string;
      };
      
      if (!result.success) {
        toast.error(result.message || 'Failed to create room');
        return;
      }

      setCreatedRoomCode(result.room_code!);
      setCurrentRoomId(result.room_id!);
      setRoomPlayerCount(result.player_count || playerMode);
      setWaitingForPlayer(true);
      setMode('create');

      // Subscribe to both room updates and player joins
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
            const newData = payload.new as { status: string; player_count: number; entry_amount: number; reward_amount: number };
            if (newData.status === 'ready') {
              toast.success(isFreeMatch ? 'All players joined! Free game starting...' : 'All players joined! Game starting...');
              onRoomCreated(result.room_id!, result.room_code!, true, newData.entry_amount, newData.reward_amount, newData.player_count);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ludo_room_players',
            filter: `room_id=eq.${result.room_id}`
          },
          async () => {
            // Refresh player list when someone joins
            const { data: players } = await supabase
              .from('ludo_room_players')
              .select('user_id, player_color, slot_index')
              .eq('room_id', result.room_id!);
            
            if (players) {
              // Get usernames
              const userIds = players.map(p => p.user_id);
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', userIds);
              
              const playersWithNames: RoomPlayer[] = players.map(p => {
                const profile = profiles?.find(pr => pr.id === p.user_id);
                return {
                  user_id: p.user_id,
                  username: profile?.username || 'Player',
                  avatar_url: profile?.avatar_url || null,
                  player_color: p.player_color,
                  slot_index: p.slot_index
                };
              });
              setCurrentPlayers(playersWithNames);
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

  // Check room info before joining
  const handleCheckRoom = async () => {
    if (!roomCode.trim() || roomCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      // Use multiplayer check function
      const { data, error } = await supabase.rpc('check_ludo_room_multiplayer', {
        p_room_code: roomCode.toUpperCase()
      });

      if (error) throw error;
      
      const result = data as unknown as { 
        success: boolean; 
        message?: string; 
        room_code?: string; 
        entry_amount?: number; 
        reward_amount?: number;
        is_free?: boolean;
        host_name?: string;
        host_avatar?: string | null;
        player_count?: number;
        current_players?: number;
        players?: RoomPlayer[];
        is_full?: boolean;
      };
      
      if (!result.success) {
        toast.error(result.message || 'Room not found');
        return;
      }

      if (result.is_full) {
        toast.error('Room is full');
        return;
      }

      // Set room preview and switch to confirmation mode
      setRoomPreview({
        roomCode: result.room_code!,
        entryAmount: result.entry_amount || 0,
        rewardAmount: result.reward_amount || 0,
        isFree: result.is_free || false,
        hostName: result.host_name || 'Unknown',
        hostAvatar: result.host_avatar || null,
        playerCount: result.player_count || 2,
        currentPlayers: result.current_players || 1,
        players: result.players || []
      });
      setMode('confirm-join');
    } catch (error: any) {
      toast.error(error.message || 'Failed to check room');
    } finally {
      setIsLoading(false);
    }
  };

  // Actually join the room after confirmation
  const handleJoinRoom = async () => {
    if (!roomPreview) return;

    // Check wallet balance if paid match
    if (!roomPreview.isFree && walletBalance < roomPreview.entryAmount) {
      toast.error(`Insufficient balance. Need ₹${roomPreview.entryAmount}`);
      return;
    }

    setIsLoading(true);
    try {
      // Use multiplayer join function
      const { data, error } = await supabase.rpc('join_ludo_room_multiplayer', {
        p_room_code: roomPreview.roomCode
      });

      if (error) throw error;
      
      const result = data as { 
        success: boolean; 
        message?: string; 
        room_id?: string; 
        room_code?: string; 
        entry_amount?: number; 
        reward_amount?: number;
        player_count?: number;
        is_full?: boolean;
      };
      
      if (!result.success) {
        toast.error(result.message || 'Failed to join room');
        return;
      }

      if (result.is_full) {
        toast.success('Joined room! Game starting...');
        onRoomCreated(
          result.room_id!, 
          result.room_code!, 
          false, 
          result.entry_amount || roomPreview.entryAmount, 
          result.reward_amount || roomPreview.rewardAmount,
          result.player_count || roomPreview.playerCount
        );
      } else {
        // Not full yet - wait for more players
        toast.success('Joined room! Waiting for more players...');
        setCurrentRoomId(result.room_id!);
        setCreatedRoomCode(result.room_code!);
        setRoomPlayerCount(result.player_count || roomPreview.playerCount);
        setWaitingForPlayer(true);
        setMode('create'); // Show waiting screen
        
        // Subscribe to room updates
        const channel = supabase
          .channel(`room-join-${result.room_id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'ludo_rooms',
              filter: `id=eq.${result.room_id}`
            },
            (payload) => {
              const newData = payload.new as { status: string; entry_amount: number; reward_amount: number; player_count: number };
              if (newData.status === 'ready') {
                toast.success('All players joined! Game starting...');
                onRoomCreated(result.room_id!, result.room_code!, false, newData.entry_amount, newData.reward_amount, newData.player_count);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'ludo_room_players',
              filter: `room_id=eq.${result.room_id}`
            },
            async () => {
              // Refresh player list
              const { data: players } = await supabase
                .from('ludo_room_players')
                .select('user_id, player_color, slot_index')
                .eq('room_id', result.room_id!);
              
              if (players) {
                const userIds = players.map(p => p.user_id);
                const { data: profiles } = await supabase
                  .from('profiles')
                  .select('id, username, avatar_url')
                  .in('id', userIds);
                
                const playersWithNames: RoomPlayer[] = players.map(p => {
                  const profile = profiles?.find(pr => pr.id === p.user_id);
                  return {
                    user_id: p.user_id,
                    username: profile?.username || 'Player',
                    avatar_url: profile?.avatar_url || null,
                    player_color: p.player_color,
                    slot_index: p.slot_index
                  };
                });
                setCurrentPlayers(playersWithNames);
              }
            }
          )
          .subscribe();
      }
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
      // Use multiplayer cancel function
      const { data, error } = await supabase.rpc('cancel_ludo_room_multiplayer', {
        p_room_id: currentRoomId
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; message?: string };
      
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
      <div className="min-h-[100dvh] bg-[#0A0A0F] p-4 pb-24">
        {/* Subtle gradient background */}
        <div 
          className="fixed inset-0 -z-10 pointer-events-none"
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
          className="fixed inset-0 -z-[5] opacity-[0.03] pointer-events-none"
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
            type="button"
            onClick={() => onBack()}
            className="w-10 h-10 rounded-xl bg-gray-900/50 border border-gray-800 flex items-center justify-center hover:bg-gray-800/50 active:scale-95 transition-all"
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
                  Win ₹{Math.floor(selectedEntryAmount * 1.5)}
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

        {/* Player Mode Selector - 1v1, 1v1v1, 1v1v1v1 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-5"
        >
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Game Mode</p>
          <div className="grid grid-cols-3 gap-2">
            {PLAYER_MODES.map((pm) => {
              const Icon = pm.icon;
              const isSelected = playerMode === pm.mode;
              const modeReward = calculateReward(actualEntryAmount, pm.mode);
              
              return (
                <button
                  key={pm.mode}
                  onClick={() => setPlayerMode(pm.mode)}
                  className={`relative p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-violet-500/15 border-violet-500/50'
                      : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-violet-500' : 'bg-gray-800'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {pm.label}
                    </p>
                    <p className={`text-[10px] ${isSelected ? 'text-violet-400' : 'text-gray-600'}`}>
                      {pm.multiplier}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Entry Amount Selector - Only show for paid matches */}
        {!isFreeMatch && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="mb-5"
          >
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Entry Amount</p>
            <div className="grid grid-cols-4 gap-2">
              {FRIEND_ENTRY_AMOUNTS.map((amount) => {
                const isSelected = selectedEntryAmount === amount;
                const canAfford = walletBalance >= amount;
                
                return (
                  <button
                    key={amount}
                    onClick={() => canAfford && setSelectedEntryAmount(amount)}
                    disabled={!canAfford}
                    className={`relative py-2.5 px-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50'
                        : canAfford
                        ? 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                        : 'bg-gray-900/30 border-gray-800/50 opacity-50'
                    }`}
                    style={{ border: '1px solid' }}
                  >
                    <p className={`font-bold text-sm ${
                      isSelected ? 'text-emerald-400' : canAfford ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      ₹{amount}
                    </p>
                    {isSelected && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

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
              <p className="text-sm font-medium text-white">Free Match • {PLAYER_MODES.find(p => p.mode === playerMode)?.label}</p>
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
                    <p className="text-[10px] text-gray-500 uppercase">Entry ({playerMode} players)</p>
                    <p className="text-lg font-bold text-white">₹{selectedEntryAmount}</p>
                  </div>
                </div>
                
                <div className="text-center px-3">
                  <Zap className="w-4 h-4 text-indigo-400 mx-auto" />
                  <span className="text-[10px] text-gray-500">{PLAYER_MODES.find(p => p.mode === playerMode)?.multiplier}</span>
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
            disabled={(!isFreeMatch && walletBalance < selectedEntryAmount) || isLoading}
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
        {!isFreeMatch && walletBalance < selectedEntryAmount && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center"
          >
            <p className="text-sm text-red-400">⚠️ Insufficient balance. Need ₹{selectedEntryAmount}</p>
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
                <p>2. Both players pay ₹{selectedEntryAmount} entry</p>
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
      <div className="min-h-[100dvh] bg-[#0A0A0F] p-4 pb-24">
        {/* Background */}
        <div 
          className="fixed inset-0 -z-10 pointer-events-none"
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
            type="button"
            onClick={() => handleCancelRoom()}
            disabled={isLoading}
            className="w-10 h-10 rounded-xl bg-gray-900/50 border border-gray-800 flex items-center justify-center hover:bg-gray-800/50 active:scale-95 transition-all disabled:opacity-50"
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

        {/* Player Slots for Multi-player */}
        {roomPlayerCount > 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 mb-4"
          >
            <p className="text-xs text-gray-500 uppercase mb-3 text-center">
              Players ({currentPlayers.length}/{roomPlayerCount})
            </p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: roomPlayerCount }).map((_, i) => {
                const player = currentPlayers.find(p => p.slot_index === i);
                const colors = ['red', 'green', 'yellow', 'blue'];
                const colorStyles: Record<string, string> = {
                  red: 'border-red-500/50 bg-red-500/10',
                  green: 'border-green-500/50 bg-green-500/10',
                  yellow: 'border-yellow-500/50 bg-yellow-500/10',
                  blue: 'border-blue-500/50 bg-blue-500/10'
                };
                
                return (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border text-center ${
                      player ? colorStyles[colors[i]] : 'border-gray-700 bg-gray-800/50'
                    }`}
                  >
                    {player ? (
                      <>
                        <Avatar className="w-8 h-8 mx-auto mb-1">
                          <AvatarImage src={player.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{player.username[0]}</AvatarFallback>
                        </Avatar>
                        <p className="text-[10px] text-white truncate">{player.username}</p>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 mx-auto mb-1 rounded-full border border-dashed border-gray-600 flex items-center justify-center">
                          <Users className="w-3 h-3 text-gray-600" />
                        </div>
                        <p className="text-[10px] text-gray-600">Waiting...</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Waiting Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center py-6"
        >
          {/* Radar */}
          <div className="relative w-24 h-24 mb-4">
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
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
              >
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <p className="text-sm font-medium text-white mb-1">
            {roomPlayerCount > 2 
              ? `Waiting for ${roomPlayerCount - currentPlayers.length} more player${roomPlayerCount - currentPlayers.length > 1 ? 's' : ''}...` 
              : 'Waiting for friend...'}
          </p>
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
                <span className="text-sm font-medium text-white">₹{selectedEntryAmount}</span>
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

  // Join Confirmation Screen - Shows room info before joining
  if (mode === 'confirm-join' && roomPreview) {
    const hasEnoughBalance = roomPreview.isFree || walletBalance >= roomPreview.entryAmount;
    
    return (
      <div className="min-h-[100dvh] bg-[#0A0A0F] p-4 pb-24">
        {/* Background */}
        <div 
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 50% 50%, ${roomPreview.isFree ? 'rgba(99, 102, 241, 0.08)' : 'rgba(245, 158, 11, 0.08)'} 0%, transparent 50%),
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
            type="button"
            onClick={() => {
              setMode('join');
              setRoomPreview(null);
            }}
            className="w-10 h-10 rounded-xl bg-gray-900/50 border border-gray-800 flex items-center justify-center hover:bg-gray-800/50 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-white">Confirm Join</h1>
            <p className="text-xs text-gray-500">Review room details</p>
          </div>
        </motion.div>

        {/* Room Info Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`p-5 rounded-xl border mb-5 ${
            roomPreview.isFree 
              ? 'bg-indigo-500/10 border-indigo-500/30' 
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          {/* Room Code */}
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Room Code</p>
            <p className="font-mono text-2xl font-bold text-white tracking-[0.3em]">
              {roomPreview.roomCode}
            </p>
          </div>

          {/* Match Type Badge */}
          <div className="flex justify-center mb-4">
            {roomPreview.isFree ? (
              <div className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-indigo-400" />
                  <span className="font-semibold text-indigo-400">FREE MATCH</span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-amber-400">PAID MATCH</span>
                </div>
              </div>
            )}
          </div>

          {/* Host Info */}
          <div className="flex items-center justify-center gap-3 mb-4 p-3 rounded-lg bg-gray-900/50">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
              {roomPreview.hostAvatar ? (
                <img src={roomPreview.hostAvatar} alt="Host" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Created by</p>
              <p className="text-sm font-medium text-white">{roomPreview.hostName}</p>
            </div>
          </div>

          {/* Entry & Prize */}
          {!roomPreview.isFree && (
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-lg bg-gray-900/50">
                <span className="text-xs text-gray-500">Entry Fee</span>
                <span className="text-lg font-bold text-white">₹{roomPreview.entryAmount}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-500/10">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  Winner Prize
                </span>
                <span className="text-lg font-bold text-emerald-400">₹{roomPreview.rewardAmount}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Balance Check */}
        {!roomPreview.isFree && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`p-3 rounded-xl border mb-5 ${
              hasEnoughBalance 
                ? 'bg-gray-900/50 border-gray-800' 
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Your Balance</span>
              <span className={`text-sm font-medium ${hasEnoughBalance ? 'text-white' : 'text-red-400'}`}>
                ₹{walletBalance.toFixed(2)}
              </span>
            </div>
            {!hasEnoughBalance && (
              <p className="text-xs text-red-400 mt-2 text-center">
                ⚠️ Need ₹{(roomPreview.entryAmount - walletBalance).toFixed(2)} more
              </p>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleJoinRoom}
            disabled={!hasEnoughBalance || isLoading}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: roomPreview.isFree 
                ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
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
                {roomPreview.isFree ? 'Join Free Match' : `Join & Pay ₹${roomPreview.entryAmount}`}
              </>
            )}
          </motion.button>

          <button
            onClick={() => {
              setMode('join');
              setRoomPreview(null);
            }}
            className="w-full py-3 rounded-xl bg-gray-900/50 border border-gray-800 text-gray-400 font-medium text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Join Room Screen - Enter code
  return (
    <div className="min-h-[100dvh] bg-[#0A0A0F] p-4 pb-24">
      {/* Background */}
      <div 
        className="fixed inset-0 -z-10 pointer-events-none"
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
          type="button"
          onClick={() => setMode('select')}
          className="w-10 h-10 rounded-xl bg-gray-900/50 border border-gray-800 flex items-center justify-center hover:bg-gray-800/50 active:scale-95 transition-all"
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
          Room type will be shown after entering code
        </p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Your Balance</span>
          <span className="text-sm font-medium text-white">₹{walletBalance.toFixed(2)}</span>
        </div>
      </motion.div>

      {/* Check Room Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={handleCheckRoom}
        disabled={roomCode.length !== 6 || isLoading}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Hash className="w-4 h-4" />
            Check Room
          </>
        )}
      </motion.button>

      {/* Info Note */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center"
      >
        <p className="text-xs text-gray-400">
          You'll see the room details (paid/free, entry amount) before joining
        </p>
      </motion.div>
    </div>
  );
};

export default FriendMultiplayer;
