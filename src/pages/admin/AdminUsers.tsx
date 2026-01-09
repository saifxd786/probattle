import { useEffect, useState } from 'react';
import { Search, Ban, CheckCircle, Shield, ShieldOff, Gamepad2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import BanUserDialog from '@/components/admin/BanUserDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  wallet_balance: number;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_games: string[] | null;
  device_fingerprint: string | null;
  created_at: string;
};

type UserRole = {
  user_id: string;
  role: string;
};

const AdminUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<Profile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } else {
      setUsers(profiles || []);

      // Fetch roles for all users
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      
      const rolesMap: Record<string, string[]> = {};
      roles?.forEach((r: UserRole) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });
      setUserRoles(rolesMap);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBanClick = (user: Profile) => {
    if (user.is_banned) {
      // Unban directly
      unbanUser(user.id);
    } else {
      // Open ban dialog
      setUserToBan(user);
      setBanDialogOpen(true);
    }
  };

  const banUser = async (
    reason: string, 
    banType: 'full' | 'game', 
    selectedGames?: string[],
    deviceBan?: boolean
  ) => {
    if (!userToBan) return;

    const updateData: Record<string, any> = {
      ban_reason: reason,
      banned_at: new Date().toISOString(),
    };

    if (banType === 'full') {
      updateData.is_banned = true;
      updateData.banned_games = [];
    } else if (banType === 'game' && selectedGames) {
      updateData.is_banned = false;
      updateData.banned_games = selectedGames;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userToBan.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Device ban if enabled
    if (deviceBan && userToBan.device_fingerprint) {
      const { error: deviceError } = await supabase
        .from('device_bans')
        .upsert({
          device_fingerprint: userToBan.device_fingerprint,
          reason: reason,
        }, { onConflict: 'device_fingerprint' });

      if (deviceError) {
        console.error('Device ban error:', deviceError);
      }
    }

    const banDescription = banType === 'full' 
      ? `${userToBan.username || 'User'} has been fully banned`
      : `${userToBan.username || 'User'} has been banned from: ${selectedGames?.join(', ')}`;

    toast({ 
      title: deviceBan ? 'User & Device Banned' : 'User Banned', 
      description: banDescription 
    });
    
    fetchUsers();
    setUserToBan(null);
  };

  const unbanUser = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_games: [],
      })
      .eq('id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User Unbanned', description: 'User has been unbanned successfully' });
      fetchUsers();
    }
  };

  const toggleAdminRole = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Admin role removed' });
        fetchUsers();
      }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Admin role granted' });
        fetchUsers();
      }
    }
  };

  const updateWallet = async (userId: string, amount: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const newBalance = Math.max(0, user.wallet_balance + amount);

    const { error } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Wallet ${amount > 0 ? 'credited' : 'debited'} successfully` });
      fetchUsers();
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    
    try {
      // Delete related data first
      await supabase.from('notifications').delete().eq('user_id', userToDelete.id);
      await supabase.from('support_messages').delete().eq('sender_id', userToDelete.id);
      await supabase.from('support_tickets').delete().eq('user_id', userToDelete.id);
      await supabase.from('transactions').delete().eq('user_id', userToDelete.id);
      await supabase.from('match_registrations').delete().eq('user_id', userToDelete.id);
      await supabase.from('match_results').delete().eq('user_id', userToDelete.id);
      await supabase.from('mines_games').delete().eq('user_id', userToDelete.id);
      await supabase.from('thimble_games').delete().eq('user_id', userToDelete.id);
      await supabase.from('redeem_code_uses').delete().eq('user_id', userToDelete.id);
      await supabase.from('user_roles').delete().eq('user_id', userToDelete.id);
      await supabase.from('referrals').delete().eq('referrer_id', userToDelete.id);
      await supabase.from('referrals').delete().eq('referred_id', userToDelete.id);
      
      // Delete the profile
      const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'User Deleted', description: `${userToDelete.username || 'User'} has been permanently deleted.` });
        fetchUsers();
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete user', variant: 'destructive' });
    }
    
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBanStatus = (user: Profile) => {
    if (user.is_banned) {
      return { text: 'Banned', color: 'bg-red-500/20 text-red-500' };
    }
    if (user.banned_games && user.banned_games.length > 0) {
      return { text: `Game Ban (${user.banned_games.length})`, color: 'bg-yellow-500/20 text-yellow-500' };
    }
    return { text: 'Active', color: 'bg-green-500/20 text-green-500' };
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage platform users and their permissions</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Wallet</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">No users found</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isAdmin = userRoles[user.id]?.includes('admin');
                    const banStatus = getBanStatus(user);
                    return (
                      <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{user.username || 'No username'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">₹{user.wallet_balance}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const amount = prompt('Enter amount to add:');
                                  if (amount) updateWallet(user.id, Number(amount));
                                }}
                              >
                                +
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const amount = prompt('Enter amount to deduct:');
                                  if (amount) updateWallet(user.id, -Number(amount));
                                }}
                              >
                                -
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${banStatus.color}`}>
                              {banStatus.text}
                            </span>
                            {user.banned_games && user.banned_games.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.banned_games.map(game => (
                                  <span key={game} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                                    {game}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              isAdmin
                                ? 'bg-primary/20 text-primary'
                                : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {isAdmin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleBanClick(user)}
                              title={user.is_banned ? 'Unban user' : 'Ban user'}
                            >
                              {user.is_banned ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : user.banned_games && user.banned_games.length > 0 ? (
                                <Gamepad2 className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <Ban className="w-4 h-4 text-destructive" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleAdminRole(user.id, isAdmin)}
                              title={isAdmin ? 'Remove admin' : 'Make admin'}
                            >
                              {isAdmin ? (
                                <ShieldOff className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <Shield className="w-4 h-4 text-primary" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <BanUserDialog
        isOpen={banDialogOpen}
        onClose={() => { setBanDialogOpen(false); setUserToBan(null); }}
        onConfirm={banUser}
        userName={userToBan?.username || 'Unknown User'}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{userToDelete?.username || userToDelete?.email}</strong> and all their data including game history, transactions, and registrations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
