import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Bell, Send, Users, Megaphone, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  user_id: string;
}

const AdminNotificationsPage = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [targetAudience, setTargetAudience] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    fetchUserCount();
    fetchRecentNotifications();
  }, []);

  const fetchUserCount = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    setUserCount(count || 0);
  };

  const fetchRecentNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    setRecentNotifications(data || []);
  };

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in title and message',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      let userIds: string[] = [];

      if (targetAudience === 'all') {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id');
        userIds = profiles?.map(p => p.id) || [];
      } else if (targetAudience === 'active') {
        // Users who registered for matches in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: registrations } = await supabase
          .from('match_registrations')
          .select('user_id')
          .gte('registered_at', sevenDaysAgo.toISOString());
        
        userIds = [...new Set(registrations?.map(r => r.user_id) || [])];
      }

      if (userIds.length === 0) {
        toast({
          title: 'No Users',
          description: 'No users found for the selected audience',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);

      if (error) throw error;

      toast({
        title: '✅ Notification Sent!',
        description: `Sent to ${userIds.length} users`,
      });

      setTitle('');
      setMessage('');
      fetchRecentNotifications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Notification deleted' });
      fetchRecentNotifications();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" />
          Broadcast Notifications
        </h1>
        <p className="text-muted-foreground">Send notifications to all or selected users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Compose Notification
            </CardTitle>
            <CardDescription>
              Create and send notifications to your users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Notification Title</Label>
              <Input
                placeholder="e.g., 🎮 New Tournament Available!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Enter your notification message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="success">✅ Success</SelectItem>
                    <SelectItem value="warning">⚠️ Warning</SelectItem>
                    <SelectItem value="error">❌ Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users ({userCount})</SelectItem>
                    <SelectItem value="active">Active Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={sendNotification}
              variant="neon"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send Notification
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Recent Notifications
            </CardTitle>
            <CardDescription>
              Last 10 sent notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentNotifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No notifications sent yet
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-lg bg-secondary/30 space-y-1 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span>{getTypeIcon(notif.type)}</span>
                        <span className="font-medium text-sm">{notif.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                        onClick={() => deleteNotification(notif.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {format(new Date(notif.created_at), 'MMM dd, hh:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Templates */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <CardDescription>Click to use pre-made notification templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col items-start text-left"
              onClick={() => {
                setTitle('🎮 New Tournament Available!');
                setMessage('A new exciting tournament has been added. Register now to compete and win amazing prizes!');
                setType('success');
              }}
            >
              <span className="font-medium">New Tournament</span>
              <span className="text-xs text-muted-foreground">Announce new matches</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex-col items-start text-left"
              onClick={() => {
                setTitle('⚠️ Maintenance Notice');
                setMessage('We will be performing scheduled maintenance. The platform may be temporarily unavailable.');
                setType('warning');
              }}
            >
              <span className="font-medium">Maintenance</span>
              <span className="text-xs text-muted-foreground">System maintenance alert</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex-col items-start text-left"
              onClick={() => {
                setTitle('🎉 Congratulations Winners!');
                setMessage('The results are in! Check your wallet for any prize winnings. Thanks for participating!');
                setType('success');
              }}
            >
              <span className="font-medium">Winner Announcement</span>
              <span className="text-xs text-muted-foreground">Prize distribution</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificationsPage;
