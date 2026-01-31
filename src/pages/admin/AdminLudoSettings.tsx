import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dices, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminLudoSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    isEnabled: true,
    minEntryAmount: 100,
    rewardMultiplier: 1.5,
    difficulty: 'normal',
    diceRandomnessWeight: 0.5,
    newUserBoost: true,
    highAmountCompetitive: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('ludo_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSettings({
        isEnabled: data.is_enabled,
        minEntryAmount: Number(data.min_entry_amount),
        rewardMultiplier: Number(data.reward_multiplier),
        difficulty: data.difficulty,
        diceRandomnessWeight: Number(data.dice_randomness_weight),
        newUserBoost: data.new_user_boost,
        highAmountCompetitive: data.high_amount_competitive
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('ludo_settings')
      .update({
        is_enabled: settings.isEnabled,
        min_entry_amount: settings.minEntryAmount,
        reward_multiplier: settings.rewardMultiplier,
        difficulty: settings.difficulty as 'easy' | 'normal' | 'competitive',
        dice_randomness_weight: settings.diceRandomnessWeight,
        new_user_boost: settings.newUserBoost,
        high_amount_competitive: settings.highAmountCompetitive
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    setSaving(false);

    if (error) {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved successfully' });
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Ludo Settings</h1>
          <p className="text-muted-foreground">Manage Ludo game configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Module Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Dices className="w-5 h-5 text-primary" />
                Module Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Enable Ludo</Label>
                  <p className="text-xs text-muted-foreground">Allow users to play Ludo</p>
                </div>
                <Switch
                  checked={settings.isEnabled}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, isEnabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Entry & Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Entry & Rewards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Minimum Entry (₹)</Label>
                <Input
                  type="number"
                  value={settings.minEntryAmount}
                  onChange={(e) => setSettings(s => ({ ...s, minEntryAmount: Number(e.target.value) }))}
                  min={10}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Reward Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.rewardMultiplier}
                  onChange={(e) => setSettings(s => ({ ...s, rewardMultiplier: Number(e.target.value) }))}
                  min={1}
                  max={3}
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Example: {settings.rewardMultiplier}x = ₹{settings.minEntryAmount} → ₹{(settings.minEntryAmount * settings.rewardMultiplier).toFixed(0)} reward
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bot Difficulty */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Bot Difficulty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-foreground">Difficulty Level</Label>
                <div className="grid gap-2">
                  {[
                    { value: 'easy', label: 'Easy', desc: 'Bots make mistakes, favor low dice', color: 'bg-green-500' },
                    { value: 'normal', label: 'Normal', desc: 'Balanced gameplay, fair dice', color: 'bg-amber-500' },
                    { value: 'competitive', label: 'Impossible', desc: 'Smart bots, higher dice probability', color: 'bg-red-500' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSettings(s => ({ ...s, difficulty: opt.value }))}
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
              <div className="space-y-2">
                <Label className="text-foreground">Dice Randomness ({(settings.diceRandomnessWeight * 100).toFixed(0)}%)</Label>
                <Input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={settings.diceRandomnessWeight}
                  onChange={(e) => setSettings(s => ({ ...s, diceRandomnessWeight: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fair Play Control */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Fair Play Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">New User Boost</Label>
                  <p className="text-xs text-muted-foreground">Smoother matches for new users</p>
                </div>
                <Switch
                  checked={settings.newUserBoost}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, newUserBoost: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Smart Bot (₹100+ Bets)</Label>
                  <p className="text-xs text-muted-foreground">Bot plays strategically to win subtly in high-stake games</p>
                </div>
                <Switch
                  checked={settings.highAmountCompetitive}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, highAmountCompetitive: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLudoSettings;