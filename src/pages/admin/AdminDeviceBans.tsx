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
import { Search, Shield, ShieldOff, Plus, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';

interface DeviceBan {
  id: string;
  device_fingerprint: string;
  reason: string | null;
  banned_at: string;
  banned_by: string | null;
  expires_at: string | null;
  created_at: string;
}

const AdminDeviceBans = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBanFingerprint, setNewBanFingerprint] = useState('');
  const [newBanReason, setNewBanReason] = useState('');
  const [newBanExpiry, setNewBanExpiry] = useState('');
  const [selectedBan, setSelectedBan] = useState<DeviceBan | null>(null);
  const [showUnbanDialog, setShowUnbanDialog] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: bans = [], isLoading } = useQuery({
    queryKey: ['device-bans', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('device_bans')
        .select('*')
        .order('banned_at', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`device_fingerprint.ilike.%${searchQuery}%,reason.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DeviceBan[];
    },
  });

  const addBanMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData: any = {
        device_fingerprint: newBanFingerprint.trim(),
        reason: newBanReason.trim() || null,
        banned_by: user?.id || null,
      };
      
      if (newBanExpiry) {
        insertData.expires_at = new Date(newBanExpiry).toISOString();
      }
      
      const { error } = await supabase.from('device_bans').insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-bans'] });
      setShowAddDialog(false);
      setNewBanFingerprint('');
      setNewBanReason('');
      setNewBanExpiry('');
      toast({ title: 'Device Banned', description: 'Device fingerprint has been banned successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('device_bans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-bans'] });
      setShowUnbanDialog(false);
      setSelectedBan(null);
      toast({ title: 'Device Unbanned', description: 'Device ban has been removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getBanStatus = (ban: DeviceBan) => {
    if (!ban.expires_at) {
      return { label: 'Permanent', variant: 'destructive' as const };
    }
    if (isPast(new Date(ban.expires_at))) {
      return { label: 'Expired', variant: 'secondary' as const };
    }
    return { label: 'Active', variant: 'default' as const };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Device Bans</h1>
          <p className="text-muted-foreground">Manage banned device fingerprints</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Ban
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Total Bans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{bans.length}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Permanent Bans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {bans.filter(b => !b.expires_at).length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Temporary Bans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {bans.filter(b => b.expires_at && !isPast(new Date(b.expires_at))).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by fingerprint or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bans Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Fingerprint</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Banned At</TableHead>
                  <TableHead>Expires</TableHead>
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
                ) : bans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No device bans found
                    </TableCell>
                  </TableRow>
                ) : (
                  bans.map((ban) => {
                    const status = getBanStatus(ban);
                    return (
                      <TableRow key={ban.id} className="border-border/50">
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {ban.device_fingerprint}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="text-sm text-muted-foreground">
                            {ban.reason || 'No reason specified'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(ban.banned_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ban.expires_at ? (
                            <span className={isPast(new Date(ban.expires_at)) ? 'text-muted-foreground' : 'text-warning'}>
                              {formatDistanceToNow(new Date(ban.expires_at), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-destructive">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBan(ban);
                              setShowUnbanDialog(true);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <ShieldOff className="h-4 w-4 mr-1" />
                            Unban
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Ban Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Ban Device</DialogTitle>
            <DialogDescription>
              Add a device fingerprint to the ban list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fingerprint">Device Fingerprint *</Label>
              <Input
                id="fingerprint"
                value={newBanFingerprint}
                onChange={(e) => setNewBanFingerprint(e.target.value)}
                placeholder="Enter device fingerprint"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Ban Reason</Label>
              <Textarea
                id="reason"
                value={newBanReason}
                onChange={(e) => setNewBanReason(e.target.value)}
                placeholder="Reason for banning this device (optional)"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date (Optional)</Label>
              <Input
                id="expiry"
                type="datetime-local"
                value={newBanExpiry}
                onChange={(e) => setNewBanExpiry(e.target.value)}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent ban
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => addBanMutation.mutate()}
              disabled={!newBanFingerprint.trim() || addBanMutation.isPending}
            >
              {addBanMutation.isPending ? 'Adding...' : 'Add Ban'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban Confirmation Dialog */}
      <Dialog open={showUnbanDialog} onOpenChange={setShowUnbanDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Confirm Unban</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this device ban?
            </DialogDescription>
          </DialogHeader>
          {selectedBan && (
            <div className="py-4 space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Fingerprint:</span>{' '}
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {selectedBan.device_fingerprint}
                </code>
              </p>
              {selectedBan.reason && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Reason:</span>{' '}
                  {selectedBan.reason}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnbanDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedBan && unbanMutation.mutate(selectedBan.id)}
              disabled={unbanMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {unbanMutation.isPending ? 'Removing...' : 'Remove Ban'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeviceBans;
