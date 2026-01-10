import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Trophy, XCircle, Gamepad2, Loader2, Calendar, TrendingUp, TrendingDown, Gem, Bomb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SupportChat from '@/components/SupportChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

type LudoGame = {
  id: string;
  entry_amount: number;
  reward_amount: number;
  status: string;
  created_at: string;
  ended_at: string | null;
  winner_id: string | null;
  ludo_match_players: { user_id: string; is_winner: boolean }[];
};

type ThimbleGame = {
  id: string;
  entry_amount: number;
  reward_amount: number;
  difficulty: string;
  is_win: boolean | null;
  created_at: string;
  completed_at: string | null;
};

type MinesGame = {
  id: string;
  entry_amount: number;
  mines_count: number;
  revealed_positions: number[];
  current_multiplier: number;
  final_amount: number | null;
  status: string;
  is_mine_hit: boolean | null;
  is_cashed_out: boolean | null;
  created_at: string;
  completed_at: string | null;
};

const GameHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ludoGames, setLudoGames] = useState<LudoGame[]>([]);
  const [thimbleGames, setThimbleGames] = useState<ThimbleGame[]>([]);
  const [minesGames, setMinesGames] = useState<MinesGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchGameHistory();
  }, [user, navigate]);

  const fetchGameHistory = async () => {
    if (!user) return;
    setIsLoading(true);

    // Fetch Ludo games
    const { data: ludoData } = await supabase
      .from('ludo_matches')
      .select(`
        id,
        entry_amount,
        reward_amount,
        status,
        created_at,
        ended_at,
        winner_id,
        ludo_match_players (user_id, is_winner)
      `)
      .or(`created_by.eq.${user.id},winner_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (ludoData) {
      // Filter to only include games where user participated
      const userGames = ludoData.filter(game => 
        game.ludo_match_players?.some(p => p.user_id === user.id)
      );
      setLudoGames(userGames);
    }

    // Fetch Thimble games
    const { data: thimbleData } = await supabase
      .from('thimble_games')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (thimbleData) {
      setThimbleGames(thimbleData);
    }

    // Fetch Mines games
    const { data: minesData } = await supabase
      .from('mines_games')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['won', 'lost'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (minesData) {
      setMinesGames(minesData as MinesGame[]);
    }

    setIsLoading(false);
  };

  // Calculate stats
  const ludoStats = {
    total: ludoGames.filter(g => g.status === 'completed').length,
    wins: ludoGames.filter(g => g.ludo_match_players?.find(p => p.user_id === user?.id)?.is_winner).length,
    totalWon: ludoGames
      .filter(g => g.ludo_match_players?.find(p => p.user_id === user?.id)?.is_winner)
      .reduce((sum, g) => sum + Number(g.reward_amount), 0),
    totalLost: ludoGames
      .filter(g => g.status === 'completed' && !g.ludo_match_players?.find(p => p.user_id === user?.id)?.is_winner)
      .reduce((sum, g) => sum + Number(g.entry_amount), 0),
  };

  const thimbleStats = {
    total: thimbleGames.length,
    wins: thimbleGames.filter(g => g.is_win).length,
    totalWon: thimbleGames.filter(g => g.is_win).reduce((sum, g) => sum + Number(g.reward_amount), 0),
    totalLost: thimbleGames.filter(g => !g.is_win).reduce((sum, g) => sum + Number(g.entry_amount), 0),
  };

  const minesStats = {
    total: minesGames.length,
    wins: minesGames.filter(g => g.status === 'won').length,
    totalWon: minesGames.filter(g => g.status === 'won').reduce((sum, g) => sum + Number(g.final_amount || 0), 0),
    totalLost: minesGames.filter(g => g.status === 'lost').reduce((sum, g) => sum + Number(g.entry_amount), 0),
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-500';
      case 'hard': return 'bg-yellow-500/20 text-yellow-500';
      case 'impossible': return 'bg-red-500/20 text-red-500';
      default: return 'bg-primary/20 text-primary';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <History className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Game History</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            View your Ludo, Thimble and Mines game history with stats
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="ludo" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ludo" className="gap-2">
                <Gamepad2 className="w-4 h-4" />
                Ludo
              </TabsTrigger>
              <TabsTrigger value="thimble" className="gap-2">
                🎩
                Thimble
              </TabsTrigger>
              <TabsTrigger value="mines" className="gap-2">
                <Gem className="w-4 h-4" />
                Mines
              </TabsTrigger>
            </TabsList>

            {/* Ludo Tab */}
            <TabsContent value="ludo" className="space-y-4">
              {/* Ludo Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <Gamepad2 className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="font-display text-xl font-bold">{ludoStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Games</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                    <p className="font-display text-xl font-bold">{ludoStats.wins}</p>
                    <p className="text-xs text-muted-foreground">Wins</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="font-display text-xl font-bold text-green-500">₹{ludoStats.totalWon}</p>
                    <p className="text-xs text-muted-foreground">Total Won</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-500" />
                    <p className="font-display text-xl font-bold text-red-500">₹{ludoStats.totalLost}</p>
                    <p className="text-xs text-muted-foreground">Total Lost</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Ludo Games List */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Ludo Games</CardTitle>
                </CardHeader>
                <CardContent>
                  {ludoGames.length === 0 ? (
                    <div className="text-center py-8">
                      <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No Ludo games played yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ludoGames.map((game, index) => {
                        const isWinner = game.ludo_match_players?.find(p => p.user_id === user.id)?.is_winner;
                        return (
                          <motion.div
                            key={game.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 bg-secondary/30 rounded-lg flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${isWinner ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                {isWinner ? (
                                  <Trophy className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {isWinner ? 'Won' : game.status === 'completed' ? 'Lost' : game.status}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(game.created_at), 'MMM dd, hh:mm a')}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-display font-bold ${isWinner ? 'text-green-500' : 'text-red-500'}`}>
                                {isWinner ? `+₹${game.reward_amount}` : `-₹${game.entry_amount}`}
                              </p>
                              <p className="text-xs text-muted-foreground">Entry: ₹{game.entry_amount}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Thimble Tab */}
            <TabsContent value="thimble" className="space-y-4">
              {/* Thimble Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <span className="text-xl">🎩</span>
                    <p className="font-display text-xl font-bold">{thimbleStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Games</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                    <p className="font-display text-xl font-bold">{thimbleStats.wins}</p>
                    <p className="text-xs text-muted-foreground">Wins</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="font-display text-xl font-bold text-green-500">₹{thimbleStats.totalWon}</p>
                    <p className="text-xs text-muted-foreground">Total Won</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-500" />
                    <p className="font-display text-xl font-bold text-red-500">₹{thimbleStats.totalLost}</p>
                    <p className="text-xs text-muted-foreground">Total Lost</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Win Rate */}
              {thimbleStats.total > 0 && (
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="font-display font-bold text-primary">
                        {((thimbleStats.wins / thimbleStats.total) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-green-500"
                        style={{ width: `${(thimbleStats.wins / thimbleStats.total) * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Thimble Games List */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Thimble Games</CardTitle>
                </CardHeader>
                <CardContent>
                  {thimbleGames.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-4xl mb-3 block">🎩</span>
                      <p className="text-muted-foreground">No Thimble games played yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {thimbleGames.map((game, index) => (
                        <motion.div
                          key={game.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 bg-secondary/30 rounded-lg flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${game.is_win ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                              {game.is_win ? (
                                <Trophy className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{game.is_win ? 'Won' : 'Lost'}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getDifficultyColor(game.difficulty)}`}>
                                  {game.difficulty.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(game.created_at), 'MMM dd, hh:mm a')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-display font-bold ${game.is_win ? 'text-green-500' : 'text-red-500'}`}>
                              {game.is_win ? `+₹${game.reward_amount}` : `-₹${game.entry_amount}`}
                            </p>
                            <p className="text-xs text-muted-foreground">Entry: ₹{game.entry_amount}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mines Tab */}
            <TabsContent value="mines" className="space-y-4">
              {/* Mines Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <Gem className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                    <p className="font-display text-xl font-bold">{minesStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Games</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                    <p className="font-display text-xl font-bold">{minesStats.wins}</p>
                    <p className="text-xs text-muted-foreground">Wins</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="font-display text-xl font-bold text-green-500">₹{minesStats.totalWon}</p>
                    <p className="text-xs text-muted-foreground">Total Won</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-500" />
                    <p className="font-display text-xl font-bold text-red-500">₹{minesStats.totalLost}</p>
                    <p className="text-xs text-muted-foreground">Total Lost</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Win Rate */}
              {minesStats.total > 0 && (
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="font-display font-bold text-primary">
                        {((minesStats.wins / minesStats.total) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
                        style={{ width: `${(minesStats.wins / minesStats.total) * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mines Games List */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Mines Games</CardTitle>
                </CardHeader>
                <CardContent>
                  {minesGames.length === 0 ? (
                    <div className="text-center py-8">
                      <Gem className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No Mines games played yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {minesGames.map((game, index) => {
                        const isWin = game.status === 'won';
                        return (
                          <motion.div
                            key={game.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 bg-secondary/30 rounded-lg flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${isWin ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                {isWin ? (
                                  <Gem className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Bomb className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{isWin ? 'Cashed Out' : 'Boom!'}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                                    {game.mines_count} mines
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(game.created_at), 'MMM dd, hh:mm a')}
                                  <span>• {game.revealed_positions?.length || 0} gems revealed</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-display font-bold ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                                {isWin ? `+₹${game.final_amount}` : `-₹${game.entry_amount}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isWin ? `${game.current_multiplier.toFixed(2)}x` : `Entry: ₹${game.entry_amount}`}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <BottomNav />
      <SupportChat />
    </div>
  );
};

export default GameHistoryPage;
