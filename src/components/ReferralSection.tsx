import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, Check, Users, Wallet, Coins, Flame, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useDailyBonus } from '@/hooks/useDailyBonus';

type Referral = {
  id: string;
  referred_id: string;
  reward_amount: number;
  is_rewarded: boolean;
  created_at: string;
  profiles: {
    username: string | null;
  } | null;
};

const REFERRAL_REWARD = 10;

const ReferralSection = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // Daily bonus integration
  const { bonusData, isLoading: isBonusLoading, isClaiming, isConverting, claimDailyBonus, convertCoins } = useDailyBonus();
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [coinsInput, setCoinsInput] = useState('');
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchReferralData();
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;

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
      setTotalEarnings(refData.filter(r => r.is_rewarded).reduce((sum, r) => sum + r.reward_amount, 0));
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
    toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async () => {
    setShowClaimAnimation(true);
    await claimDailyBonus();
    setTimeout(() => setShowClaimAnimation(false), 1500);
  };

  const handleConvert = async () => {
    const coins = parseInt(coinsInput);
    if (isNaN(coins)) return;
    
    const success = await convertCoins(coins);
    if (success) {
      setIsConvertOpen(false);
      setCoinsInput('');
    }
  };

  const convertibleCoins = bonusData ? Math.floor(bonusData.coins / 100) * 100 : 0;
  const rupeesWorth = convertibleCoins / 10;

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="glass-card overflow-hidden">
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-secondary/50">
            <TabsTrigger value="daily" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Coins className="w-4 h-4 mr-2" />
              Daily Bonus
            </TabsTrigger>
            <TabsTrigger value="referral" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Gift className="w-4 h-4 mr-2" />
              Refer & Earn
            </TabsTrigger>
          </TabsList>
          
          {/* Daily Bonus Tab */}
          <TabsContent value="daily" className="p-4 space-y-4 relative">
            {/* Background glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />
            
            {/* Claim animation overlay */}
            <AnimatePresence>
              {showClaimAnimation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 flex items-center justify-center z-10 rounded-lg"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    className="text-4xl"
                  >
                    🎉
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {isBonusLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="relative">
                {/* Header with streak */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm">Daily Login Bonus</h3>
                      <p className="text-xs text-muted-foreground">100 coins = ₹10</p>
                    </div>
                  </div>
                  
                  {bonusData && bonusData.streak > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-full">
                      <Flame className="w-3 h-3 text-orange-500" />
                      <span className="text-xs font-bold text-orange-500">{bonusData.streak} Day Streak</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between bg-card/50 rounded-lg p-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Your Coins</p>
                    <p className="font-display text-2xl font-bold text-yellow-500">
                      {bonusData?.coins || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Worth</p>
                    <p className="font-display text-xl font-bold text-green-500">
                      ₹{((bonusData?.coins || 0) / 10).toFixed(1)}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {bonusData?.canClaim ? (
                    <Button
                      onClick={handleClaim}
                      disabled={isClaiming}
                      className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-none"
                      size="sm"
                    >
                      {isClaiming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          Claim +10 Coins
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="flex-1 bg-muted text-muted-foreground border-none"
                      size="sm"
                    >
                      ✓ Claimed Today
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => setIsConvertOpen(true)}
                    disabled={!bonusData || bonusData.coins < 100}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral" className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite friends and earn ₹{REFERRAL_REWARD} for each successful signup!
            </p>

            {referralCode ? (
              <>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xl font-display font-bold text-primary">
                      {referralCode}
                    </code>
                    <Button variant="outline" size="icon" onClick={copyReferralCode}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button variant="neon" className="w-full" onClick={copyReferralLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Referral Link
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading referral code...</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-display font-bold">{referrals.length}</p>
                <p className="text-xs text-muted-foreground">Friends Invited</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <Wallet className="w-5 h-5 mx-auto text-green-500 mb-1" />
                <p className="text-2xl font-display font-bold text-green-500">₹{totalEarnings}</p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>

            {/* Recent Referrals */}
            {referrals.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Recent Referrals</p>
                <div className="space-y-2">
                  {referrals.slice(0, 3).map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/20"
                    >
                      <span className="text-sm">{ref.profiles?.username || 'User'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ref.is_rewarded 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {ref.is_rewarded ? `+₹${ref.reward_amount}` : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Convert Dialog */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              Convert Coins to Wallet
            </DialogTitle>
            <DialogDescription>
              Convert your coins to wallet balance (100 coins = ₹10)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Available Coins</p>
              <p className="font-display text-3xl font-bold text-yellow-500">
                {bonusData?.coins || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Convertible: {convertibleCoins} coins = ₹{rupeesWorth}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Coins to Convert (min 100)
              </label>
              <Input
                type="number"
                placeholder="Enter coins (multiples of 100)"
                value={coinsInput}
                onChange={(e) => setCoinsInput(e.target.value)}
                min={100}
                step={100}
                max={bonusData?.coins || 0}
              />
              {coinsInput && parseInt(coinsInput) >= 100 && (
                <p className="text-sm text-green-500 mt-2">
                  You'll get ₹{(parseInt(coinsInput) / 10).toFixed(1)} in your wallet
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCoinsInput(String(convertibleCoins))}
                disabled={convertibleCoins === 0}
                className="flex-1"
              >
                Max ({convertibleCoins})
              </Button>
              <Button
                onClick={handleConvert}
                disabled={isConverting || !coinsInput || parseInt(coinsInput) < 100 || parseInt(coinsInput) > (bonusData?.coins || 0)}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-none"
              >
                {isConverting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Convert'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ReferralSection;