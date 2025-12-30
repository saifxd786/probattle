import { motion } from 'framer-motion';
import { Trophy, Clock, CheckCircle2, XCircle, Medal, Coins, Target, Calendar, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface MatchHistory {
  id: string;
  match_id: string;
  position: number | null;
  kills: number;
  is_winner: boolean;
  prize_amount: number;
  created_at: string;
  match: {
    id: string;
    title: string;
    match_type: string;
    map_name: string | null;
    match_time: string;
    entry_fee: number;
    prize_per_kill: number;
    status: string;
  };
}

const MyGamesPage = () => {
  const { user } = useAuth();

  const { data: matchHistory, isLoading } = useQuery({
    queryKey: ['match-history', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get match results for the user
      const { data: results, error: resultsError } = await supabase
        .from('match_results')
        .select(`
          id,
          match_id,
          position,
          kills,
          is_winner,
          prize_amount,
          created_at,
          match:matches (
            id,
            title,
            match_type,
            map_name,
            match_time,
            entry_fee,
            prize_per_kill,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (resultsError) throw resultsError;

      // Also get registrations for matches that don't have results yet
      const { data: registrations, error: regError } = await supabase
        .from('match_registrations')
        .select(`
          id,
          match_id,
          registered_at,
          is_approved,
          match:matches (
            id,
            title,
            match_type,
            map_name,
            match_time,
            entry_fee,
            prize_per_kill,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('is_approved', true)
        .order('registered_at', { ascending: false });

      if (regError) throw regError;

      // Combine results and pending registrations
      const resultMatchIds = new Set(results?.map(r => r.match_id) || []);
      
      const pendingMatches = registrations?.filter(
        reg => !resultMatchIds.has(reg.match_id) && reg.match?.status !== 'upcoming'
      ).map(reg => ({
        id: reg.id,
        match_id: reg.match_id,
        position: null,
        kills: 0,
        is_winner: false,
        prize_amount: 0,
        created_at: reg.registered_at,
        match: reg.match,
        isPending: true
      })) || [];

      return [...(results || []), ...pendingMatches] as (MatchHistory & { isPending?: boolean })[];
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['match-stats', user?.id],
    queryFn: async () => {
      if (!user) return { totalMatches: 0, wins: 0, totalEarnings: 0, totalKills: 0 };

      const { data, error } = await supabase
        .from('match_results')
        .select('is_winner, prize_amount, kills')
        .eq('user_id', user.id);

      if (error) throw error;

      return {
        totalMatches: data?.length || 0,
        wins: data?.filter(r => r.is_winner).length || 0,
        totalEarnings: data?.reduce((sum, r) => sum + (r.prize_amount || 0), 0) || 0,
        totalKills: data?.reduce((sum, r) => sum + (r.kills || 0), 0) || 0,
      };
    },
    enabled: !!user,
  });

  const getPositionBadge = (position: number | null, matchType: string) => {
    if (position === null) return null;
    
    if (matchType === 'tdm') {
      return position === 1 ? (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Winner</Badge>
      ) : (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Lost</Badge>
      );
    }

    switch (position) {
      case 1:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">🥇 1st</Badge>;
      case 2:
        return <Badge className="bg-gray-400/20 text-gray-300 border-gray-400/30">🥈 2nd</Badge>;
      case 3:
        return <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">🥉 3rd</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">#{position}</Badge>;
    }
  };

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'tdm': return 'TDM 1v1';
      case 'classic_solo': return 'Classic Solo';
      case 'classic_duo': return 'Classic Duo';
      case 'classic_squad': return 'Classic Squad';
      default: return type;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container mx-auto px-4 pt-20">
          <div className="glass-card p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-primary/50" />
            <h3 className="font-display text-lg font-bold mb-2">Login Required</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Please login to view your match history
            </p>
            <Link to="/auth">
              <Button variant="neon">Login Now</Button>
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">My Games</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Track your match history and results
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          <div className="glass-card p-4 text-center">
            <Target className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="font-display text-xl font-bold">{stats?.totalMatches || 0}</div>
            <div className="text-xs text-muted-foreground">Matches</div>
          </div>
          <div className="glass-card p-4 text-center">
            <Trophy className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
            <div className="font-display text-xl font-bold">{stats?.wins || 0}</div>
            <div className="text-xs text-muted-foreground">Wins</div>
          </div>
          <div className="glass-card p-4 text-center">
            <Medal className="w-5 h-5 mx-auto mb-2 text-red-500" />
            <div className="font-display text-xl font-bold">{stats?.totalKills || 0}</div>
            <div className="text-xs text-muted-foreground">Total Kills</div>
          </div>
          <div className="glass-card p-4 text-center">
            <Coins className="w-5 h-5 mx-auto mb-2 text-green-500" />
            <div className="font-display text-xl font-bold text-green-500">₹{stats?.totalEarnings || 0}</div>
            <div className="text-xs text-muted-foreground">Earnings</div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !matchHistory || matchHistory.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="font-display text-lg font-bold mb-2">No Games Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Join your first match to start building your history
            </p>
            <Link to="/matches">
              <Button variant="neon">Browse Matches</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {matchHistory.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      game.is_winner 
                        ? 'bg-green-500/10' 
                        : game.position 
                          ? 'bg-red-500/10' 
                          : 'bg-muted'
                    }`}>
                      {game.is_winner ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : game.position ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display text-sm font-bold truncate">
                          {game.match?.title || 'Unknown Match'}
                        </h4>
                        {getPositionBadge(game.position, game.match?.match_type || '')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{getMatchTypeLabel(game.match?.match_type || '')}</span>
                        {game.match?.map_name && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{game.match.map_name}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {game.kills > 0 && (
                          <span className="flex items-center gap-1 text-red-400">
                            <Target className="w-3 h-3" />
                            {game.kills} kills
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(game.match?.match_time || game.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {game.prize_amount > 0 ? (
                      <div className="font-display text-sm font-bold text-green-500">
                        +₹{game.prize_amount}
                      </div>
                    ) : game.position ? (
                      <div className="font-display text-sm font-bold text-red-500">
                        -₹{game.match?.entry_fee || 0}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    )}
                    {game.match?.prize_per_kill && game.kills > 0 && (
                      <div className="text-xs text-green-400 mt-1">
                        +₹{game.kills * game.match.prize_per_kill} (kills)
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default MyGamesPage;
