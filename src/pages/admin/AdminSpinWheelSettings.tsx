import { useState, useEffect } from 'react';
import { Save, Loader2, RotateCcw, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SpinWheelSettings {
  id: string;
  is_enabled: boolean;
  cooldown_hours: number;
  required_deposit: number;
  segment_values: number[];
}

const AdminSpinWheelSettings = () => {
  const [settings, setSettings] = useState<SpinWheelSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [segmentInput, setSegmentInput] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('spin_wheel_settings')
        .select('*')
        .single();

      if (error) throw error;

      setSettings(data);
      setSegmentInput(data.segment_values?.join(', ') || '10, 20, 100, 300, 500, 1000, 5000');
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load spin wheel settings',
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
      // Parse segment values
      const segmentValues = segmentInput
        .split(',')
        .map(v => parseInt(v.trim()))
        .filter(v => !isNaN(v) && v > 0);

      if (segmentValues.length < 3 || segmentValues.length > 10) {
        toast({
          title: 'Invalid Segments',
          description: 'Please enter between 3 and 10 segment values',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('spin_wheel_settings')
        .update({
          is_enabled: settings.is_enabled,
          cooldown_hours: settings.cooldown_hours,
          required_deposit: settings.required_deposit,
          segment_values: segmentValues,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Spin wheel settings saved' });
      fetchSettings();
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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
          <RotateCcw className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Spin Wheel Settings</h1>
          <p className="text-muted-foreground">Configure the lucky spin wheel</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Enable/Disable */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Availability</CardTitle>
            <CardDescription>Control spin wheel access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Spin Wheel</Label>
                <p className="text-xs text-muted-foreground">
                  Allow users to spin the wheel
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

        {/* Cooldown & Requirements */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Requirements</CardTitle>
            <CardDescription>Set spin requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Cooldown (Hours)</Label>
              <Input
                type="number"
                value={settings.cooldown_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    cooldown_hours: parseInt(e.target.value) || 24,
                  })
                }
                min={1}
                max={168}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Hours between spins (1-168)
              </p>
            </div>
            <div>
              <Label>Required Deposit (₹)</Label>
              <Input
                type="number"
                value={settings.required_deposit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    required_deposit: parseInt(e.target.value) || 1000,
                  })
                }
                min={0}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum total deposits to unlock the wheel
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Segment Values */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Wheel Segments
            </CardTitle>
            <CardDescription>Configure reward values</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Segment Values (₹)</Label>
              <Input
                value={segmentInput}
                onChange={(e) => setSegmentInput(e.target.value)}
                placeholder="10, 20, 100, 300, 500, 1000, 5000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated values (3-10 segments)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {segmentInput.split(',').map((val, idx) => {
                const num = parseInt(val.trim());
                if (isNaN(num)) return null;
                return (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium"
                  >
                    ₹{num}
                  </span>
                );
              })}
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

export default AdminSpinWheelSettings;
