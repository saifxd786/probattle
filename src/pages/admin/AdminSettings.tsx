import { useState, useEffect } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    upiId: 'mohdqureshi807@naviaxis',
    maintenanceMode: false,
    bgmiEnabled: true,
    freefireEnabled: false,
    clashEnabled: false,
    ludoEnabled: false,
    telegramLink: 'https://t.me/ProScimstournament',
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('proscims_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save to localStorage (in production, this would be a database)
    localStorage.setItem('proscims_settings', JSON.stringify(settings));
    
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    toast({ title: 'Success', description: 'Settings saved successfully' });
    setIsSaving(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure platform-wide settings</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Payment Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Payment Settings</CardTitle>
            <CardDescription>Configure payment options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>UPI ID</Label>
              <Input
                value={settings.upiId}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                placeholder="your@upi"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This UPI ID will be shown to users for manual payments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Platform Settings</CardTitle>
            <CardDescription>Control platform availability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Disable the platform for maintenance
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, maintenanceMode: checked })
                }
              />
            </div>
            {settings.maintenanceMode && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-500">
                  Platform is in maintenance mode. Users cannot access matches.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Game Availability</CardTitle>
            <CardDescription>Enable or disable games on the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>BGMI</Label>
                <p className="text-xs text-muted-foreground">Battlegrounds Mobile India</p>
              </div>
              <Switch
                checked={settings.bgmiEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, bgmiEnabled: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Free Fire</Label>
                <p className="text-xs text-muted-foreground">Garena Free Fire</p>
              </div>
              <Switch
                checked={settings.freefireEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, freefireEnabled: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Clash Royale</Label>
                <p className="text-xs text-muted-foreground">Supercell Clash Royale</p>
              </div>
              <Switch
                checked={settings.clashEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, clashEnabled: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Ludo</Label>
                <p className="text-xs text-muted-foreground">Ludo King</p>
              </div>
              <Switch
                checked={settings.ludoEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, ludoEnabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Social Links</CardTitle>
            <CardDescription>Configure support and social links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Telegram Support Link</Label>
              <Input
                value={settings.telegramLink}
                onChange={(e) => setSettings({ ...settings, telegramLink: e.target.value })}
                placeholder="https://t.me/..."
              />
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

export default AdminSettings;
