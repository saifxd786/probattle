import { useEffect, useState } from 'react';
import { Search, Eye, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  wallet_balance: number;
  is_banned: boolean;
  ban_reason: string | null;
  banned_games: string[] | null;
  user_code: string | null;
  created_at: string;
};

type UserStats = {
  totalDeposits: number;
  totalWithdrawals: number;
  ludoWins: number;
  ludoLosses: number;
  minesWins: number;
  minesLosses: number;
  thimbleWins: number;
  thimbleLosses: number;
};

const AgentUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchUsers = async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, email, wallet_balance, is_banned, ban_reason, banned_games, user_code, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } else {
      setUsers(profiles || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUserStats = async (userId: string) => {
    setIsLoadingStats(true);
    
    // Fetch transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, amount, status')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const totalDeposits = transactions?.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalWithdrawals = transactions?.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0) || 0;

    // Fetch Ludo stats
    const { data: ludoMatches } = await supabase
      .from('ludo_match_players')
      .select('is_winner')
      .eq('user_id', userId)
      .eq('is_bot', false);

    const ludoWins = ludoMatches?.filter(m => m.is_winner).length || 0;
    const ludoLosses = (ludoMatches?.length || 0) - ludoWins;

    // Fetch Mines stats
    const { data: minesGames } = await supabase
      .from('mines_games')
      .select('is_cashed_out, is_mine_hit')
      .eq('user_id', userId);

    const minesWins = minesGames?.filter(g => g.is_cashed_out).length || 0;
    const minesLosses = minesGames?.filter(g => g.is_mine_hit).length || 0;

    // Fetch Thimble stats
    const { data: thimbleGames } = await supabase
      .from('thimble_games')
      .select('is_win')
      .eq('user_id', userId);

    const thimbleWins = thimbleGames?.filter(g => g.is_win).length || 0;
    const thimbleLosses = thimbleGames?.filter(g => g.is_win === false).length || 0;

    setUserStats({
      totalDeposits,
      totalWithdrawals,
      ludoWins,
      ludoLosses,
      minesWins,
      minesLosses,
      thimbleWins,
      thimbleLosses,
    });
    setIsLoadingStats(false);
  };

  const handleViewUser = (user: Profile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
    fetchUserStats(user.id);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_code?.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Hide phone number from email (format: 9876543210@probattle.app)
  const maskEmail = (email: string | null) => {
    if (!email) return 'N/A';
    // Check if it's a phone-based email
    if (email.includes('@probattle.app') || email.includes('@proscims.app')) {
      return '***@probattle.app';
    }
    // For regular emails, show partial
    const [local, domain] = email.split('@');
    if (local.length <= 3) return `${local}@${domain}`;
    return `${local.slice(0, 3)}***@${domain}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">View platform users and their details</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or user code..."
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
                  <th className="text-left p-4 font-medium text-muted-foreground">User Code</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Wallet</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">No users found</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const banStatus = getBanStatus(user);
                    return (
                      <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-500">
                                {user.username?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-foreground">{user.username || 'No username'}</span>
                              <p className="text-xs text-muted-foreground">{maskEmail(user.email)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-mono text-blue-400">{user.user_code || '-'}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Wallet className="w-4 h-4 text-green-500" />
                            <span className="font-medium text-foreground">₹{user.wallet_balance}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${banStatus.color}`}>
                            {banStatus.text}
                          </span>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewUser(user)}
                            title="View user details"
                          >
                            <Eye className="w-4 h-4 text-blue-500" />
                          </Button>
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

      {/* User Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-500">
                    {selectedUser.username?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedUser.username || 'No username'}</h3>
                  <p className="text-sm text-muted-foreground">Code: {selectedUser.user_code}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Wallet Balance</p>
                  <p className="text-lg font-bold text-green-500">₹{selectedUser.wallet_balance}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className={`text-lg font-bold ${selectedUser.is_banned ? 'text-red-500' : 'text-green-500'}`}>
                    {selectedUser.is_banned ? 'Banned' : 'Active'}
                  </p>
                </div>
              </div>

              {isLoadingStats ? (
                <div className="text-center py-4 text-muted-foreground">Loading stats...</div>
              ) : userStats && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Transaction History</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-green-500/10 text-center">
                      <p className="text-xs text-muted-foreground">Total Deposits</p>
                      <p className="font-bold text-green-500">₹{userStats.totalDeposits}</p>
                    </div>
                    <div className="p-2 rounded bg-orange-500/10 text-center">
                      <p className="text-xs text-muted-foreground">Total Withdrawals</p>
                      <p className="font-bold text-orange-500">₹{userStats.totalWithdrawals}</p>
                    </div>
                  </div>

                  <h4 className="font-medium text-sm text-muted-foreground">Game Stats</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-secondary/50 text-center">
                      <p className="text-xs text-muted-foreground">Ludo</p>
                      <p className="text-sm">
                        <span className="text-green-500">{userStats.ludoWins}W</span>
                        {' / '}
                        <span className="text-red-500">{userStats.ludoLosses}L</span>
                      </p>
                    </div>
                    <div className="p-2 rounded bg-secondary/50 text-center">
                      <p className="text-xs text-muted-foreground">Mines</p>
                      <p className="text-sm">
                        <span className="text-green-500">{userStats.minesWins}W</span>
                        {' / '}
                        <span className="text-red-500">{userStats.minesLosses}L</span>
                      </p>
                    </div>
                    <div className="p-2 rounded bg-secondary/50 text-center">
                      <p className="text-xs text-muted-foreground">Thimble</p>
                      <p className="text-sm">
                        <span className="text-green-500">{userStats.thimbleWins}W</span>
                        {' / '}
                        <span className="text-red-500">{userStats.thimbleLosses}L</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center pt-2">
                Joined: {format(new Date(selectedUser.created_at), 'MMMM dd, yyyy')}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentUsers;