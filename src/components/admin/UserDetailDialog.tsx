import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, Wallet, Phone, Mail, Calendar, Shield, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, XCircle, AlertCircle, Globe, Smartphone, MapPin } from 'lucide-react';

interface UserDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  wallet_balance: number;
  user_code: string | null;
  referral_code: string | null;
  referred_by: string | null;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_games: string[] | null;
  created_at: string;
  wager_requirement: number | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  upi_id: string | null;
  utr_id: string | null;
  created_at: string;
  description: string | null;
}

interface LoginSession {
  id: string;
  ip_address: string | null;
  device_name: string | null;
  device_fingerprint: string | null;
  created_at: string;
}

interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  regionName: string;
  isp: string;
}

const UserDetailDialog = ({ isOpen, onClose, userId }: UserDetailDialogProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loginSessions, setLoginSessions] = useState<LoginSession[]>([]);
  const [geoLocations, setGeoLocations] = useState<Record<string, GeoLocation | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    approvedWithdrawals: 0,
    cancelledWithdrawals: 0,
    minesGames: 0,
    thimbleGames: 0,
    ludoGames: 0,
  });

  useEffect(() => {
    if (userId && isOpen) {
      fetchUserDetails();
    }
  }, [userId, isOpen]);

  const fetchGeoLocations = async (ipAddresses: string[]) => {
    const uniqueIps = [...new Set(ipAddresses.filter(ip => ip && !geoLocations[ip]))];
    if (uniqueIps.length === 0) return;
    
    setIsLoadingGeo(true);
    try {
      const { data, error } = await supabase.functions.invoke('ip-geolocation', {
        body: { ip_addresses: uniqueIps }
      });
      
      if (!error && data?.locations) {
        setGeoLocations(prev => ({ ...prev, ...data.locations }));
      }
    } catch (err) {
      console.error('Failed to fetch geolocation:', err);
    }
    setIsLoadingGeo(false);
  };

  useEffect(() => {
    if (userId && isOpen) {
      fetchUserDetails();
    }
  }, [userId, isOpen]);

  const fetchUserDetails = async () => {
    if (!userId) return;
    setIsLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setTransactions(txData || []);

    // Calculate stats
    const deposits = txData?.filter(t => t.type === 'deposit' && t.status === 'completed') || [];
    const withdrawals = txData?.filter(t => t.type === 'withdrawal') || [];
    
    const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
    const approvedWithdrawals = withdrawals.filter(t => t.status === 'completed');
    const pendingWithdrawals = withdrawals.filter(t => t.status === 'pending' || t.status === 'processing');
    const cancelledWithdrawals = withdrawals.filter(t => t.status === 'cancelled');

    // Fetch game stats and login sessions in parallel
    const [minesRes, thimbleRes, ludoRes, sessionsRes] = await Promise.all([
      supabase.from('mines_games').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('thimble_games').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('ludo_match_players').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('user_login_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);

    setLoginSessions(sessionsRes.data || []);
    
    // Fetch geolocation for IPs
    const ips = (sessionsRes.data || []).map(s => s.ip_address).filter(Boolean) as string[];
    if (ips.length > 0) {
      fetchGeoLocations(ips);
    }

    setStats({
      totalDeposits,
      totalWithdrawals: approvedWithdrawals.reduce((sum, t) => sum + t.amount, 0),
      pendingWithdrawals: pendingWithdrawals.length,
      approvedWithdrawals: approvedWithdrawals.length,
      cancelledWithdrawals: cancelledWithdrawals.length,
      minesGames: minesRes.count || 0,
      thimbleGames: thimbleRes.count || 0,
      ludoGames: ludoRes.count || 0,
    });

    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
      case 'processing':
        return <Badge className="bg-yellow-500/20 text-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-500"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge className="bg-emerald-500/20 text-emerald-500"><ArrowDownCircle className="w-3 h-3 mr-1" />Deposit</Badge>;
      case 'withdrawal':
        return <Badge className="bg-orange-500/20 text-orange-500"><ArrowUpCircle className="w-3 h-3 mr-1" />Withdrawal</Badge>;
      case 'prize':
        return <Badge className="bg-primary/20 text-primary">Prize</Badge>;
      case 'entry_fee':
        return <Badge className="bg-blue-500/20 text-blue-500">Entry Fee</Badge>;
      case 'refund':
        return <Badge className="bg-purple-500/20 text-purple-500">Refund</Badge>;
      case 'admin_credit':
        return <Badge className="bg-green-500/20 text-green-500">Admin Credit</Badge>;
      case 'admin_debit':
        return <Badge className="bg-red-500/20 text-red-500">Admin Debit</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const depositTransactions = transactions.filter(t => t.type === 'deposit');
  const withdrawalTransactions = transactions.filter(t => t.type === 'withdrawal');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Profile Info */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="font-medium">{profile.username || 'Not set'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />Phone</p>
                      <p className="font-medium">{profile.phone || profile.email?.split('@')[0] || 'Not set'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />Email</p>
                      <p className="font-medium text-xs">{profile.email || 'Not set'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" />User ID</p>
                      <p className="font-medium font-mono text-xs">#{profile.user_code || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" />Wallet Balance</p>
                      <p className="font-medium text-primary">₹{profile.wallet_balance?.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Joined</p>
                      <p className="font-medium text-xs">{format(new Date(profile.created_at), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Referral Code</p>
                      <p className="font-medium font-mono">{profile.referral_code || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Referred By</p>
                      <p className="font-medium font-mono">{profile.referred_by || 'None'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Ban Status</p>
                      {profile.is_banned ? (
                        <Badge className="bg-red-500/20 text-red-500">Banned</Badge>
                      ) : profile.banned_games && profile.banned_games.length > 0 ? (
                        <Badge className="bg-yellow-500/20 text-yellow-500">Game Banned</Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-500">Active</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-card">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Total Deposits</p>
                    <p className="text-xl font-bold text-green-500">₹{stats.totalDeposits.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Total Withdrawals</p>
                    <p className="text-xl font-bold text-orange-500">₹{stats.totalWithdrawals.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Games Played</p>
                    <p className="text-xl font-bold text-primary">{stats.minesGames + stats.thimbleGames + stats.ludoGames}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Pending Withdrawals</p>
                    <p className="text-xl font-bold text-yellow-500">{stats.pendingWithdrawals}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Tabs */}
              <Tabs defaultValue="sessions" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="sessions">
                    Sessions ({loginSessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="deposits">
                    Deposits ({depositTransactions.length})
                  </TabsTrigger>
                  <TabsTrigger value="withdrawals">
                    Withdrawals ({withdrawalTransactions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sessions" className="mt-4">
                  <Card className="glass-card">
                    <CardContent className="p-0">
                      {loginSessions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No login sessions found</div>
                      ) : (
                        <div className="divide-y divide-border">
                          {loginSessions.map((session) => {
                            const geo = session.ip_address ? geoLocations[session.ip_address] : null;
                            return (
                              <div key={session.id} className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-mono text-sm">{session.ip_address || 'Unknown IP'}</span>
                                    {geo && (
                                      <Badge variant="outline" className="text-xs">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {geo.city}, {geo.country}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {session.device_name && (
                                    <span className="flex items-center gap-1">
                                      <Smartphone className="w-3 h-3" />
                                      {session.device_name}
                                    </span>
                                  )}
                                  {geo?.isp && (
                                    <span>ISP: {geo.isp}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="deposits" className="mt-4">
                  <Card className="glass-card">
                    <CardContent className="p-0">
                      {depositTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No deposits found</div>
                      ) : (
                        <div className="divide-y divide-border">
                          {depositTransactions.map((tx) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {getTypeBadge(tx.type)}
                                  {getStatusBadge(tx.status)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                                </p>
                                {tx.utr_id && (
                                  <p className="text-xs text-muted-foreground">UTR: {tx.utr_id}</p>
                                )}
                              </div>
                              <p className="font-bold text-green-500">+₹{tx.amount}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="withdrawals" className="mt-4">
                  <Card className="glass-card">
                    <CardContent className="p-0">
                      {withdrawalTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No withdrawals found</div>
                      ) : (
                        <div className="divide-y divide-border">
                          {withdrawalTransactions.map((tx) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {getTypeBadge(tx.type)}
                                  {getStatusBadge(tx.status)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                                </p>
                                {tx.upi_id && (
                                  <p className="text-xs text-muted-foreground">UPI: {tx.upi_id}</p>
                                )}
                              </div>
                              <p className="font-bold text-orange-500">-₹{tx.amount}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Game Stats */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Game Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{stats.minesGames}</p>
                      <p className="text-xs text-muted-foreground">Mines Games</p>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{stats.thimbleGames}</p>
                      <p className="text-xs text-muted-foreground">Thimble Games</p>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{stats.ludoGames}</p>
                      <p className="text-xs text-muted-foreground">Ludo Games</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Withdrawal Summary */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Withdrawal Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-green-500">{stats.approvedWithdrawals}</p>
                      <p className="text-xs text-muted-foreground">Approved</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-500">{stats.pendingWithdrawals}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center p-4 bg-red-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-red-500">{stats.cancelledWithdrawals}</p>
                      <p className="text-xs text-muted-foreground">Cancelled</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">User not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailDialog;
