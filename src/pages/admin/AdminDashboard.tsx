import { useEffect, useState } from 'react';
import { Users, Gamepad2, DollarSign, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  totalUsers: number;
  activeMatches: number;
  pendingPayments: number;
  totalRevenue: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeMatches: 0,
    pendingPayments: 0,
    totalRevenue: 0,
  });
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
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
        totalRevenue: 0, // Would need payment tracking table
      });

      setRecentRegistrations(registrations || []);
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Active Matches', value: stats.activeMatches, icon: Gamepad2, color: 'text-green-500' },
    { title: 'Pending Payments', value: stats.pendingPayments, icon: Clock, color: 'text-yellow-500' },
    { title: 'Total Revenue', value: `₹${stats.totalRevenue}`, icon: DollarSign, color: 'text-primary' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to ProScims Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Registrations */}
      <Card className="glass-card">
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
  );
};

export default AdminDashboard;
