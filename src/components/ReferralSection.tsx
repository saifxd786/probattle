import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, Copy, Check, Users, Wallet, Loader2, Share2, 
  ChevronDown, ChevronUp, Clock, CheckCircle2, UserPlus,
  CreditCard, Banknote, Trophy, AlertCircle, Sparkles,
  ArrowRight, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

type ReferralStatus = {
  registered: boolean;
  bankCardLinked: boolean;
  firstDepositMade: boolean;
  rewardClaimed: boolean;
};

type Referral = {
  id: string;
  referred_id: string;
  reward_amount: number;
  pending_reward: number;
  is_rewarded: boolean;
  status: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  referralStatus: ReferralStatus;
  completionPercent: number;
};

const REFERRAL_REWARD = 10;

const ReferralSection = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllReferrals, setShowAllReferrals] = useState(false);
  const [expandedReferral, setExpandedReferral] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchReferralData();
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Get user's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      }

      // Get all referrals
      const { data: refData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (refData && refData.length > 0) {
        // Fetch detailed status for each referral
        const referralsWithDetails = await Promise.all(
          refData.map(async (ref) => {
            // Get referred user's profile
            const { data: refProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', ref.referred_id)
              .maybeSingle();

            // Check if referred user has linked bank card
            const { data: bankCard } = await supabase
              .from('user_bank_cards')
              .select('id')
              .eq('user_id', ref.referred_id)
              .maybeSingle();

            // Check if referred user has made any completed deposit
            const { data: deposits } = await supabase
              .from('transactions')
              .select('id')
              .eq('user_id', ref.referred_id)
              .eq('type', 'deposit')
              .eq('status', 'completed')
              .limit(1);

            const hasDeposit = deposits && deposits.length > 0;
            const hasBankCard = !!bankCard;

            // Calculate status
            const referralStatus: ReferralStatus = {
              registered: true, // Always true if referral exists
              bankCardLinked: hasBankCard,
              firstDepositMade: hasDeposit,
              rewardClaimed: ref.is_rewarded
            };

            // Calculate completion percentage
            let completionPercent = 25; // Registered = 25%
            if (hasBankCard) completionPercent += 25;
            if (hasDeposit) completionPercent += 25;
            if (ref.is_rewarded) completionPercent = 100;

            return {
              ...ref,
              profiles: refProfile,
              referralStatus,
              completionPercent
            } as Referral;
          })
        );

        setReferrals(referralsWithDetails);
        
        // Calculate earnings
        const rewardedTotal = referralsWithDetails
          .filter(r => r.is_rewarded)
          .reduce((sum, r) => sum + (r.reward_amount || 0), 0);
        setTotalEarnings(rewardedTotal);

        // Calculate pending earnings (users who haven't completed all steps)
        const pendingCount = referralsWithDetails.filter(r => !r.is_rewarded).length;
        setPendingEarnings(pendingCount * REFERRAL_REWARD);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Referral code copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralLink = () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Link Copied!', description: 'Share this link with friends to earn rewards' });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    const shareData = {
      title: 'Join ProBattle',
      text: `Join me on ProBattle and get rewarded! Use my referral code: ${referralCode}`,
      url: link,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copyReferralLink();
      }
    } catch (err) {
      copyReferralLink();
    }
  };

  const getStatusIcon = (completed: boolean) => {
    if (completed) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    return <Clock className="w-4 h-4 text-orange-500" />;
  };

  const getStatusBadge = (referral: Referral) => {
    if (referral.is_rewarded) {
      return (
        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
          <Trophy className="w-3 h-3 mr-1" />
          Rewarded
        </Badge>
      );
    }
    if (referral.referralStatus.firstDepositMade) {
      return (
        <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
          <Sparkles className="w-3 h-3 mr-1" />
          Processing
        </Badge>
      );
    }
    if (referral.referralStatus.bankCardLinked) {
      return (
        <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
          <Banknote className="w-3 h-3 mr-1" />
          Awaiting Deposit
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
        <CreditCard className="w-3 h-3 mr-1" />
        Awaiting Bank
      </Badge>
    );
  };

  if (!user) return null;

  const displayedReferrals = showAllReferrals ? referrals : referrals.slice(0, 5);
  const completedReferrals = referrals.filter(r => r.is_rewarded).length;
  const pendingReferrals = referrals.filter(r => !r.is_rewarded).length;

  return (
    <div className="space-y-4">
      {/* Stats Overview Card */}
      <Card className="glass-card overflow-hidden border-primary/20">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Hero Banner */}
              <div className="relative p-5 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 rounded-2xl border border-primary/30 overflow-hidden mb-4">
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/30 rounded-full blur-3xl" />
                
                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full mb-3">
                    <Gift className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">Referral Program</span>
                  </div>
                  
                  <h2 className="font-display text-2xl font-bold mb-1">
                    Earn <span className="text-gradient">₹{REFERRAL_REWARD}</span> Per Friend
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    When they complete verification (bank card + first deposit)
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-3 bg-secondary/40 rounded-xl text-center border border-border/50">
                  <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="font-display text-xl font-bold">{referrals.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Referred</p>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl text-center border border-border/50">
                  <Wallet className="w-5 h-5 mx-auto text-green-500 mb-1" />
                  <p className="font-display text-xl font-bold text-green-500">₹{totalEarnings}</p>
                  <p className="text-[10px] text-muted-foreground">Total Earned</p>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl text-center border border-border/50">
                  <Clock className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <p className="font-display text-xl font-bold text-orange-500">₹{pendingEarnings}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
              </div>

              {/* Referral Code Section */}
              {referralCode ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-secondary/60 to-secondary/40 border border-border rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">Your Referral Code</p>
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-2xl font-display font-bold text-primary tracking-[0.2em]">
                        {referralCode}
                      </code>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={copyReferralCode}
                        className="shrink-0 h-10 w-10"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="w-full gap-2 h-11" onClick={copyReferralLink}>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </Button>
                    <Button variant="neon" className="w-full gap-2 h-11" onClick={shareReferralLink}>
                      <Share2 className="w-4 h-4" />
                      Share Now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading referral code...</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* How It Works Card */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-[23px] w-0.5 h-[calc(100%-40px)] bg-gradient-to-b from-primary via-blue-500 to-green-500" />
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="relative z-10 w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4 text-primary" />
                </div>
                <div className="pt-1.5">
                  <p className="font-medium text-sm">Friend Registers</p>
                  <p className="text-xs text-muted-foreground">Using your referral code or link</p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="relative z-10 w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                </div>
                <div className="pt-1.5">
                  <p className="font-medium text-sm">Links Bank Card</p>
                  <p className="text-xs text-muted-foreground">Permanent bank details verification</p>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="relative z-10 w-10 h-10 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center shrink-0">
                  <Banknote className="w-4 h-4 text-orange-500" />
                </div>
                <div className="pt-1.5">
                  <p className="font-medium text-sm">Makes First Deposit</p>
                  <p className="text-xs text-muted-foreground">Any amount via UPI payment</p>
                </div>
              </div>
              
              {/* Step 4 */}
              <div className="flex items-start gap-3">
                <div className="relative z-10 w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-green-500" />
                </div>
                <div className="pt-1.5">
                  <p className="font-medium text-sm">You Get ₹{REFERRAL_REWARD}!</p>
                  <p className="text-xs text-muted-foreground">Instant credit to your wallet</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals List Card */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Your Referrals
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                {completedReferrals} completed
              </Badge>
              {pendingReferrals > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1 text-orange-500" />
                  {pendingReferrals} pending
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-secondary/50 flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="font-medium text-muted-foreground mb-1">No referrals yet</p>
              <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                Share your code with friends and start earning ₹{REFERRAL_REWARD} for each verified referral!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedReferrals.map((ref, index) => (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div 
                    className={`rounded-xl border transition-all cursor-pointer ${
                      expandedReferral === ref.id 
                        ? 'bg-secondary/40 border-primary/30' 
                        : 'bg-secondary/20 border-border/50 hover:border-primary/20'
                    }`}
                    onClick={() => setExpandedReferral(expandedReferral === ref.id ? null : ref.id)}
                  >
                    {/* Main Row */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border border-primary/20">
                            {ref.profiles?.avatar_url ? (
                              <img 
                                src={ref.profiles.avatar_url} 
                                alt="" 
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-primary">
                                {(ref.profiles?.username || 'U')[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          {/* Completion indicator */}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            ref.is_rewarded 
                              ? 'bg-green-500 text-white' 
                              : 'bg-orange-500 text-white'
                          }`}>
                            {ref.is_rewarded ? '✓' : `${ref.completionPercent}%`}
                          </div>
                        </div>
                        
                        {/* User Info */}
                        <div>
                          <p className="font-medium text-sm">{ref.profiles?.username || 'User'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Joined {formatDistanceToNow(new Date(ref.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(ref)}
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedReferral === ref.id ? 'rotate-180' : ''
                        }`} />
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedReferral === ref.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-1 border-t border-border/30">
                            {/* Progress Bar */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-muted-foreground">Completion Progress</span>
                                <span className="text-xs font-medium">{ref.completionPercent}%</span>
                              </div>
                              <Progress value={ref.completionPercent} className="h-2" />
                            </div>
                            
                            {/* Status Steps */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className={`p-2 rounded-lg border ${
                                ref.referralStatus.registered 
                                  ? 'bg-green-500/10 border-green-500/30' 
                                  : 'bg-secondary/30 border-border/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(ref.referralStatus.registered)}
                                  <span className="text-xs">Registered</span>
                                </div>
                              </div>
                              
                              <div className={`p-2 rounded-lg border ${
                                ref.referralStatus.bankCardLinked 
                                  ? 'bg-green-500/10 border-green-500/30' 
                                  : 'bg-secondary/30 border-border/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(ref.referralStatus.bankCardLinked)}
                                  <span className="text-xs">Bank Card</span>
                                </div>
                              </div>
                              
                              <div className={`p-2 rounded-lg border ${
                                ref.referralStatus.firstDepositMade 
                                  ? 'bg-green-500/10 border-green-500/30' 
                                  : 'bg-secondary/30 border-border/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(ref.referralStatus.firstDepositMade)}
                                  <span className="text-xs">First Deposit</span>
                                </div>
                              </div>
                              
                              <div className={`p-2 rounded-lg border ${
                                ref.referralStatus.rewardClaimed 
                                  ? 'bg-green-500/10 border-green-500/30' 
                                  : 'bg-secondary/30 border-border/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(ref.referralStatus.rewardClaimed)}
                                  <span className="text-xs">₹{REFERRAL_REWARD} Earned</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Reward Info */}
                            {ref.is_rewarded ? (
                              <div className="mt-3 p-2 bg-green-500/10 rounded-lg border border-green-500/30 flex items-center justify-between">
                                <span className="text-xs text-green-500">Reward Claimed</span>
                                <span className="font-display font-bold text-green-500">+₹{ref.reward_amount}</span>
                              </div>
                            ) : (
                              <div className="mt-3 p-2 bg-orange-500/10 rounded-lg border border-orange-500/30">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                                  <p className="text-[10px] text-orange-500">
                                    {!ref.referralStatus.bankCardLinked 
                                      ? 'Waiting for bank card verification...'
                                      : !ref.referralStatus.firstDepositMade
                                      ? 'Waiting for first deposit...'
                                      : 'Processing reward...'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}

              {referrals.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAllReferrals(!showAllReferrals)}
                >
                  {showAllReferrals ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Show All ({referrals.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralSection;