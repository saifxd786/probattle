import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Eye, Shuffle, Clock, DollarSign, Percent, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ThimbleSettings {
  id: string;
  is_enabled: boolean;
  difficulty: 'easy' | 'hard' | 'impossible';
  min_entry_amount: number;
  reward_multiplier: number;
  platform_commission: number;
  shuffle_duration_easy: number;
  shuffle_duration_hard: number;
  shuffle_duration_impossible: number;
  selection_time_easy: number;
  selection_time_hard: number;
  selection_time_impossible: number;
}

interface ThimbleGame {
  id: string;
  user_id: string;
  entry_amount: number;
  reward_amount: number;
  is_win: boolean | null;
  difficulty: string;
  status: string;
  created_at: string;
  profiles?: { username: string; email: string };
}

const AdminThimbleSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ThimbleSettings | null>(null);
  const [games, setGames] = useState<ThimbleGame[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchGames();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('thimble_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      toast({ title: 'Failed to load settings', variant: 'destructive' });
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from('thimble_games')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setGames(data as any);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    const { error } = await supabase
      .from('thimble_settings')
      .update({
        is_enabled: settings.is_enabled,
        difficulty: settings.difficulty,
        min_entry_amount: settings.min_entry_amount,
        reward_multiplier: settings.reward_multiplier,
        platform_commission: settings.platform_commission,
        shuffle_duration_easy: settings.shuffle_duration_easy,
        shuffle_duration_hard: settings.shuffle_duration_hard,
        shuffle_duration_impossible: settings.shuffle_duration_impossible,
        selection_time_easy: settings.selection_time_easy,
        selection_time_hard: settings.selection_time_hard,
        selection_time_impossible: settings.selection_time_impossible
      })
      .eq('id', settings.id);

    if (error) {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved successfully' });
    }
    setSaving(false);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const difficultyOptions = [
    { value: 'easy', label: 'Easy', desc: 'Slow shuffle, 10s to select', color: 'bg-green-500' },
    { value: 'hard', label: 'Hard', desc: 'Medium shuffle, 6s to select', color: 'bg-amber-500' },
    { value: 'impossible', label: 'Impossible', desc: 'Fast shuffle, 3s to select', color: 'bg-red-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Thimble Game Settings</h1>
          <p className="text-muted-foreground">Manage thimble game configuration</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Settings className="w-5 h-5 text-primary" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Enable Thimble Game</Label>
                  <p className="text-xs text-muted-foreground">Allow users to play</p>
                </div>
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, is_enabled: checked })
                  }
                />
              </div>

              {/* Min Entry */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Minimum Entry Amount (₹)
                </Label>
                <Input
                  type="number"
                  value={settings.min_entry_amount}
                  onChange={(e) =>
                    setSettings({ ...settings, min_entry_amount: Number(e.target.value) })
                  }
                  className="bg-background border-border text-foreground"
                />
              </div>

              {/* Reward Multiplier */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Reward Multiplier (x)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.reward_multiplier}
                  onChange={(e) =>
                    setSettings({ ...settings, reward_multiplier: Number(e.target.value) })
                  }
                  className="bg-background border-border text-foreground"
                />
              </div>

              {/* Commission */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary" />
                  Platform Commission (0-1)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  max="1"
                  min="0"
                  value={settings.platform_commission}
                  onChange={(e) =>
                    setSettings({ ...settings, platform_commission: Number(e.target.value) })
                  }
                  className="bg-background border-border text-foreground"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Difficulty Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Shuffle className="w-5 h-5 text-primary" />
                Difficulty Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Global Difficulty */}
              <div className="space-y-3">
                <Label className="text-foreground">Global Difficulty</Label>
                <div className="grid gap-2">
                  {difficultyOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSettings({ ...settings, difficulty: opt.value as any })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        settings.difficulty === opt.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${opt.color}`} />
                        <div>
                          <p className="font-medium text-foreground">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shuffle Durations */}
              <div className="space-y-3">
                <Label className="text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Shuffle Duration (ms)
                </Label>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">Easy:</span>
                    <Input
                      type="number"
                      value={settings.shuffle_duration_easy}
                      onChange={(e) =>
                        setSettings({ ...settings, shuffle_duration_easy: Number(e.target.value) })
                      }
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">Hard:</span>
                    <Input
                      type="number"
                      value={settings.shuffle_duration_hard}
                      onChange={(e) =>
                        setSettings({ ...settings, shuffle_duration_hard: Number(e.target.value) })
                      }
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">Impossible:</span>
                    <Input
                      type="number"
                      value={settings.shuffle_duration_impossible}
                      onChange={(e) =>
                        setSettings({ ...settings, shuffle_duration_impossible: Number(e.target.value) })
                      }
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Selection Times */}
              <div className="space-y-3">
                <Label className="text-foreground">Selection Time (seconds)</Label>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">Easy:</span>
                    <Input
                      type="number"
                      value={settings.selection_time_easy}
                      onChange={(e) =>
                        setSettings({ ...settings, selection_time_easy: Number(e.target.value) })
                      }
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">Hard:</span>
                    <Input
                      type="number"
                      value={settings.selection_time_hard}
                      onChange={(e) =>
                        setSettings({ ...settings, selection_time_hard: Number(e.target.value) })
                      }
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">Impossible:</span>
                    <Input
                      type="number"
                      value={settings.selection_time_impossible}
                      onChange={(e) =>
                        setSettings({ ...settings, selection_time_impossible: Number(e.target.value) })
                      }
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Game Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <History className="w-5 h-5 text-primary" />
              Recent Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">User</TableHead>
                    <TableHead className="text-muted-foreground">Entry</TableHead>
                    <TableHead className="text-muted-foreground">Result</TableHead>
                    <TableHead className="text-muted-foreground">Difficulty</TableHead>
                    <TableHead className="text-muted-foreground">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No games played yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    games.map((game) => (
                      <TableRow key={game.id} className="border-border">
                        <TableCell className="text-foreground">
                          {game.profiles?.username || game.profiles?.email || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-foreground">₹{game.entry_amount}</TableCell>
                        <TableCell>
                          {game.is_win === null ? (
                            <Badge variant="secondary">Pending</Badge>
                          ) : game.is_win ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Won ₹{game.reward_amount}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Lost</Badge>
                          )}
                        </TableCell>
                        <TableCell className="capitalize text-foreground">{game.difficulty}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(game.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminThimbleSettings;
