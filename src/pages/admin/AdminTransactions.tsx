import { useEffect, useState } from 'react';
import { Check, X, Search, Clock, CheckCircle, XCircle, Loader2, Image as ImageIcon, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type Transaction = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  upi_id: string | null;
  description: string | null;
  admin_note: string | null;
  created_at: string;
  screenshot_url: string | null;
  profiles: {
    username: string | null;
    user_code: string | null;
    wallet_balance: number;
  } | null;
};

// Helper to check if a transaction was auto-rejected
const isAutoRejected = (tx: Transaction): boolean => {
  return tx.status === 'cancelled' && 
         tx.admin_note?.includes('Auto-rejected') === true;
};

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled' | 'auto-rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'auto-rejected') {
      query = query.eq('status', 'cancelled').ilike('admin_note', '%Auto-rejected%');
    } else if (filter !== 'all') {
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
          .select('username, user_code, wallet_balance')
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

  const createNotification = async (userId: string, title: string, message: string, type: string) => {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
    });
  };

  const viewScreenshot = async (path: string) => {
    try {
      // Use signed URL for secure, time-limited access (1 hour expiry)
      const { data, error } = await supabase.storage
        .from('payment-screenshots')
        .createSignedUrl(path, 3600); // 1 hour expiry
      
      if (error || !data?.signedUrl) {
        toast({ title: 'Error', description: 'Could not load screenshot', variant: 'destructive' });
        return;
      }
      
      setScreenshotUrl(data.signedUrl);
      setIsScreenshotOpen(true);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load screenshot', variant: 'destructive' });
    }
  };

  const handleApprove = async (tx: Transaction) => {
    // Update transaction status
    const { error: txError } = await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', tx.id);

    if (txError) {
      toast({ title: 'Error', description: txError.message, variant: 'destructive' });
      return;
    }

    // Update wallet balance
    const currentBalance = tx.profiles?.wallet_balance || 0;
    let newBalance = currentBalance;

    if (tx.type === 'deposit') {
      newBalance = currentBalance + tx.amount;
      
      // Get current wager requirement
      const { data: profileData } = await supabase
        .from('profiles')
        .select('wager_requirement')
        .eq('id', tx.user_id)
        .single();
      
      const currentWager = (profileData?.wager_requirement as number) || 0;
      
      // Update wallet balance AND add to wager requirement for deposits
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          wallet_balance: newBalance,
          wager_requirement: currentWager + tx.amount
        })
        .eq('id', tx.user_id);
        
      if (profileError) {
        toast({ title: 'Warning', description: 'Transaction approved but wallet update failed', variant: 'destructive' });
        return;
      }
    } else if (tx.type === 'withdrawal') {
      newBalance = Math.max(0, currentBalance - tx.amount);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', tx.user_id);
        
      if (profileError) {
        toast({ title: 'Warning', description: 'Transaction approved but wallet update failed', variant: 'destructive' });
        return;
      }
    }

    // For deposits, the success handling is done above
    if (tx.type === 'deposit') {

      // Send notification for deposit
      await createNotification(tx.user_id, 'Deposit Approved!', `₹${tx.amount} has been added to your wallet.`, 'success');
      
      // Handle referral reward on FIRST deposit
      await processReferralReward(tx.user_id, tx.profiles?.username || 'User');
      
      toast({ title: 'Success', description: 'Deposit approved and wager requirement set' });
    } else {
      // Send notification for withdrawal
      await createNotification(tx.user_id, 'Withdrawal Completed!', `₹${tx.amount} has been sent to your UPI ID.`, 'success');
      toast({ title: 'Success', description: 'Withdrawal completed' });
    }

    fetchTransactions();
  };

  // Process referral reward when user makes first deposit AND has bank card linked
  const processReferralReward = async (userId: string, username: string) => {
    const REFERRAL_REWARD = 10;

    // Check if there's an unrewarded referral for this user
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, referrer_id, is_rewarded, status')
      .eq('referred_id', userId)
      .eq('is_rewarded', false)
      .maybeSingle();

    if (!referral) return; // No pending referral or already rewarded

    // STEP 1: Check if user has linked a bank card (required for reward)
    const { data: bankCard } = await supabase
      .from('user_bank_cards')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!bankCard) {
      console.log('[Referral] User has not linked bank card yet - reward pending');
      // Update referral status to show it's waiting for bank card
      await supabase
        .from('referrals')
        .update({ status: 'pending' })
        .eq('id', referral.id);
      return;
    }

    // STEP 2: User has bank card AND is making first deposit - process reward!
    console.log('[Referral] Processing reward - user has bank card and made deposit');

    // Get referrer's current balance
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('wallet_balance, username')
      .eq('id', referral.referrer_id)
      .single();

    if (!referrerProfile) return;

    // Credit referrer's wallet
    const { error: walletError } = await supabase
      .from('profiles')
      .update({ wallet_balance: (referrerProfile.wallet_balance || 0) + REFERRAL_REWARD })
      .eq('id', referral.referrer_id);

    if (walletError) {
      console.error('Failed to credit referral reward:', walletError);
      return;
    }

    // Mark referral as rewarded with status 'rewarded'
    await supabase
      .from('referrals')
      .update({ is_rewarded: true, status: 'rewarded' })
      .eq('id', referral.id);

    // Create transaction record for referrer
    await supabase.from('transactions').insert({
      user_id: referral.referrer_id,
      type: 'admin_credit',
      amount: REFERRAL_REWARD,
      status: 'completed',
      description: `Referral bonus - ${username} completed verification (bank + deposit)`,
    });

    // Send notification to referrer
    await createNotification(
      referral.referrer_id,
      '🎉 Referral Reward!',
      `${username} completed verification! ₹${REFERRAL_REWARD} has been added to your wallet.`,
      'success'
    );
  };

  const handleReject = async (txId: string, userId: string, type: string, amount: number) => {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('id', txId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Send notification
      const notifTitle = type === 'deposit' ? 'Deposit Rejected' : 'Withdrawal Rejected';
      const notifMessage = `Your ${type} request of ₹${amount} was rejected. Please contact support.`;
      await createNotification(userId, notifTitle, notifMessage, 'error');
      
      toast({ title: 'Rejected', description: 'Transaction has been cancelled' });
      fetchTransactions();
    }
  };

  const handleProcessing = async (txId: string) => {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'processing' })
      .eq('id', txId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: 'Transaction marked as processing' });
      fetchTransactions();
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      tx.profiles?.username?.toLowerCase().includes(search) ||
      tx.profiles?.user_code?.toLowerCase().includes(search) ||
      tx.upi_id?.toLowerCase().includes(search)
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
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'processing', label: 'Processing', icon: Loader2 },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle },
    { key: 'auto-rejected', label: 'Auto-Rejected', icon: Bot },
    { key: 'all', label: 'All', icon: null },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Transaction Management</h1>
        <p className="text-muted-foreground">Manage deposits and withdrawals</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by username, user code, or UPI..."
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
                  <th className="text-left p-4 font-medium text-muted-foreground">UPI ID</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{tx.profiles?.username || 'N/A'}</p>
                          <p className="text-xs text-primary font-mono">{tx.profiles?.user_code}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          tx.type === 'deposit' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 font-display font-bold">₹{tx.amount}</td>
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
                      <td className="p-4 text-sm font-mono">{tx.upi_id || '-'}</td>
                      <td className="p-4 text-sm">
                        {format(new Date(tx.created_at), 'MMM dd, hh:mm a')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tx.status)}`}>
                            {tx.status}
                          </span>
                          {isAutoRejected(tx) && (
                            <Badge variant="outline" className="gap-1 border-orange-500/50 text-orange-500 bg-orange-500/10">
                              <Bot className="w-3 h-3" />
                              Auto
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {tx.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProcessing(tx.id)}
                              title="Mark as processing"
                              className="text-blue-500"
                            >
                              <Loader2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApprove(tx)}
                              title="Approve"
                            >
                              <Check className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReject(tx.id, tx.user_id, tx.type, tx.amount)}
                              title="Reject"
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                        {tx.status === 'processing' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApprove(tx)}
                              title="Complete"
                            >
                              <Check className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReject(tx.id, tx.user_id, tx.type, tx.amount)}
                              title="Cancel"
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
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

export default AdminTransactions;
