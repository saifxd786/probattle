import { useEffect, useState } from 'react';
import { Check, X, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Registration = {
  id: string;
  match_id: string;
  user_id: string;
  team_name: string | null;
  payment_status: string;
  payment_screenshot_url: string | null;
  is_approved: boolean;
  registered_at: string;
  matches: {
    title: string;
    entry_fee: number;
    game: string;
    room_id: string | null;
    room_password: string | null;
  };
  profiles: {
    username: string | null;
    email: string | null;
  };
};

const AdminPayments = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    let query = supabase
      .from('match_registrations')
      .select(`
        *,
        matches (title, entry_fee, game, room_id, room_password)
      `)
      .order('registered_at', { ascending: false });

    if (filter === 'pending') {
      query = query.eq('is_approved', false).eq('payment_status', 'pending');
    } else if (filter === 'approved') {
      query = query.eq('is_approved', true);
    } else if (filter === 'rejected') {
      query = query.eq('payment_status', 'rejected');
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch registrations', variant: 'destructive' });
    } else {
      // Fetch profiles separately
      const registrationsWithProfiles = await Promise.all(
        (data || []).map(async (reg) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, email')
            .eq('id', reg.user_id)
            .maybeSingle();
          return { ...reg, profiles: profile } as Registration;
        })
      );
      setRegistrations(registrationsWithProfiles);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRegistrations();
  }, [filter]);

  const createNotification = async (userId: string, title: string, message: string, type: string) => {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
    });
  };

  const handleApprove = async (reg: Registration) => {
    const { error } = await supabase
      .from('match_registrations')
      .update({ is_approved: true, payment_status: 'approved' })
      .eq('id', reg.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Send notification
      await createNotification(
        reg.user_id,
        'Match Registration Approved!',
        `Your registration for "${reg.matches?.title}" has been approved. Room details will be shared before the match.`,
        'success'
      );
      
      toast({ title: 'Success', description: 'Registration approved! Slot count updated.' });
      fetchRegistrations();
    }
  };

  const handleReject = async (reg: Registration) => {
    const { error } = await supabase
      .from('match_registrations')
      .update({ is_approved: false, payment_status: 'rejected' })
      .eq('id', reg.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Send notification
      await createNotification(
        reg.user_id,
        'Match Registration Rejected',
        `Your registration for "${reg.matches?.title}" was rejected. Please contact support.`,
        'error'
      );
      
      toast({ title: 'Rejected', description: 'Registration has been rejected.' });
      fetchRegistrations();
    }
  };

  const filterButtons = [
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'approved', label: 'Approved', icon: CheckCircle },
    { key: 'rejected', label: 'Rejected', icon: XCircle },
    { key: 'all', label: 'All', icon: null },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Payment Approvals</h1>
        <p className="text-muted-foreground">Review and approve match registration payments</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterButtons.map((btn) => (
          <Button
            key={btn.key}
            variant={filter === btn.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(btn.key)}
            className="gap-2"
          >
            {btn.icon && <btn.icon className="w-4 h-4" />}
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Registrations Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Match</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Team</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Screenshot</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">
                      No registrations found
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{reg.profiles?.username || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{reg.profiles?.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{reg.matches?.title}</p>
                          <p className="text-xs text-muted-foreground uppercase">{reg.matches?.game}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{reg.team_name || '-'}</td>
                      <td className="p-4 font-medium">₹{reg.matches?.entry_fee || 0}</td>
                      <td className="p-4">
                        {reg.payment_screenshot_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedScreenshot(reg.payment_screenshot_url)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No screenshot</span>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {format(new Date(reg.registered_at), 'MMM dd, hh:mm a')}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            reg.is_approved
                              ? 'bg-green-500/20 text-green-500'
                              : reg.payment_status === 'rejected'
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-yellow-500/20 text-yellow-500'
                          }`}
                        >
                          {reg.is_approved ? 'Approved' : reg.payment_status}
                        </span>
                      </td>
                      <td className="p-4">
                        {!reg.is_approved && reg.payment_status !== 'rejected' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApprove(reg)}
                              title="Approve"
                            >
                              <Check className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReject(reg)}
                              title="Reject"
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Screenshot Dialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <img
              src={selectedScreenshot}
              alt="Payment screenshot"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;
