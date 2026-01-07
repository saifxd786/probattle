import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gem, Save, Loader2, Bomb, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MinesSettings {
  id: string;
  is_enabled: boolean;
  min_entry_amount: number;
  platform_commission: number;
  grid_size: number;
  min_mines: number;
  max_mines: number;
  base_multiplier: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

interface MinesGame {
  id: string;
  user_id: string;
  entry_amount: number;
  mines_count: number;
  is_cashed_out: boolean;
  is_mine_hit: boolean;
  final_amount: number;
  status: string;
  created_at: string;
}

const AdminMinesSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MinesSettings | null>(null);
  const [games, setGames] = useState<MinesGame[]>([]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mines_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (data && !error) {
      setSettings(data as MinesSettings);
    }
    setLoading(false);
  };

  const fetchGames = async () => {
    const { data } = await supabase
      .from('mines_games')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) {
      setGames(data as MinesGame[]);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('mines_settings')
      .update({
        is_enabled: settings.is_enabled,
        min_entry_amount: settings.min_entry_amount,
        platform_commission: settings.platform_commission,
        grid_size: settings.grid_size,
        min_mines: settings.min_mines,
        max_mines: settings.max_mines,
        base_multiplier: settings.base_multiplier,
        difficulty: settings.difficulty
      })
      .eq('id', settings.id);

    if (error) {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved successfully!' });
    }
    setSaving(false);
  };

  useEffect(() => {
    fetchSettings();
    fetchGames();
  }, []);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalGames = games.length;
  const wonGames = games.filter(g => g.status === 'won').length;
  const lostGames = games.filter(g => g.status === 'lost').length;
  const totalWagered = games.reduce((sum, g) => sum + Number(g.entry_amount), 0);
  const totalPaidOut = games.filter(g => g.status === 'won').reduce((sum, g) => sum + Number(g.final_amount), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gem className="w-6 h-6 text-emerald-400" />
            Mines Settings
          </h1>
          <p className="text-muted-foreground">Configure Mines game parameters</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalGames}</div>
            <div className="text-sm text-muted-foreground">Total Games</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{wonGames}</div>
            <div className="text-sm text-muted-foreground">Games Won</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{lostGames}</div>
            <div className="text-sm text-muted-foreground">Games Lost</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">₹{totalWagered}</div>
            <div className="text-sm text-muted-foreground">Total Wagered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">₹{totalPaidOut}</div>
            <div className="text-sm text-muted-foreground">Total Paid Out</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* General Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                General Settings
              </CardTitle>
              <CardDescription>Basic game configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Game Enabled</Label>
                <Switch
                  id="enabled"
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Minimum Entry Amount (₹)</Label>
                <Input
                  type="number"
                  value={settings.min_entry_amount}
                  onChange={(e) => setSettings({ ...settings, min_entry_amount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Platform Commission (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.platform_commission * 100}
                  onChange={(e) => setSettings({ ...settings, platform_commission: Number(e.target.value) / 100 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Base Multiplier</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.base_multiplier}
                  onChange={(e) => setSettings({ ...settings, base_multiplier: Number(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mines Configuration */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bomb className="w-5 h-5" />
                Mines Configuration
              </CardTitle>
              <CardDescription>Set mine count limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Mines</Label>
                  <Input
                    type="number"
                    value={settings.min_mines}
                    onChange={(e) => setSettings({ ...settings, min_mines: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Mines</Label>
                  <Input
                    type="number"
                    value={settings.max_mines}
                    onChange={(e) => setSettings({ ...settings, max_mines: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Grid Size (tiles)</Label>
                <Input
                  type="number"
                  value={settings.grid_size}
                  onChange={(e) => setSettings({ ...settings, grid_size: Number(e.target.value) })}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Fixed at 25 (5x5 grid)</p>
              </div>

              {/* Difficulty Mode */}
              <div className="space-y-2">
                <Label>Difficulty Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'normal', 'hard'] as const).map((diff) => (
                    <Button
                      key={diff}
                      variant="outline"
                      className={cn(
                        'capitalize',
                        settings.difficulty === diff && 'border-primary bg-primary/10 text-primary'
                      )}
                      onClick={() => setSettings({ ...settings, difficulty: diff })}
                    >
                      {diff}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Easy: Lower house edge | Normal: Standard | Hard: Higher house edge
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Games */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
            <CardDescription>Last 50 Mines games played</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Time</th>
                    <th className="text-left py-2 px-4">Entry</th>
                    <th className="text-left py-2 px-4">Mines</th>
                    <th className="text-left py-2 px-4">Result</th>
                    <th className="text-right py-2 px-4">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {games.slice(0, 20).map((game) => (
                    <tr key={game.id} className="border-b border-border/50">
                      <td className="py-2 px-4 text-muted-foreground">
                        {new Date(game.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-4">₹{game.entry_amount}</td>
                      <td className="py-2 px-4">{game.mines_count}</td>
                      <td className="py-2 px-4">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          game.status === 'won' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        )}>
                          {game.status === 'won' ? 'WON' : 'LOST'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right font-medium">
                        {game.status === 'won' ? `₹${game.final_amount}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {games.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No games played yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminMinesSettings;
