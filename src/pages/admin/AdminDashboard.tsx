import { useEffect, useState, useCallback } from 'react';
import { Users, Gamepad2, DollarSign, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, Trophy, Dices, Gem, Percent, AlertTriangle, Shield, Bot, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface Stats {
  totalUsers: number;
  activeMatches: number;
  pendingPayments: number;
  totalRevenue: number;
}

interface ChartData {
  date: string;
  signups: number;
  deposits: number;
  withdrawals: number;
}

interface MatchStats {
  name: string;
  value: number;
}

interface GameStats {
  totalGames: number;
  playerWins: number;
  platformWins: number;
  totalWagered: number;
  totalPaidOut: number;
  platformProfit: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeMatches: 0,
    pendingPayments: 0,
    totalRevenue: 0,
  });
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStats[]>([]);
  const [gameStats, setGameStats] = useState<{
    ludo: GameStats;
    thimble: GameStats;
    mines: GameStats;
    total: GameStats;
  }>({
    ludo: { totalGames: 0, playerWins: 0, platformWins: 0, totalWagered: 0, totalPaidOut: 0, platformProfit: 0 },
    thimble: { totalGames: 0, playerWins: 0, platformWins: 0, totalWagered: 0, totalPaidOut: 0, platformProfit: 0 },
    mines: { totalGames: 0, playerWins: 0, platformWins: 0, totalWagered: 0, totalPaidOut: 0, platformProfit: 0 },
    total: { totalGames: 0, playerWins: 0, platformWins: 0, totalWagered: 0, totalPaidOut: 0, platformProfit: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [multiAccountAlerts, setMultiAccountAlerts] = useState({ total: 0, critical: 0 });
  const [lastCleanup, setLastCleanup] = useState<{ run_at: string; rejected_count: number; success: boolean } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllStats = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      }
      setFetchError(null);
      
      // Get total users
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Get active matches
      const { count: matchesCount, error: matchesError } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .in('status', ['upcoming', 'live']);

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
      }

      // Get pending payments
      const { count: paymentsCount, error: paymentsError } = await supabase
        .from('match_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending')
        .eq('is_approved', false);

      if (paymentsError) {
        console.error('Error fetching pending payments:', paymentsError);
      }

      // Get total completed deposits
      const { data: completedDeposits, error: depositsError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'deposit')
        .eq('status', 'completed');

      if (depositsError) {
        console.error('Error fetching deposits:', depositsError);
        // This is likely an RLS issue - user may not have admin access
        if (depositsError.code === 'PGRST116' || depositsError.message?.includes('permission')) {
          setFetchError('You do not have permission to view this data. Please ensure you are logged in as an admin.');
        }
      }

      const totalRevenue = completedDeposits?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get recent registrations
      const { data: registrations, error: regError } = await supabase
        .from('match_registrations')
        .select(`
          *,
          matches (title, entry_fee),
          profiles:user_id (username, email)
        `)
        .order('registered_at', { ascending: false })
        .limit(5);

      if (regError) {
        console.error('Error fetching registrations:', regError);
      }

      setStats({
        totalUsers: usersCount || 0,
        activeMatches: matchesCount || 0,
        pendingPayments: paymentsCount || 0,
        totalRevenue,
      });

      setRecentRegistrations(registrations || []);

      // Fetch chart data for last 7 days
      await fetchChartData();
      await fetchMatchStats();
      await fetchGameStats();
      await fetchMultiAccountAlerts();
      await fetchLastCleanup();
      
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setFetchError('Failed to load dashboard data. Please try refreshing the page.');
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllStats();
  }, [fetchAllStats]);

  const fetchLastCleanup = async () => {
    const { data } = await supabase
      .from('deposit_cleanup_logs')
      .select('run_at, rejected_count, success')
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setLastCleanup(data);
    }
  };

  const fetchChartData = async () => {
    const days = 7;
    const data: ChartData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();

      // Count signups for the day
      const { count: signups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      // Count deposits for the day
      const { data: depositData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'deposit')
        .eq('status', 'completed')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      // Count withdrawals for the day
      const { data: withdrawalData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'withdrawal')
        .eq('status', 'completed')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      data.push({
        date: format(date, 'MMM dd'),
        signups: signups || 0,
        deposits: depositData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
        withdrawals: withdrawalData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      });
    }

    setChartData(data);
  };

  const fetchMatchStats = async () => {
    const { data: matches } = await supabase
      .from('matches')
      .select('status');

    const statusCounts = {
      upcoming: 0,
      live: 0,
      completed: 0,
      cancelled: 0,
    };

    matches?.forEach(m => {
      if (statusCounts.hasOwnProperty(m.status)) {
        statusCounts[m.status as keyof typeof statusCounts]++;
      }
    });

    setMatchStats([
      { name: 'Upcoming', value: statusCounts.upcoming },
      { name: 'Live', value: statusCounts.live },
      { name: 'Completed', value: statusCounts.completed },
      { name: 'Cancelled', value: statusCounts.cancelled },
    ]);
  };

  const fetchGameStats = async () => {
    // Fetch Ludo stats
    const { data: ludoData } = await supabase
      .from('ludo_matches')
      .select('entry_amount, reward_amount, status, winner_id, ludo_match_players(user_id, is_bot, is_winner)')
      .eq('status', 'completed');

    const ludoStats: GameStats = { totalGames: 0, playerWins: 0, platformWins: 0, totalWagered: 0, totalPaidOut: 0, platformProfit: 0 };
    ludoData?.forEach(match => {
      ludoStats.totalGames++;
      ludoStats.totalWagered += Number(match.entry_amount);
      
      const humanPlayer = match.ludo_match_players?.find((p: any) => !p.is_bot);
      const humanWon = humanPlayer?.is_winner;
      
      if (humanWon) {
        ludoStats.playerWins++;
        ludoStats.totalPaidOut += Number(match.reward_amount);
      } else {
        ludoStats.platformWins++;
      }
    });
    ludoStats.platformProfit = ludoStats.totalWagered - ludoStats.totalPaidOut;

    // Fetch Thimble stats
    const { data: thimbleData } = await supabase
      .from('thimble_games')
      .select('entry_amount, reward_amount, is_win')
      .eq('status', 'completed');

    const thimbleStats: GameStats = { totalGames: 0, playerWins: 0, platformWins: 0, totalWagered: 0, totalPaidOut: 0, platformProfit: 0 };
    thimbleData?.forEach(game => {
      thimbleStats.totalGames++;
      thimbleStats.totalWagered += Number(game.entry_amount);
      
      if (game.is_win) {
        thimbleStats.playerWins++;
        thimbleStats.totalPaidOut += Number(game.reward_amount);
      } else {
        thimbleStats.platformWins++;
      }
    });
    thimbleStats.platformProfit = thimbleStats.totalWagered - thimbleStats.totalPaidOut;

    // Fetch Mines stats
    const { data: minesData } = await supabase
      .from('mines_games')
      .select('entry_amount, final_amount, status')
      .in('status', ['won', 'lost']);

    const minesStats: GameStats = { totalGames: 0, playerWins: 0, platformWins: 0, totalWagered: 0, totalPaidOut: 0, platformProfit: 0 };
    minesData?.forEach(game => {
      minesStats.totalGames++;
      minesStats.totalWagered += Number(game.entry_amount);
      
      if (game.status === 'won') {
        minesStats.playerWins++;
        minesStats.totalPaidOut += Number(game.final_amount || 0);
      } else {
        minesStats.platformWins++;
      }
    });
    minesStats.platformProfit = minesStats.totalWagered - minesStats.totalPaidOut;

    // Calculate totals
    const totalStats: GameStats = {
      totalGames: ludoStats.totalGames + thimbleStats.totalGames + minesStats.totalGames,
      playerWins: ludoStats.playerWins + thimbleStats.playerWins + minesStats.playerWins,
      platformWins: ludoStats.platformWins + thimbleStats.platformWins + minesStats.platformWins,
      totalWagered: ludoStats.totalWagered + thimbleStats.totalWagered + minesStats.totalWagered,
      totalPaidOut: ludoStats.totalPaidOut + thimbleStats.totalPaidOut + minesStats.totalPaidOut,
      platformProfit: ludoStats.platformProfit + thimbleStats.platformProfit + minesStats.platformProfit,
    };

    setGameStats({
      ludo: ludoStats,
      thimble: thimbleStats,
      mines: minesStats,
      total: totalStats,
    });
  };

  const fetchMultiAccountAlerts = async () => {
    const { data } = await supabase
      .from('multi_account_alerts')
      .select('severity, is_resolved')
      .eq('is_resolved', false);

    if (data) {
      setMultiAccountAlerts({
        total: data.length,
        critical: data.filter(a => a.severity === 'critical').length
      });
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500', trend: '+12%' },
    { title: 'Active Matches', value: stats.activeMatches, icon: Gamepad2, color: 'text-green-500', trend: '+5%' },
    { title: 'Pending Payments', value: stats.pendingPayments, icon: Clock, color: 'text-yellow-500', trend: '-8%' },
    { title: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary', trend: '+23%' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Error Banner */}
      {fetchError && (
        <Card className="border-l-4 border-l-red-500 bg-red-500/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-red-500">Error Loading Dashboard</p>
                <p className="text-sm text-muted-foreground">{fetchError}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchAllStats(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Multi-Account Alert Banner */}
      {multiAccountAlerts.total > 0 && (
        <Link to="/admin/multi-account">
          <Card className={`border-l-4 ${multiAccountAlerts.critical > 0 ? 'border-l-red-500 bg-red-500/10' : 'border-l-yellow-500 bg-yellow-500/10'} cursor-pointer hover:bg-opacity-20 transition-colors`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${multiAccountAlerts.critical > 0 ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                  <AlertTriangle className={`w-5 h-5 ${multiAccountAlerts.critical > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
                </div>
                <div>
                  <p className="font-medium">Multi-Account Detection Alert</p>
                  <p className="text-sm text-muted-foreground">
                    {multiAccountAlerts.total} unresolved alerts
                    {multiAccountAlerts.critical > 0 && ` (${multiAccountAlerts.critical} critical)`}
                  </p>
                </div>
              </div>
              <Shield className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Deposit Cleanup Status Widget */}
      {lastCleanup && (
        <Card className={`border-l-4 ${lastCleanup.success ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-red-500 bg-red-500/5'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${lastCleanup.success ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                <Bot className={`w-5 h-5 ${lastCleanup.success ? 'text-emerald-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="font-medium flex items-center gap-2">
                  Auto-Cleanup Status
                  {lastCleanup.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Last run: {format(new Date(lastCleanup.run_at), 'MMM dd, hh:mm a')} • 
                  {lastCleanup.rejected_count > 0 ? (
                    <span className="text-orange-500 ml-1">{lastCleanup.rejected_count} deposits auto-rejected</span>
                  ) : (
                    <span className="ml-1">No stale deposits found</span>
                  )}
                </p>
              </div>
            </div>
            <Link to="/admin/transactions" className="text-xs text-primary hover:underline">
              View Transactions →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to ProBattle Admin Panel</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchAllStats(true)}
          disabled={isRefreshing || isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-5 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-28" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          statCards.map((stat, index) => (
            <Card key={stat.title} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {stat.trend.startsWith('+') ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.trend} from last week
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Daily Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="signups" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Transactions (₹)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="deposits" fill="hsl(142.1 76.2% 36.3%)" name="Deposits" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="withdrawals" fill="hsl(0 84.2% 60.2%)" name="Withdrawals" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Game Statistics */}
      <Card className="glass-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Platform Game Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <Gamepad2 className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="font-display text-2xl font-bold">{gameStats.total.totalGames}</p>
              <p className="text-xs text-muted-foreground">Total Games</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="font-display text-2xl font-bold">{gameStats.total.platformWins}</p>
              <p className="text-xs text-muted-foreground">Platform Wins</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <Percent className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="font-display text-2xl font-bold">
                {gameStats.total.totalGames > 0 
                  ? ((gameStats.total.platformWins / gameStats.total.totalGames) * 100).toFixed(1) 
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <p className="font-display text-2xl font-bold">₹{gameStats.total.totalWagered.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Wagered</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <TrendingUp className="w-6 h-6 mx-auto mb-2" style={{ color: gameStats.total.platformProfit >= 0 ? '#22c55e' : '#ef4444' }} />
              <p className={`font-display text-2xl font-bold ${gameStats.total.platformProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {gameStats.total.platformProfit >= 0 ? '+' : ''}₹{gameStats.total.platformProfit.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Platform Profit</p>
            </div>
          </div>

          {/* Per-Game Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ludo */}
            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Dices className="w-5 h-5 text-blue-500" />
                <span className="font-display font-bold">Ludo</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Games</p>
                  <p className="font-bold">{gameStats.ludo.totalGames}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Win Rate</p>
                  <p className="font-bold">
                    {gameStats.ludo.totalGames > 0 
                      ? ((gameStats.ludo.platformWins / gameStats.ludo.totalGames) * 100).toFixed(0) 
                      : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Wagered</p>
                  <p className="font-bold">₹{gameStats.ludo.totalWagered.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Profit</p>
                  <p className={`font-bold ${gameStats.ludo.platformProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{gameStats.ludo.platformProfit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Platform: {gameStats.ludo.platformWins}</span>
                  <span>Players: {gameStats.ludo.playerWins}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${gameStats.ludo.totalGames > 0 ? (gameStats.ludo.platformWins / gameStats.ludo.totalGames) * 100 : 0}%` }}
                  />
                  <div 
                    className="h-full bg-red-500"
                    style={{ width: `${gameStats.ludo.totalGames > 0 ? (gameStats.ludo.playerWins / gameStats.ludo.totalGames) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Thimble */}
            <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎩</span>
                <span className="font-display font-bold">Thimble</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Games</p>
                  <p className="font-bold">{gameStats.thimble.totalGames}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Win Rate</p>
                  <p className="font-bold">
                    {gameStats.thimble.totalGames > 0 
                      ? ((gameStats.thimble.platformWins / gameStats.thimble.totalGames) * 100).toFixed(0) 
                      : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Wagered</p>
                  <p className="font-bold">₹{gameStats.thimble.totalWagered.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Profit</p>
                  <p className={`font-bold ${gameStats.thimble.platformProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{gameStats.thimble.platformProfit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Platform: {gameStats.thimble.platformWins}</span>
                  <span>Players: {gameStats.thimble.playerWins}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${gameStats.thimble.totalGames > 0 ? (gameStats.thimble.platformWins / gameStats.thimble.totalGames) * 100 : 0}%` }}
                  />
                  <div 
                    className="h-full bg-red-500"
                    style={{ width: `${gameStats.thimble.totalGames > 0 ? (gameStats.thimble.playerWins / gameStats.thimble.totalGames) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Mines */}
            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Gem className="w-5 h-5 text-emerald-500" />
                <span className="font-display font-bold">Mines</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Games</p>
                  <p className="font-bold">{gameStats.mines.totalGames}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Win Rate</p>
                  <p className="font-bold">
                    {gameStats.mines.totalGames > 0 
                      ? ((gameStats.mines.platformWins / gameStats.mines.totalGames) * 100).toFixed(0) 
                      : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Wagered</p>
                  <p className="font-bold">₹{gameStats.mines.totalWagered.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Profit</p>
                  <p className={`font-bold ${gameStats.mines.platformProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{gameStats.mines.platformProfit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Platform: {gameStats.mines.platformWins}</span>
                  <span>Players: {gameStats.mines.playerWins}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${gameStats.mines.totalGames > 0 ? (gameStats.mines.platformWins / gameStats.mines.totalGames) * 100 : 0}%` }}
                  />
                  <div 
                    className="h-full bg-red-500"
                    style={{ width: `${gameStats.mines.totalGames > 0 ? (gameStats.mines.playerWins / gameStats.mines.totalGames) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Stats & Recent Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Match Status Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" />
              Match Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={matchStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {matchStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {matchStats.map((stat, index) => (
                <div key={stat.name} className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground">{stat.name}: {stat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-display">Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : recentRegistrations.length === 0 ? (
              <p className="text-muted-foreground">No recent registrations</p>
            ) : (
              <div className="space-y-3">
                {recentRegistrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div>
                      <p className="font-medium">{reg.profiles?.username || reg.profiles?.email}</p>
                      <p className="text-sm text-muted-foreground">{reg.matches?.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{reg.matches?.entry_fee || 0}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          reg.is_approved
                            ? 'bg-green-500/20 text-green-500'
                            : reg.payment_status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {reg.is_approved ? 'Approved' : reg.payment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
