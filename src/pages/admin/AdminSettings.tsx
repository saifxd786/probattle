import { useState, useEffect } from 'react';
import { Save, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';

const AdminSettings = () => {
  const { 
    isMaintenanceMode, 
    maintenanceMessage, 
    updateMaintenanceMode, 
    isUpdating: isMaintenanceUpdating,
    isLoading: isMaintenanceLoading 
  } = useMaintenanceMode();

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  const [settings, setSettings] = useState({
    upiId: 'mohdqureshi807@naviaxis',
    bgmiEnabled: true,
    freefireEnabled: false,
    clashEnabled: false,
    ludoEnabled: false,
    telegramLink: 'https://t.me/ProBattleTournament',
  });

  const [isSaving, setIsSaving] = useState(false);

  // Sync maintenance mode from database
  useEffect(() => {
    setMaintenanceEnabled(isMaintenanceMode);
    setMaintenanceMsg(maintenanceMessage);
  }, [isMaintenanceMode, maintenanceMessage]);

  // Load other settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('probattle_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  const handleMaintenanceToggle = (checked: boolean) => {
    setMaintenanceEnabled(checked);
    updateMaintenanceMode(
      { enabled: checked, message: maintenanceMsg },
      {
        onSuccess: () => {
          toast({ 
            title: checked ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
            description: checked ? 'Users will see the maintenance page' : 'Users can access the platform'
          });
        },
        onError: () => {
          setMaintenanceEnabled(!checked);
          toast({ title: 'Error', description: 'Failed to update maintenance mode', variant: 'destructive' });
        }
      }
    );
  };

  const handleMaintenanceMessageSave = () => {
    updateMaintenanceMode(
      { enabled: maintenanceEnabled, message: maintenanceMsg },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'Maintenance message updated' });
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to update message', variant: 'destructive' });
        }
      }
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem('probattle_settings', JSON.stringify(settings));
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

        {/* Platform Settings - Maintenance Mode */}
        <Card className="glass-card border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>Control platform availability for users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, users will see the maintenance page
                </p>
              </div>
              {isMaintenanceLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={maintenanceEnabled}
                  onCheckedChange={handleMaintenanceToggle}
                  disabled={isMaintenanceUpdating}
                />
              )}
            </div>

            {maintenanceEnabled && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-500 font-medium">
                  🚨 LIVE: Platform is in maintenance mode. Users cannot access the app.
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Maintenance Message</Label>
              <Textarea
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                placeholder="Enter the message to show users during maintenance..."
                rows={3}
              />
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMaintenanceMessageSave}
                  disabled={isMaintenanceUpdating}
                >
                  {isMaintenanceUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Save Message
                </Button>
              </div>
            </div>
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
