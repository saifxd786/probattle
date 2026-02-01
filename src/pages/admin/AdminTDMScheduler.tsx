import { useState, useEffect } from 'react';
import { Clock, Play, RefreshCw, Calendar, AlertTriangle, CheckCircle2, XCircle, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ScheduleSettings {
  id: string;
  is_enabled: boolean;
  schedule_times: string[];
  match_type: string;
  entry_fee: number;
  prize_pool: number;
  max_slots: number;
  gun_category: string | null;
  auto_cancel_seconds: number;
}

interface ScheduledMatch {
  id: string;
  title: string;
  match_time: string;
  filled_slots: number;
  max_slots: number;
  status: string;
  fill_status?: string;
}

const DEFAULT_TIMES = ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00'];

const AdminTDMScheduler = () => {
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [todaysMatches, setTodaysMatches] = useState<ScheduledMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('tdm_schedule_settings')
      .select('*')
      .single();

    if (!error && data) {
      setSettings(data as unknown as ScheduleSettings);
    }
  };

  const fetchTodaysMatches = async () => {
    // Get today's date in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayIST = istNow.toISOString().split('T')[0];
    
    // Calculate start and end of day in IST
    const startOfDay = new Date(`${todayIST}T00:00:00+05:30`);
    const endOfDay = new Date(`${todayIST}T23:59:59+05:30`);

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('is_auto_scheduled', true)
      .gte('match_time', startOfDay.toISOString())
      .lte('match_time', endOfDay.toISOString())
      .order('match_time', { ascending: true });

    if (!error && data) {
      setTodaysMatches(data as unknown as ScheduledMatch[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
    fetchTodaysMatches();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTodaysMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('tdm_schedule_settings')
      .update({
        is_enabled: settings.is_enabled,
        schedule_times: settings.schedule_times,
        match_type: settings.match_type,
        entry_fee: settings.entry_fee,
        prize_pool: settings.prize_pool,
        max_slots: settings.max_slots,
        gun_category: settings.gun_category,
        auto_cancel_seconds: settings.auto_cancel_seconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Settings saved successfully' });
    }
    setIsSaving(false);
  };

  const handleCreateDailyMatches = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('tdm-match-scheduler', {
        body: {},
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Created ${data.created?.length || 0} matches`,
      });
      fetchTodaysMatches();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setIsCreating(false);
  };

  const handleCheckCancellations = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tdm-match-scheduler?action=check_cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      
      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message || 'Cancellation check complete',
      });
      fetchTodaysMatches();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setIsCancelling(false);
  };

  const toggleTime = (time: string) => {
    if (!settings) return;
    
    const newTimes = settings.schedule_times.includes(time)
      ? settings.schedule_times.filter(t => t !== time)
      : [...settings.schedule_times, time].sort();
    
    setSettings({ ...settings, schedule_times: newTimes });
  };

  const getStatusBadge = (match: ScheduledMatch) => {
    if (match.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (match.filled_slots >= match.max_slots) {
      return <Badge className="bg-green-500">Full</Badge>;
    }
    if (match.filled_slots > 0) {
      return <Badge variant="secondary">{match.filled_slots}/{match.max_slots}</Badge>;
    }
    return <Badge variant="outline">Empty</Badge>;
  };

  const formatMatchTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">TDM Match Scheduler</h1>
          <p className="text-muted-foreground">Configure automatic daily TDM match creation</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCheckCancellations}
            disabled={isCancelling}
          >
            {isCancelling ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
            Check Cancellations
          </Button>
          <Button 
            variant="neon" 
            onClick={handleCreateDailyMatches}
            disabled={isCreating}
          >
            {isCreating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Create Today's Matches
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Schedule Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Enable Auto-Scheduling</Label>
                  <Switch
                    checked={settings.is_enabled}
                    onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Match Type</Label>
                    <Select
                      value={settings.match_type}
                      onValueChange={(v) => setSettings({ ...settings, match_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tdm_1v1">TDM 1v1</SelectItem>
                        <SelectItem value="tdm_2v2">TDM 2v2</SelectItem>
                        <SelectItem value="tdm_4v4">TDM 4v4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Gun Category</Label>
                    <Select
                      value={settings.gun_category || 'any_gun'}
                      onValueChange={(v) => setSettings({ ...settings, gun_category: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any_gun">Any Gun</SelectItem>
                        <SelectItem value="m416_only">Only M416</SelectItem>
                        <SelectItem value="shotgun_only">Only Shotgun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Entry Fee (₹)</Label>
                    <Input
                      type="number"
                      value={settings.entry_fee}
                      onChange={(e) => setSettings({ ...settings, entry_fee: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Prize Pool (₹)</Label>
                    <Input
                      type="number"
                      value={settings.prize_pool}
                      onChange={(e) => setSettings({ ...settings, prize_pool: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Max Slots</Label>
                    <Input
                      type="number"
                      value={settings.max_slots}
                      onChange={(e) => setSettings({ ...settings, max_slots: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Auto-Cancel Before Match (seconds)</Label>
                  <Input
                    type="number"
                    value={settings.auto_cancel_seconds}
                    onChange={(e) => setSettings({ ...settings, auto_cancel_seconds: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Match will auto-cancel if not full this many seconds before start
                  </p>
                </div>

                <div>
                  <Label className="mb-2 block">Schedule Times (IST)</Label>
                  <div className="flex flex-wrap gap-2">
                    {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map((time) => {
                      const [hours] = time.split(':').map(Number);
                      const period = hours >= 12 ? 'PM' : 'AM';
                      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                      const displayTime = `${displayHour}:00 ${period}`;
                      
                      return (
                        <button
                          key={time}
                          onClick={() => toggleTime(time)}
                          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                            settings.schedule_times.includes(time)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {displayTime}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Today's Matches Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Today's Scheduled Matches
              <Badge variant="outline" className="ml-auto">
                {todaysMatches.length} matches
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysMatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No matches scheduled for today</p>
                <p className="text-xs mt-1">Click "Create Today's Matches" to generate</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {todaysMatches.map((match) => (
                  <div
                    key={match.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      match.status === 'cancelled'
                        ? 'bg-destructive/10 border-destructive/20'
                        : match.filled_slots >= match.max_slots
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{formatMatchTime(match.match_time)}</p>
                        <p className="text-xs text-muted-foreground">{match.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {match.filled_slots >= match.max_slots && match.status !== 'cancelled' && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {match.status === 'cancelled' && (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      )}
                      {getStatusBadge(match)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-500">How Auto-Scheduling Works</p>
              <ul className="text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                <li>Click "Create Today's Matches" to generate matches for today's schedule times</li>
                <li>Matches auto-cancel {settings?.auto_cancel_seconds || 10}s before start if not full (2 players for 1v1)</li>
                <li>Users get automatic refunds when match is cancelled</li>
                <li>You'll get a notification when a match becomes full</li>
                <li>For full automation, set up a cron job to call the scheduler function daily</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTDMScheduler;