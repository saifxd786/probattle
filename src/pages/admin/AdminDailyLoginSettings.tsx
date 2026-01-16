import { useState, useEffect } from 'react';
import { Save, Loader2, Calendar, Coins, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DailyLoginSettings {
  id: string;
  is_enabled: boolean;
  daily_coins: number;
  streak_bonus_coins: number;
  coins_to_rupees_ratio: number;
  min_coins_to_convert: number;
}

const AdminDailyLoginSettings = () => {
  const [settings, setSettings] = useState<DailyLoginSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_login_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load daily login settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('daily_login_settings')
        .update({
          is_enabled: settings.is_enabled,
          daily_coins: settings.daily_coins,
          streak_bonus_coins: settings.streak_bonus_coins,
          coins_to_rupees_ratio: settings.coins_to_rupees_ratio,
          min_coins_to_convert: settings.min_coins_to_convert,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Daily login settings saved' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No settings found
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Daily Login Settings</h1>
          <p className="text-muted-foreground">Configure daily rewards system</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Enable/Disable */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Availability</CardTitle>
            <CardDescription>Control daily login rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Daily Login</Label>
                <p className="text-xs text-muted-foreground">
                  Allow users to claim daily coins
                </p>
              </div>
              <Switch
                checked={settings.is_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, is_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Coin Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              Coin Rewards
            </CardTitle>
            <CardDescription>Set daily coin amounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Daily Coins</Label>
              <Input
                type="number"
                value={settings.daily_coins}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    daily_coins: parseInt(e.target.value) || 10,
                  })
                }
                min={1}
                max={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Coins earned per daily login (1-1000)
              </p>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                7-Day Streak Bonus Coins
              </Label>
              <Input
                type="number"
                value={settings.streak_bonus_coins}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    streak_bonus_coins: parseInt(e.target.value) || 50,
                  })
                }
                min={0}
                max={10000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Extra coins for 7-day consecutive login (0-10000)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Coin Conversion</CardTitle>
            <CardDescription>Configure how coins convert to wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Coins to Rupees Ratio</Label>
              <Input
                type="number"
                value={settings.coins_to_rupees_ratio}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    coins_to_rupees_ratio: parseInt(e.target.value) || 10,
                  })
                }
                min={1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many coins = ₹1 (e.g., 10 means 10 coins = ₹1)
              </p>
            </div>
            <div>
              <Label>Minimum Coins to Convert</Label>
              <Input
                type="number"
                value={settings.min_coins_to_convert}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_coins_to_convert: parseInt(e.target.value) || 100,
                  })
                }
                min={10}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum coins required for conversion
              </p>
            </div>
            
            {/* Preview */}
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
              <p className="text-sm text-muted-foreground mb-2">Conversion Preview:</p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-primary font-medium">{settings.min_coins_to_convert} coins</span>
                  {' = '}
                  <span className="text-green-500 font-medium">
                    ₹{Math.floor(settings.min_coins_to_convert / settings.coins_to_rupees_ratio)}
                  </span>
                </p>
                <p>
                  <span className="text-primary font-medium">100 coins</span>
                  {' = '}
                  <span className="text-green-500 font-medium">
                    ₹{Math.floor(100 / settings.coins_to_rupees_ratio)}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button variant="neon" size="lg" onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default AdminDailyLoginSettings;
