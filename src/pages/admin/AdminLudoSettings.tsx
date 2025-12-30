import { useState, useEffect } from 'react';
import { Dices, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Dices className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Ludo Settings</h1>
            <p className="text-sm text-muted-foreground">Manage Ludo game configuration</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Module Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Module Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Ludo</p>
                <p className="text-sm text-muted-foreground">Allow users to play Ludo</p>
              </div>
              <Switch
                checked={settings.isEnabled}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, isEnabled: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Entry & Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entry & Rewards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Minimum Entry (₹)</label>
              <Input
                type="number"
                value={settings.minEntryAmount}
                onChange={(e) => setSettings(s => ({ ...s, minEntryAmount: Number(e.target.value) }))}
                min={10}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reward Multiplier</label>
              <Input
                type="number"
                step="0.1"
                value={settings.rewardMultiplier}
                onChange={(e) => setSettings(s => ({ ...s, rewardMultiplier: Number(e.target.value) }))}
                min={1}
                max={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Example: {settings.rewardMultiplier}x = ₹{settings.minEntryAmount} → ₹{(settings.minEntryAmount * settings.rewardMultiplier).toFixed(0)} reward
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Match Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Match Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Difficulty Level</label>
              <Select
                value={settings.difficulty}
                onValueChange={(value) => setSettings(s => ({ ...s, difficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy - Beginner Friendly</SelectItem>
                  <SelectItem value="normal">Normal - Balanced</SelectItem>
                  <SelectItem value="competitive">Competitive - Challenging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Dice Randomness ({(settings.diceRandomnessWeight * 100).toFixed(0)}%)</label>
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

        {/* Fair Play Control */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fair Play Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New User Boost</p>
                <p className="text-sm text-muted-foreground">Smoother matches for new users</p>
              </div>
              <Switch
                checked={settings.newUserBoost}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, newUserBoost: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">High Amount Competitive</p>
                <p className="text-sm text-muted-foreground">Tougher matches for high stakes</p>
              </div>
              <Switch
                checked={settings.highAmountCompetitive}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, highAmountCompetitive: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLudoSettings;