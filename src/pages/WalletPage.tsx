import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, History, Loader2, MessageCircle, AlertCircle, Gift, Copy, Check } from 'lucide-react';
import phonepeLogo from '@/assets/phonepe-logo.png';
import gpayLogo from '@/assets/gpay-logo.png';
import paytmLogo from '@/assets/paytm-logo.png';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import DepositPaymentGateway from '@/components/DepositPaymentGateway';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const MIN_WITHDRAWAL = 110;

type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  screenshot_url: string | null;
  utr_id: string | null;
};

type Profile = {
  wallet_balance: number;
  user_code: string | null;
  wager_requirement: number;
};

const TELEGRAM_SUPPORT = 'https://t.me/ProBattleSupport';

const WalletPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redeem code state
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    setIsLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('wallet_balance, user_code, wager_requirement')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile({
        wallet_balance: profileData.wallet_balance || 0,
        user_code: profileData.user_code,
        wager_requirement: (profileData.wager_requirement as number) || 0
      });
    }

    const { data: txData } = await supabase
      .from('transactions')
      .select('id, type, amount, status, description, created_at, screenshot_url, utr_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (txData) {
      setTransactions(txData);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const handleDeposit = async (amount: number, utrId: string, screenshot: File | null) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      let screenshotUrl = null;
      
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-screenshots')
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;
        screenshotUrl = fileName;
      }

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount,
        status: 'pending',
        description: `Deposit request of ₹${amount}`,
        screenshot_url: screenshotUrl,
        utr_id: utrId.trim(),
      });

      if (error) throw error;

      toast({ 
        title: 'Deposit Request Submitted', 
        description: 'Your payment is being verified. Wait for admin approval.' 
      });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }

    setIsSubmitting(false);
  };

  const handleWithdraw = async () => {
    if (!user || !profile) return;

    const amount = Number(withdrawAmount);

    if (amount < MIN_WITHDRAWAL) {
      toast({ title: 'Error', description: `Minimum withdrawal is ₹${MIN_WITHDRAWAL}`, variant: 'destructive' });
      return;
    }

    if (amount > profile.wallet_balance) {
      toast({ title: 'Error', description: 'Insufficient balance', variant: 'destructive' });
      return;
    }

    if (profile.wager_requirement > 0) {
      toast({ 
        title: 'Wager Requirement Not Met', 
        description: `You need to use ₹${profile.wager_requirement.toFixed(2)} more on matches before withdrawing.`, 
        variant: 'destructive' 
      });
      return;
    }

    if (!accountName.trim()) {
      toast({ title: 'Error', description: 'Please enter your account name', variant: 'destructive' });
      return;
    }

    if (!upiId.trim()) {
      toast({ title: 'Error', description: 'Please enter your UPI ID', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const newBalance = profile.wallet_balance - amount;
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (deductError) {
        toast({ title: 'Error', description: 'Failed to process withdrawal', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      setProfile({ ...profile, wallet_balance: newBalance });

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount,
        status: 'pending',
        upi_id: upiId.trim(),
        description: `Withdrawal of ₹${amount} | Name: ${accountName.trim()}`,
      });

      if (error) {
        await supabase
          .from('profiles')
          .update({ wallet_balance: profile.wallet_balance })
          .eq('id', user.id);
        setProfile({ ...profile });
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Withdrawal Request Submitted', description: 'Amount deducted. Your request is being processed.' });
        setIsWithdrawOpen(false);
        setWithdrawAmount('');
        setUpiId('');
        setAccountName('');
        fetchData();
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }

    setIsSubmitting(false);
  };

  const handleRedeem = async () => {
    if (!user || !redeemCode.trim()) return;

    setIsRedeeming(true);

    try {
      const { data: codeData, error: codeError } = await supabase
        .from('redeem_codes')
        .select('*')
        .eq('code', redeemCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (codeError || !codeData) {
        toast({ title: 'Invalid Code', description: 'This code does not exist or is inactive', variant: 'destructive' });
        setIsRedeeming(false);
        return;
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        toast({ title: 'Code Expired', description: 'This code has expired', variant: 'destructive' });
        setIsRedeeming(false);
        return;
      }

      if (codeData.current_uses >= codeData.max_uses) {
        toast({ title: 'Code Exhausted', description: 'This code has reached its maximum uses', variant: 'destructive' });
        setIsRedeeming(false);
        return;
      }

      const { data: existingUse } = await supabase
        .from('redeem_code_uses')
        .select('id')
        .eq('code_id', codeData.id)
        .eq('user_id', user.id)
        .single();

      if (existingUse) {
        toast({ title: 'Already Redeemed', description: 'You have already used this code', variant: 'destructive' });
        setIsRedeeming(false);
        return;
      }

      const { error: useError } = await supabase.from('redeem_code_uses').insert({
        code_id: codeData.id,
        user_id: user.id,
        amount: codeData.amount,
      });

      if (useError) throw useError;

      await supabase
        .from('redeem_codes')
        .update({ current_uses: codeData.current_uses + 1 })
        .eq('id', codeData.id);

      await supabase
        .from('profiles')
        .update({ wallet_balance: (profile?.wallet_balance || 0) + codeData.amount })
        .eq('id', user.id);

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'admin_credit',
        amount: codeData.amount,
        status: 'completed',
        description: `Redeemed code: ${codeData.code}`,
      });

      toast({ 
        title: '🎉 Code Redeemed!', 
        description: `₹${codeData.amount} has been added to your wallet` 
      });
      
      setIsRedeemOpen(false);
      setRedeemCode('');
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }

    setIsRedeeming(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'pending': return 'bg-yellow-500/20 text-yellow-500';
      case 'processing': return 'bg-blue-500/20 text-blue-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    if (['deposit', 'prize', 'refund', 'admin_credit'].includes(type)) {
      return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-red-500" />;
  };

  const handleContactSupport = (tx: Transaction) => {
    const userId = profile?.user_code || user?.id || 'Unknown';
    const message = encodeURIComponent(
      `🔔 Payment Support Request\n\n` +
      `User ID: ${userId}\n` +
      `Amount: ₹${tx.amount}\n` +
      `UTR ID: ${tx.utr_id || 'Not provided'}\n` +
      `Transaction ID: ${tx.id}\n` +
      `Date: ${format(new Date(tx.created_at), 'MMM dd, yyyy hh:mm a')}\n\n` +
      `Please verify my payment.`
    );
    window.open(`${TELEGRAM_SUPPORT}?text=${message}`, '_blank');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        {/* User ID Badge */}
        {profile?.user_code && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-center"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-sm">
              <span className="text-muted-foreground">Your ID:</span>
              <span className="font-display font-bold text-primary">#{profile.user_code}</span>
            </span>
          </motion.div>
        )}

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Available Balance</span>
            </div>
            
            <div className="font-display text-4xl font-bold mb-4">
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                `₹${(profile?.wallet_balance || 0).toFixed(2)}`
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                size="sm" 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none" 
                onClick={() => setIsDepositOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Money
              </Button>
              <Button 
                size="sm" 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none" 
                onClick={() => setIsWithdrawOpen(true)}
              >
                <ArrowUpRight className="w-4 h-4 mr-1" />
                Withdraw
              </Button>
            </div>
            
            <Button 
              size="sm" 
              className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700 text-white border-none"
              onClick={() => setIsRedeemOpen(true)}
            >
              <Gift className="w-4 h-4 mr-2" />
              Redeem Code
            </Button>
          </div>
        </motion.div>

        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg font-bold">Transaction History</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <History className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="font-display text-lg font-bold mb-2">No Transactions</h3>
              <p className="text-sm text-muted-foreground">
                Your transaction history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        ['deposit', 'prize', 'refund', 'admin_credit'].includes(tx.type) 
                          ? 'bg-green-500/10' 
                          : 'bg-red-500/10'
                      }`}>
                        {getTypeIcon(tx.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM dd, hh:mm a')}
                        </p>
                        {tx.utr_id && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            UTR: {tx.utr_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-display font-bold ${
                        ['deposit', 'prize', 'refund', 'admin_credit'].includes(tx.type) 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {['deposit', 'prize', 'refund', 'admin_credit'].includes(tx.type) ? '+' : '-'}₹{tx.amount}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                  
                  {tx.type === 'deposit' && tx.status === 'pending' && (
                    <button
                      onClick={() => handleContactSupport(tx)}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs hover:bg-primary/20 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      For faster approval, contact support
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Professional Deposit Payment Gateway */}
      <DepositPaymentGateway 
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSubmit={handleDeposit}
        isSubmitting={isSubmitting}
      />

      {/* Withdraw Dialog */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Money</DialogTitle>
            <DialogDescription>Minimum withdrawal: ₹{MIN_WITHDRAWAL}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {profile && profile.wager_requirement > 0 && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-500">Wager Requirement</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  You must use your deposited amount on matches before withdrawing.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining to use:</span>
                    <span className="font-display font-bold text-orange-500">₹{profile.wager_requirement.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(0, 100 - (profile.wager_requirement / (profile.wallet_balance + profile.wager_requirement)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Join matches to complete wager requirement
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder={`Min ₹${MIN_WITHDRAWAL}`}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: ₹{(profile?.wallet_balance || 0).toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
              <p className="text-sm font-medium text-center mb-2">Withdrawal via UPI</p>
              <div className="flex items-center justify-center gap-4 pb-3 border-b border-border/30">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm overflow-hidden p-1">
                    <img src={phonepeLogo} alt="PhonePe" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">PhonePe</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm overflow-hidden p-1">
                    <img src={gpayLogo} alt="GPay" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">GPay</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm overflow-hidden p-1">
                    <img src={paytmLogo} alt="Paytm" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Paytm</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-green-600 flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">UPI</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Any UPI</span>
                </div>
              </div>
              
              <div>
                <Label>Account Holder Name *</Label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Your UPI ID *</Label>
                <Input
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            </div>

            <Button 
              className="w-full bg-red-600 hover:bg-red-700 text-white" 
              onClick={handleWithdraw} 
              disabled={isSubmitting || (profile?.wager_requirement || 0) > 0 || !accountName.trim() || !upiId.trim()}
            >
              {isSubmitting ? 'Submitting...' : (profile?.wager_requirement || 0) > 0 ? 'Complete Wager First' : 'Request Withdrawal'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redeem Code Dialog */}
      <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Redeem Code
            </DialogTitle>
            <DialogDescription>Enter your promo code to get bonus cash</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl text-center">
              <Gift className="w-10 h-10 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Enter a valid promo code to receive bonus cash in your wallet
              </p>
            </div>
            
            <div>
              <Label>Promo Code</Label>
              <Input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., PROMO123ABC)"
                className="text-center font-mono text-lg tracking-wider"
              />
            </div>

            <Button 
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white" 
              onClick={handleRedeem} 
              disabled={isRedeeming || !redeemCode.trim()}
            >
              {isRedeeming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Redeeming...
                </>
              ) : (
                'Redeem Code'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default WalletPage;