import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  Shield, 
  ShieldOff, 
  Smartphone, 
  Monitor, 
  AlertTriangle,
  Users,
  Flag,
  Ban,
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Device {
  id: string;
  device_id: string;
  platform: string;
  device_model: string | null;
  os_version: string | null;
  app_version: string | null;
  first_seen_at: string;
  last_seen_at: string;
  account_count: number;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  is_emulator: boolean;
  is_rooted: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
}

interface UserDevice {
  id: string;
  user_id: string;
  device_id: string;
  linked_at: string;
  last_login_at: string;
  is_primary: boolean;
}

const AdminDevices = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [cascadeToUsers, setCascadeToUsers] = useState(true);
  const [linkedUsers, setLinkedUsers] = useState<any[]>([]);
  
  const queryClient = useQueryClient();

  // Fetch devices
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['admin-devices', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('devices')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(100);
      
      if (searchQuery) {
        query = query.or(`device_id.ilike.%${searchQuery}%,device_model.ilike.%${searchQuery}%,platform.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Device[];
    },
  });

  // Fetch linked users for a device
  const fetchLinkedUsers = async (deviceId: string) => {
    const { data: userDevices } = await supabase
      .from('user_devices')
      .select('user_id, linked_at, last_login_at, is_primary')
      .eq('device_id', deviceId);

    if (userDevices && userDevices.length > 0) {
      const userIds = userDevices.map(ud => ud.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email, phone, is_banned')
        .in('id', userIds);

      const merged = userDevices.map(ud => ({
        ...ud,
        profile: profiles?.find(p => p.id === ud.user_id)
      }));

      setLinkedUsers(merged);
    } else {
      setLinkedUsers([]);
    }
  };

  // Ban device mutation
  const banDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, reason, cascade }: { deviceId: string; reason: string; cascade: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('ban_device', {
        p_device_id: deviceId,
        p_reason: reason,
        p_admin_id: user?.id,
        p_cascade_to_users: cascade
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-devices'] });
      setShowBanDialog(false);
      setSelectedDevice(null);
      setBanReason('');
      const result = data?.[0];
      toast({ 
        title: 'Device Banned', 
        description: `Device banned successfully. ${result?.affected_users || 0} users affected.` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Unban device mutation
  const unbanDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { data, error } = await supabase.rpc('unban_device', {
        p_device_id: deviceId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devices'] });
      toast({ title: 'Device Unbanned', description: 'Device has been unbanned.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'android':
      case 'ios':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'android':
        return 'bg-green-500/20 text-green-500';
      case 'ios':
        return 'bg-blue-500/20 text-blue-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  // Stats
  const stats = {
    total: devices.length,
    banned: devices.filter(d => d.is_banned).length,
    flagged: devices.filter(d => d.is_flagged).length,
    emulators: devices.filter(d => d.is_emulator).length,
    multiAccount: devices.filter(d => d.account_count > 1).length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Device Management</h1>
          <p className="text-muted-foreground">Track and manage devices with account limits</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Total Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              Banned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-destructive">{stats.banned}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Flag className="h-4 w-4 text-warning" />
              Flagged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-warning">{stats.flagged}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Emulators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-500">{stats.emulators}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Multi-Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-primary">{stats.multiAccount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by device ID, model, or platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Platform</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : devices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No devices found
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.id} className="border-border/50">
                      <TableCell>
                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded ${getPlatformColor(device.platform)}`}>
                          {getPlatformIcon(device.platform)}
                          <span className="text-xs font-medium capitalize">{device.platform}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{device.device_model || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {device.device_id.substring(0, 16)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.account_count > 1 ? 'destructive' : 'secondary'}>
                          {device.account_count} account{device.account_count !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {device.is_banned && (
                            <Badge variant="destructive">Banned</Badge>
                          )}
                          {device.is_flagged && (
                            <Badge variant="outline" className="text-warning border-warning">Flagged</Badge>
                          )}
                          {device.is_emulator && (
                            <Badge variant="outline" className="text-orange-500 border-orange-500">Emulator</Badge>
                          )}
                          {device.is_rooted && (
                            <Badge variant="outline" className="text-red-400 border-red-400">Rooted</Badge>
                          )}
                          {!device.is_banned && !device.is_flagged && !device.is_emulator && !device.is_rooted && (
                            <Badge variant="secondary">Clean</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDevice(device);
                              fetchLinkedUsers(device.device_id);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {device.is_banned ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unbanDeviceMutation.mutate(device.device_id)}
                              disabled={unbanDeviceMutation.isPending}
                              className="text-green-500 hover:text-green-500"
                            >
                              <ShieldOff className="h-4 w-4 mr-1" />
                              Unban
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDevice(device);
                                setShowBanDialog(true);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Ban
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Ban Device</DialogTitle>
            <DialogDescription>
              This will block the device from accessing ProBattle
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Device:</span>{' '}
                  {selectedDevice.device_model || 'Unknown'}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Platform:</span>{' '}
                  <span className="capitalize">{selectedDevice.platform}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Accounts:</span>{' '}
                  {selectedDevice.account_count}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ban-reason">Ban Reason *</Label>
                <Textarea
                  id="ban-reason"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="e.g., Multi-account abuse, Referral fraud, Cheating"
                  className="bg-background/50"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cascade"
                  checked={cascadeToUsers}
                  onChange={(e) => setCascadeToUsers(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="cascade" className="text-sm">
                  Also ban all linked user accounts
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedDevice && banDeviceMutation.mutate({
                deviceId: selectedDevice.device_id,
                reason: banReason,
                cascade: cascadeToUsers
              })}
              disabled={!banReason.trim() || banDeviceMutation.isPending}
            >
              {banDeviceMutation.isPending ? 'Banning...' : 'Ban Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Device Details</DialogTitle>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-6 py-4">
              {/* Device Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Device ID</p>
                  <p className="font-mono text-xs break-all">{selectedDevice.device_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Platform</p>
                  <p className="capitalize">{selectedDevice.platform}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p>{selectedDevice.device_model || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">OS Version</p>
                  <p>{selectedDevice.os_version || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">First Seen</p>
                  <p>{format(new Date(selectedDevice.first_seen_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Seen</p>
                  <p>{format(new Date(selectedDevice.last_seen_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-2">
                {selectedDevice.is_banned && (
                  <Badge variant="destructive">Banned: {selectedDevice.ban_reason}</Badge>
                )}
                {selectedDevice.is_flagged && (
                  <Badge variant="outline" className="text-warning border-warning">
                    Flagged: {selectedDevice.flag_reason}
                  </Badge>
                )}
                {selectedDevice.is_emulator && (
                  <Badge variant="outline" className="text-orange-500">Emulator Detected</Badge>
                )}
                {selectedDevice.is_rooted && (
                  <Badge variant="outline" className="text-red-400">Rooted/Jailbroken</Badge>
                )}
              </div>

              {/* Linked Users */}
              <div>
                <h4 className="font-semibold mb-3">Linked Accounts ({linkedUsers.length})</h4>
                {linkedUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No linked accounts</p>
                ) : (
                  <div className="space-y-2">
                    {linkedUsers.map((lu) => (
                      <div key={lu.user_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{lu.profile?.username || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{lu.profile?.phone || lu.profile?.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {lu.is_primary && <Badge variant="secondary">Primary</Badge>}
                          {lu.profile?.is_banned && <Badge variant="destructive">Banned</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDevices;
