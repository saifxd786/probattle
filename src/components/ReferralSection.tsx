import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, Check, Users, Wallet, Loader2, Share2, ChevronDown, ChevronUp, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
  } | null;
};

const ReferralSection = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllReferrals, setShowAllReferrals] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchReferralData();
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      }

      const { data: refData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (refData) {
        const referralsWithProfiles = await Promise.all(
          refData.map(async (ref) => {
            const { data: refProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', ref.referred_id)
              .maybeSingle();
            return { ...ref, profiles: refProfile } as Referral;
          })
        );
        setReferrals(referralsWithProfiles);
        setTotalEarnings(refData.reduce((sum, r) => sum + (r.reward_amount || 0), 0));
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

  if (!user) return null;

  const displayedReferrals = showAllReferrals ? referrals : referrals.slice(0, 5);

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="w-5 h-5 text-primary" />
          Refer & Earn
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <div className="relative p-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="text-center mb-3">
                  <h3 className="font-display text-xl font-bold mb-1">
                    Earn <span className="text-gradient">₹10</span> Per Referral
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    When your friend completes verification
                  </p>
                </div>

                {/* How it works - Updated flow */}
                <div className="grid grid-cols-4 gap-1 mb-4">
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <div className="w-7 h-7 mx-auto mb-1 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</div>
                    <p className="text-[9px] text-muted-foreground">Share Code</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <div className="w-7 h-7 mx-auto mb-1 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-500">2</div>
                    <p className="text-[9px] text-muted-foreground">Friend Joins</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <div className="w-7 h-7 mx-auto mb-1 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-500">3</div>
                    <p className="text-[9px] text-muted-foreground">Bank + Deposit</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <div className="w-7 h-7 mx-auto mb-1 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-500">4</div>
                    <p className="text-[9px] text-muted-foreground">Get ₹10</p>
                  </div>
                </div>
                
                <p className="text-[10px] text-center text-muted-foreground bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                  ⚠️ Friend must link bank card & make 1st deposit for you to earn
                </p>
              </div>
            </div>

            {/* Referral Code Section */}
            {referralCode ? (
              <div className="space-y-3">
                <div className="p-3 bg-secondary/50 border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-2xl font-display font-bold text-primary tracking-wider">
                      {referralCode}
                    </code>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={copyReferralCode}
                      className="shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full gap-2" onClick={copyReferralLink}>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </Button>
                  <Button variant="neon" className="w-full gap-2" onClick={shareReferralLink}>
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading referral code...</p>
              </div>
            )}

            {/* Stats Cards - Updated for new system */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="font-display text-xl font-bold">{referrals.length}</p>
                <p className="text-[10px] text-muted-foreground">Friends Referred</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <Wallet className="w-5 h-5 mx-auto text-green-500 mb-1" />
                <p className="font-display text-xl font-bold text-green-500">₹{totalEarnings.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">Total Earned</p>
              </div>
            </div>
            
            {/* Pending referrals info */}
            {referrals.filter(r => r.status === 'pending').length > 0 && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <p className="text-sm text-orange-500">
                    {referrals.filter(r => r.status === 'pending').length} friend(s) pending verification
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  They need to link bank card + make first deposit
                </p>
              </div>
            )}

            {/* Referrals List */}
            {referrals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Your Referrals</p>
                  <span className="text-xs text-muted-foreground">{referrals.length} total</span>
                </div>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {displayedReferrals.map((ref, index) => (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {(ref.profiles?.username || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{ref.profiles?.username || 'User'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(ref.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {ref.status === 'rewarded' && ref.reward_amount > 0 ? (
                            <span className="flex items-center gap-1 text-xs text-green-500">
                              <CheckCircle2 className="w-3 h-3" />
                              ₹{ref.reward_amount.toFixed(0)}
                            </span>
                          ) : ref.status === 'pending' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500">
                              Awaiting verification
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              Processing
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

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

            {/* Empty State */}
            {referrals.length === 0 && (
              <div className="text-center py-6 px-4 bg-secondary/20 rounded-lg">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No referrals yet</p>
                <p className="text-xs text-muted-foreground">
                  Share your code and start earning 2.5% on every deposit!
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralSection;