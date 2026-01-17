import { useState, useEffect, useMemo } from 'react';
import { Save, Loader2, RotateCcw, Gift, Palette, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SpinWheelPreview from '@/components/admin/SpinWheelPreview';

interface SpinWheelSettings {
  id: string;
  is_enabled: boolean;
  cooldown_hours: number;
  required_deposit: number;
  segment_values: number[];
  segment_colors: string[];
  pointer_color: string;
  center_color: string;
  border_color: string;
}

const DEFAULT_COLORS = [
  'hsl(200, 100%, 50%)',
  'hsl(170, 100%, 45%)',
  'hsl(270, 100%, 55%)',
  'hsl(45, 100%, 50%)',
  'hsl(0, 100%, 55%)',
  'hsl(320, 100%, 50%)',
  'hsl(50, 100%, 50%)',
];

const AdminSpinWheelSettings = () => {
  const [settings, setSettings] = useState<SpinWheelSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [segmentInput, setSegmentInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');

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
      setColorsInput(data.segment_colors?.join(', ') || DEFAULT_COLORS.join(', '));
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

      // Parse colors
      const segmentColors = colorsInput
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      // Ensure we have enough colors for segments
      while (segmentColors.length < segmentValues.length) {
        segmentColors.push(DEFAULT_COLORS[segmentColors.length % DEFAULT_COLORS.length]);
      }

      const { error } = await supabase
        .from('spin_wheel_settings')
        .update({
          is_enabled: settings.is_enabled,
          cooldown_hours: settings.cooldown_hours,
          required_deposit: settings.required_deposit,
          segment_values: segmentValues,
          segment_colors: segmentColors.slice(0, segmentValues.length),
          pointer_color: settings.pointer_color,
          center_color: settings.center_color,
          border_color: settings.border_color,
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

  // Parse current values for preview
  const previewValues = useMemo(() => {
    const values = segmentInput
      .split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v) && v > 0);
    return values.length >= 3 ? values : [10, 20, 100, 300, 500, 1000, 5000];
  }, [segmentInput]);

  const previewColors = useMemo(() => {
    const colors = colorsInput
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    return colors.length > 0 ? colors : DEFAULT_COLORS;
  }, [colorsInput]);

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

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
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
                const colors = colorsInput.split(',').map(c => c.trim());
                if (isNaN(num)) return null;
                return (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: colors[idx] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length] }}
                  >
                    ₹{num}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Color Customization */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Wheel Colors
            </CardTitle>
            <CardDescription>Customize wheel appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Segment Colors (HSL format)</Label>
              <Input
                value={colorsInput}
                onChange={(e) => setColorsInput(e.target.value)}
                placeholder="hsl(200, 100%, 50%), hsl(170, 100%, 45%)..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated HSL colors (will cycle if fewer than segments)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pointer Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={settings.pointer_color}
                    onChange={(e) => setSettings({ ...settings, pointer_color: e.target.value })}
                    placeholder="hsl(45, 100%, 50%)"
                  />
                  <div 
                    className="w-10 h-10 rounded border border-border shrink-0"
                    style={{ backgroundColor: settings.pointer_color }}
                  />
                </div>
              </div>
              <div>
                <Label>Center Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={settings.center_color}
                    onChange={(e) => setSettings({ ...settings, center_color: e.target.value })}
                    placeholder="hsl(220, 30%, 10%)"
                  />
                  <div 
                    className="w-10 h-10 rounded border border-border shrink-0"
                    style={{ backgroundColor: settings.center_color }}
                  />
                </div>
              </div>
              <div className="col-span-2">
                <Label>Border Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={settings.border_color}
                    onChange={(e) => setSettings({ ...settings, border_color: e.target.value })}
                    placeholder="hsl(200, 100%, 50%)"
                  />
                  <div 
                    className="w-10 h-10 rounded border border-border shrink-0"
                    style={{ backgroundColor: settings.border_color }}
                  />
                </div>
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

        {/* Live Preview */}
        <div className="lg:sticky lg:top-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Live Preview
              </CardTitle>
              <CardDescription>See how your wheel will look</CardDescription>
            </CardHeader>
            <CardContent>
              <SpinWheelPreview
                segmentValues={previewValues}
                segmentColors={previewColors}
                pointerColor={settings.pointer_color}
                centerColor={settings.center_color}
                borderColor={settings.border_color}
              />
              <p className="text-xs text-muted-foreground text-center mt-4">
                Wheel rotates slowly in preview
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSpinWheelSettings;
