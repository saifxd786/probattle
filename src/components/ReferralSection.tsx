import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, Check, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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

const REFERRAL_REWARD = 10; // ₹10 per referral

const ReferralSection = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchReferralData();
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;

    // Fetch user's referral code
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();

    if (profile?.referral_code) {
      setReferralCode(profile.referral_code);
    }

    // Fetch referrals made by this user
    const { data: refData } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (refData) {
      // Fetch profiles for each referral
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

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Referral Card */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5 text-primary" />
            Refer & Earn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      {referrals.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.slice(0, 5).map((ref) => (
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
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default ReferralSection;
