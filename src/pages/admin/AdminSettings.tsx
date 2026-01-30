import { useState, useEffect, useRef } from 'react';
import { Save, AlertTriangle, Loader2, Upload, QrCode, Trash2, ImageIcon, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { usePaymentQR } from '@/hooks/usePaymentQR';
import { usePaymentUPI, validateUPIId } from '@/hooks/usePaymentUPI';
import { useGameAvailability } from '@/hooks/useGameAvailability';

const AdminSettings = () => {
  const { 
    isMaintenanceMode, 
    maintenanceMessage, 
    updateMaintenanceMode, 
    isUpdating: isMaintenanceUpdating,
    isLoading: isMaintenanceLoading 
  } = useMaintenanceMode();

  const {
    qrUrl,
    qrEnabled,
    updateQRSettings,
    isUpdating: isQRUpdating,
    isLoading: isQRLoading,
    uploadQR,
  } = usePaymentQR();

  const {
    upiId: savedUpiId,
    updateUPI,
    isUpdating: isUPIUpdating,
    isLoading: isUPILoading,
  } = usePaymentUPI();

  const {
    availability: gameAvailability,
    isLoading: isGameAvailabilityLoading,
    isUpdating: isGameAvailabilityUpdating,
    updateGameAvailability
  } = useGameAvailability();

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [qrEnabledLocal, setQrEnabledLocal] = useState(false);
  const [qrUrlLocal, setQrUrlLocal] = useState<string | null>(null);
  const [isUploadingQR, setIsUploadingQR] = useState(false);
  const [upiIdLocal, setUpiIdLocal] = useState('');
  const qrInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    telegramLink: 'https://t.me/ProBattleTournament',
  });

  const [isSaving, setIsSaving] = useState(false);

  // Sync maintenance mode from database
  useEffect(() => {
    setMaintenanceEnabled(isMaintenanceMode);
    setMaintenanceMsg(maintenanceMessage);
  }, [isMaintenanceMode, maintenanceMessage]);

  // Sync QR settings from database
  useEffect(() => {
    setQrEnabledLocal(qrEnabled);
    setQrUrlLocal(qrUrl);
  }, [qrEnabled, qrUrl]);

  // Sync UPI ID from database
  useEffect(() => {
    setUpiIdLocal(savedUpiId);
  }, [savedUpiId]);

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

  const handleUPISave = () => {
    const validation = validateUPIId(upiIdLocal);
    if (!validation.valid) {
      toast({ title: 'Invalid UPI ID', description: validation.error, variant: 'destructive' });
      return;
    }
    updateUPI(upiIdLocal, {
      onSuccess: () => {
        toast({ title: 'Success', description: 'UPI ID updated successfully' });
      },
      onError: (error: Error) => {
        toast({ title: 'Error', description: error.message || 'Failed to update UPI ID', variant: 'destructive' });
      }
    });
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be less than 5MB', variant: 'destructive' });
      return;
    }

    setIsUploadingQR(true);
    try {
      const url = await uploadQR(file);
      setQrUrlLocal(url);
      updateQRSettings(
        { url, enabled: qrEnabledLocal },
        {
          onSuccess: () => {
            toast({ title: 'Success', description: 'Payment QR uploaded successfully' });
          },
        }
      );
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload QR code', variant: 'destructive' });
    } finally {
      setIsUploadingQR(false);
    }
  };

  const handleQRToggle = (checked: boolean) => {
    setQrEnabledLocal(checked);
    updateQRSettings(
      { url: qrUrlLocal, enabled: checked },
      {
        onSuccess: () => {
          toast({ 
            title: checked ? 'QR Code Enabled' : 'QR Code Disabled',
            description: checked ? 'Users will see the QR code in deposit' : 'QR code hidden from deposit'
          });
        },
        onError: () => {
          setQrEnabledLocal(!checked);
          toast({ title: 'Error', description: 'Failed to update QR settings', variant: 'destructive' });
        }
      }
    );
  };

  const handleRemoveQR = () => {
    setQrUrlLocal(null);
    updateQRSettings(
      { url: null, enabled: false },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'QR code removed' });
        },
      }
    );
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
            <div className="space-y-2">
              <Label>UPI ID</Label>
              <div className="flex gap-2">
                {isUPILoading ? (
                  <div className="flex-1 h-10 bg-muted rounded animate-pulse" />
                ) : (
                  <Input
                    value={upiIdLocal}
                    onChange={(e) => setUpiIdLocal(e.target.value)}
                    placeholder="your@upi"
                    className="flex-1"
                  />
                )}
                <Button 
                  variant="outline" 
                  onClick={handleUPISave}
                  disabled={isUPIUpdating || isUPILoading}
                >
                  {isUPIUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This UPI ID will be shown to users for manual payments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment QR Code */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Payment QR Code
            </CardTitle>
            <CardDescription>Upload a QR code for easy payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable QR Code</Label>
                <p className="text-xs text-muted-foreground">
                  Show QR code in the deposit section
                </p>
              </div>
              {isQRLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={qrEnabledLocal}
                  onCheckedChange={handleQRToggle}
                  disabled={isQRUpdating || !qrUrlLocal}
                />
              )}
            </div>

            <input
              ref={qrInputRef}
              type="file"
              accept="image/*"
              onChange={handleQRUpload}
              className="hidden"
            />

            {qrUrlLocal ? (
              <div className="space-y-3">
                <div className="relative group">
                  <img 
                    src={qrUrlLocal} 
                    alt="Payment QR Code" 
                    className="w-48 h-48 mx-auto rounded-xl border border-border object-contain bg-white p-2"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-xl">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveQR}
                      disabled={isQRUpdating}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => qrInputRef.current?.click()}
                  disabled={isUploadingQR}
                >
                  {isUploadingQR ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Replace QR Code
                </Button>
              </div>
            ) : (
              <div 
                onClick={() => qrInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {isUploadingQR ? (
                  <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-2" />
                ) : (
                  <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                )}
                <p className="text-sm font-medium">
                  {isUploadingQR ? 'Uploading...' : 'Click to upload QR code'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 5MB
                </p>
              </div>
            )}

            {qrEnabledLocal && qrUrlLocal && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <QrCode className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">
                  QR code is live and visible to users in deposit section
                </span>
              </div>
            )}
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
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              Game Availability
            </CardTitle>
            <CardDescription>
              Enable or disable games on the platform. 
              <span className="text-yellow-500 ml-1">Changes are live instantly!</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* BGMI */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                {gameAvailability.bgmi ? (
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <WifiOff className="w-4 h-4 text-red-500" />
                  </div>
                )}
                <div>
                  <Label className="text-base font-medium">BGMI</Label>
                  <p className="text-xs text-muted-foreground">Battlegrounds Mobile India</p>
                </div>
              </div>
              {isGameAvailabilityLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={gameAvailability.bgmi}
                  onCheckedChange={(checked) =>
                    updateGameAvailability('bgmi', checked, {
                      onSuccess: () => toast({ 
                        title: checked ? '✅ BGMI Online' : '🔴 BGMI Offline',
                        description: `BGMI is now ${checked ? 'available' : 'unavailable'} for users`
                      }),
                      onError: () => toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
                    })
                  }
                  disabled={isGameAvailabilityUpdating}
                />
              )}
            </div>

            {/* Ludo */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                {gameAvailability.ludo ? (
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <WifiOff className="w-4 h-4 text-red-500" />
                  </div>
                )}
                <div>
                  <Label className="text-base font-medium">Ludo</Label>
                  <p className="text-xs text-muted-foreground">Ludo King Multiplayer</p>
                </div>
              </div>
              {isGameAvailabilityLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={gameAvailability.ludo}
                  onCheckedChange={(checked) =>
                    updateGameAvailability('ludo', checked, {
                      onSuccess: () => toast({ 
                        title: checked ? '✅ Ludo Online' : '🔴 Ludo Offline',
                        description: `Ludo is now ${checked ? 'available' : 'unavailable'} for users`
                      }),
                      onError: () => toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
                    })
                  }
                  disabled={isGameAvailabilityUpdating}
                />
              )}
            </div>

            {/* Thimble */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                {gameAvailability.thimble ? (
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <WifiOff className="w-4 h-4 text-red-500" />
                  </div>
                )}
                <div>
                  <Label className="text-base font-medium">Thimble</Label>
                  <p className="text-xs text-muted-foreground">Cup & Ball Game</p>
                </div>
              </div>
              {isGameAvailabilityLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={gameAvailability.thimble}
                  onCheckedChange={(checked) =>
                    updateGameAvailability('thimble', checked, {
                      onSuccess: () => toast({ 
                        title: checked ? '✅ Thimble Online' : '🔴 Thimble Offline',
                        description: `Thimble is now ${checked ? 'available' : 'unavailable'} for users`
                      }),
                      onError: () => toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
                    })
                  }
                  disabled={isGameAvailabilityUpdating}
                />
              )}
            </div>

            {/* Mines */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                {gameAvailability.mines ? (
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <WifiOff className="w-4 h-4 text-red-500" />
                  </div>
                )}
                <div>
                  <Label className="text-base font-medium">Mines</Label>
                  <p className="text-xs text-muted-foreground">Minesweeper Game</p>
                </div>
              </div>
              {isGameAvailabilityLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={gameAvailability.mines}
                  onCheckedChange={(checked) =>
                    updateGameAvailability('mines', checked, {
                      onSuccess: () => toast({ 
                        title: checked ? '✅ Mines Online' : '🔴 Mines Offline',
                        description: `Mines is now ${checked ? 'available' : 'unavailable'} for users`
                      }),
                      onError: () => toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
                    })
                  }
                  disabled={isGameAvailabilityUpdating}
                />
              )}
            </div>

            {/* Free Fire */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                  <WifiOff className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <Label className="text-base font-medium">Free Fire</Label>
                  <p className="text-xs text-muted-foreground">Coming Soon</p>
                </div>
              </div>
              <Switch
                checked={false}
                disabled
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
