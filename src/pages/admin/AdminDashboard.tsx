import { useEffect, useState } from 'react';
import { Users, Gamepad2, DollarSign, Clock, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active matches
      const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .in('status', ['upcoming', 'live']);

      // Get pending payments
      const { count: paymentsCount } = await supabase
        .from('match_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending')
        .eq('is_approved', false);

      // Get total completed deposits
      const { data: completedDeposits } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'deposit')
        .eq('status', 'completed');

      const totalRevenue = completedDeposits?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get recent registrations
      const { data: registrations } = await supabase
        .from('match_registrations')
        .select(`
          *,
          matches (title, entry_fee),
          profiles:user_id (username, email)
        `)
        .order('registered_at', { ascending: false })
        .limit(5);

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
      
      setIsLoading(false);
    };

    fetchStats();
  }, []);

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

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500', trend: '+12%' },
    { title: 'Active Matches', value: stats.activeMatches, icon: Gamepad2, color: 'text-green-500', trend: '+5%' },
    { title: 'Pending Payments', value: stats.pendingPayments, icon: Clock, color: 'text-yellow-500', trend: '-8%' },
    { title: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary', trend: '+23%' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to ProBattle Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
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
        ))}
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
