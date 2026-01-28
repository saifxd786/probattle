import { useEffect, useState } from 'react';
import { Search, Clock, CheckCircle, XCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Transaction = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  upi_id: string | null;
  description: string | null;
  created_at: string;
  screenshot_url: string | null;
  profiles: {
    username: string | null;
    user_code: string | null;
  } | null;
};

const AgentTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch transactions', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    // Fetch profiles for each transaction
    const transactionsWithProfiles = await Promise.all(
      (data || []).map(async (tx) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, user_code')
          .eq('id', tx.user_id)
          .maybeSingle();
        return { ...tx, profiles: profile } as Transaction;
      })
    );

    setTransactions(transactionsWithProfiles);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const viewScreenshot = async (path: string) => {
    const { data } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(path);
    
    setScreenshotUrl(data.publicUrl);
    setIsScreenshotOpen(true);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      tx.profiles?.username?.toLowerCase().includes(search) ||
      tx.profiles?.user_code?.toLowerCase().includes(search)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'pending': return 'bg-yellow-500/20 text-yellow-500';
      case 'processing': return 'bg-blue-500/20 text-blue-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const filterButtons = [
    { key: 'all', label: 'All', icon: null },
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'processing', label: 'Processing', icon: Loader2 },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Transactions</h1>
        <p className="text-muted-foreground">View all deposits and withdrawals (Read Only)</p>
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

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterButtons.map((btn) => (
          <Button
            key={btn.key}
            variant={filter === btn.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(btn.key)}
            className="gap-2"
          >
            {btn.icon && <btn.icon className="w-4 h-4" />}
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Transactions Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Screenshot</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{tx.profiles?.username || 'N/A'}</p>
                          <p className="text-xs text-blue-400 font-mono">{tx.profiles?.user_code}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          tx.type === 'deposit' ? 'bg-green-500/20 text-green-500' : 
                          tx.type === 'withdrawal' ? 'bg-orange-500/20 text-orange-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 font-display font-bold text-foreground">₹{tx.amount}</td>
                      <td className="p-4">
                        {tx.screenshot_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewScreenshot(tx.screenshot_url!)}
                            className="gap-1"
                          >
                            <ImageIcon className="w-4 h-4" />
                            View
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM dd, hh:mm a')}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Screenshot Dialog */}
      <Dialog open={isScreenshotOpen} onOpenChange={setIsScreenshotOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotUrl && (
            <img 
              src={screenshotUrl} 
              alt="Payment screenshot" 
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentTransactions;