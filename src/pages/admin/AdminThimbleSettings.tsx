import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, DollarSign, Percent, History, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

interface ThimbleSettings {
  id: string;
  is_enabled: boolean;
  min_entry_amount: number;
  platform_commission: number;
  shuffle_duration_easy: number;
  shuffle_duration_hard: number;
  shuffle_duration_impossible: number;
  selection_time_easy: number;
  selection_time_hard: number;
  selection_time_impossible: number;
  reward_multiplier_easy: number;
  reward_multiplier_hard: number;
  reward_multiplier_impossible: number;
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
      setSettings({
        ...data,
        reward_multiplier_easy: data.reward_multiplier_easy ?? 1.5,
        reward_multiplier_hard: data.reward_multiplier_hard ?? 2,
        reward_multiplier_impossible: data.reward_multiplier_impossible ?? 3,
      });
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
        min_entry_amount: settings.min_entry_amount,
        platform_commission: settings.platform_commission,
        shuffle_duration_easy: settings.shuffle_duration_easy,
        shuffle_duration_hard: settings.shuffle_duration_hard,
        shuffle_duration_impossible: settings.shuffle_duration_impossible,
        selection_time_easy: settings.selection_time_easy,
        selection_time_hard: settings.selection_time_hard,
        selection_time_impossible: settings.selection_time_impossible,
        reward_multiplier_easy: settings.reward_multiplier_easy,
        reward_multiplier_hard: settings.reward_multiplier_hard,
        reward_multiplier_impossible: settings.reward_multiplier_impossible,
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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Thimble Settings</h1>
          <p className="text-muted-foreground">Manage Thimble game configuration</p>
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
                <Zap className="w-5 h-5 text-primary" />
                Difficulty Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Easy Mode */}
              <div className="space-y-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                  Easy Mode
                </Badge>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Time (sec)</Label>
                    <Input
                      type="number"
                      value={settings.selection_time_easy}
                      onChange={(e) =>
                        setSettings({ ...settings, selection_time_easy: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Shuffle (ms)</Label>
                    <Input
                      type="number"
                      value={settings.shuffle_duration_easy}
                      onChange={(e) =>
                        setSettings({ ...settings, shuffle_duration_easy: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Win (x)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.reward_multiplier_easy}
                      onChange={(e) =>
                        setSettings({ ...settings, reward_multiplier_easy: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Normal/Hard Mode */}
              <div className="space-y-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  Normal Mode
                </Badge>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Time (sec)</Label>
                    <Input
                      type="number"
                      value={settings.selection_time_hard}
                      onChange={(e) =>
                        setSettings({ ...settings, selection_time_hard: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Shuffle (ms)</Label>
                    <Input
                      type="number"
                      value={settings.shuffle_duration_hard}
                      onChange={(e) =>
                        setSettings({ ...settings, shuffle_duration_hard: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Win (x)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.reward_multiplier_hard}
                      onChange={(e) =>
                        setSettings({ ...settings, reward_multiplier_hard: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Hard/Impossible Mode */}
              <div className="space-y-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                  Hard Mode
                </Badge>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Time (sec)</Label>
                    <Input
                      type="number"
                      value={settings.selection_time_impossible}
                      onChange={(e) =>
                        setSettings({ ...settings, selection_time_impossible: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Shuffle (ms)</Label>
                    <Input
                      type="number"
                      value={settings.shuffle_duration_impossible}
                      onChange={(e) =>
                        setSettings({ ...settings, shuffle_duration_impossible: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Win (x)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.reward_multiplier_impossible}
                      onChange={(e) =>
                        setSettings({ ...settings, reward_multiplier_impossible: Number(e.target.value) })
                      }
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
                        <TableCell className="text-foreground font-mono text-xs">
                          {game.user_id.slice(0, 8)}...
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