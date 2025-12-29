import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Edit2, Save, X, History, Trophy, Calendar, Loader2, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  user_code: string | null;
  wallet_balance: number;
  is_banned: boolean;
  created_at: string;
};

type MatchRegistration = {
  id: string;
  match_id: string;
  is_approved: boolean;
  payment_status: string;
  registered_at: string;
  matches: {
    title: string;
    game: string;
    match_type: string;
    entry_fee: number;
    prize_pool: number;
    status: string;
    match_time: string;
  } | null;
};

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    setIsLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setNewUsername(profileData.username || '');
    }

    // Fetch match history
    const { data: registrations } = await supabase
      .from('match_registrations')
      .select(`
        id,
        match_id,
        is_approved,
        payment_status,
        registered_at,
        matches (
          title,
          game,
          match_type,
          entry_fee,
          prize_pool,
          status,
          match_time
        )
      `)
      .eq('user_id', user.id)
      .order('registered_at', { ascending: false });

    if (registrations) {
      setMatchHistory(registrations as MatchRegistration[]);
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

  const handleSaveUsername = async () => {
    if (!user || !newUsername.trim()) return;

    if (newUsername.trim().length < 3) {
      toast({ title: 'Error', description: 'Username must be at least 3 characters', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ username: newUsername.trim() })
      .eq('id', user.id);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Error', description: 'This username is already taken', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Success', description: 'Username updated successfully' });
      setIsEditing(false);
      fetchData();
    }

    setIsSaving(false);
  };

  const copyUserCode = () => {
    if (profile?.user_code) {
      navigator.clipboard.writeText(profile.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-gray-500/20 text-gray-400';
      case 'live': return 'bg-green-500/20 text-green-500';
      case 'upcoming': return 'bg-blue-500/20 text-blue-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-yellow-500/20 text-yellow-500';
    }
  };

  const getRegistrationStatus = (reg: MatchRegistration) => {
    if (reg.is_approved) return { text: 'Approved', color: 'text-green-500' };
    if (reg.payment_status === 'rejected') return { text: 'Rejected', color: 'text-red-500' };
    return { text: 'Pending', color: 'text-yellow-500' };
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card overflow-hidden">
                <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5" />
                <CardContent className="relative pt-0">
                  {/* Avatar */}
                  <div className="absolute -top-10 left-6">
                    <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-background flex items-center justify-center">
                      <span className="font-display text-2xl font-bold text-primary">
                        {profile?.username?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-12 space-y-4">
                    {/* Username */}
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="Enter username"
                            className="max-w-xs"
                          />
                          <Button size="icon" variant="ghost" onClick={handleSaveUsername} disabled={isSaving}>
                            <Save className="w-4 h-4 text-green-500" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setIsEditing(false); setNewUsername(profile?.username || ''); }}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h1 className="font-display text-2xl font-bold">{profile?.username || 'No Username'}</h1>
                          <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* User Code */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">User ID:</span>
                      <code className="px-2 py-1 bg-primary/10 rounded font-mono text-primary">
                        {profile?.user_code}
                      </code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={copyUserCode}>
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                      <div className="text-center">
                        <div className="font-display text-xl font-bold text-primary">
                          ₹{(profile?.wallet_balance || 0).toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Wallet</div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-xl font-bold">
                          {matchHistory.filter(m => m.is_approved).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Matches</div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-xl font-bold">
                          {matchHistory.filter(m => m.matches?.status === 'completed' && m.is_approved).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Played</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Account Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5 text-primary" />
                    Account Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{profile?.phone || user.email?.split('@')[0] || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Account Status</span>
                    <span className={`font-medium ${profile?.is_banned ? 'text-red-500' : 'text-green-500'}`}>
                      {profile?.is_banned ? 'Banned' : 'Active'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium">
                      {profile?.created_at ? format(new Date(profile.created_at), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Match History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="w-5 h-5 text-primary" />
                    Match History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {matchHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No matches joined yet</p>
                      <p className="text-sm text-muted-foreground">Join your first match to see history here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {matchHistory.map((reg, index) => {
                        const status = getRegistrationStatus(reg);
                        return (
                          <motion.div
                            key={reg.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 bg-secondary/30 rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{reg.matches?.title || 'Unknown Match'}</h4>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getMatchStatusColor(reg.matches?.status || '')}`}>
                                    {reg.matches?.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="uppercase">{reg.matches?.game}</span>
                                  <span>•</span>
                                  <span>{reg.matches?.match_type?.replace('_', ' ').toUpperCase()}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-display font-bold">
                                  {reg.matches?.entry_fee === 0 ? 'Free' : `₹${reg.matches?.entry_fee}`}
                                </div>
                                <div className={`text-xs ${status.color}`}>{status.text}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {reg.matches?.match_time 
                                ? format(new Date(reg.matches.match_time), 'MMM dd, yyyy hh:mm a')
                                : format(new Date(reg.registered_at), 'MMM dd, yyyy hh:mm a')
                              }
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </main>

      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default ProfilePage;
