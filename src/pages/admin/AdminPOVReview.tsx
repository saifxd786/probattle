import { useState, useEffect } from 'react';
import { 
  Video, Eye, CheckCircle, XCircle, Clock, AlertTriangle, 
  Search, User, Trophy, DollarSign, RefreshCw, ExternalLink,
  Smartphone, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

type POVStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

type POVHold = {
  id: string;
  match_id: string;
  user_id: string;
  match_result_id: string | null;
  prize_amount_held: number;
  status: POVStatus;
  admin_note: string | null;
  pov_video_url: string | null;
  handcam_video_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  match_title?: string;
  match_type?: string;
  player_name?: string;
  player_id?: string;
  avatar_url?: string | null;
  user_code?: string;
};

const AdminPOVReview = () => {
  const [povHolds, setPovHolds] = useState<POVHold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<POVStatus | 'all'>('pending');
  
  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedHold, setSelectedHold] = useState<POVHold | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPOVHolds();
  }, []);

  const fetchPOVHolds = async () => {
    setIsLoading(true);
    
    const { data: holds, error } = await supabase
      .from('pov_verification_holds')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch POV holds', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (!holds || holds.length === 0) {
      setPovHolds([]);
      setIsLoading(false);
      return;
    }

    // Fetch related data
    const matchIds = [...new Set(holds.map(h => h.match_id))];
    const userIds = [...new Set(holds.map(h => h.user_id))];

    const [matchesRes, profilesRes, registrationsRes] = await Promise.all([
      supabase.from('matches').select('id, title, match_type').in('id', matchIds),
      supabase.from('profiles').select('id, avatar_url, user_code').in('id', userIds),
      supabase.from('match_registrations')
        .select('user_id, match_id, bgmi_ingame_name, bgmi_player_id')
        .in('match_id', matchIds)
        .in('user_id', userIds)
    ]);

    const matchMap = new Map(matchesRes.data?.map(m => [m.id, m]) || []);
    const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
    const registrationMap = new Map(
      registrationsRes.data?.map(r => [`${r.user_id}-${r.match_id}`, r]) || []
    );

    const enrichedHolds = holds.map(hold => {
      const match = matchMap.get(hold.match_id);
      const profile = profileMap.get(hold.user_id);
      const registration = registrationMap.get(`${hold.user_id}-${hold.match_id}`);
      
      return {
        ...hold,
        status: hold.status as POVStatus,
        match_title: match?.title || 'Unknown Match',
        match_type: match?.match_type || 'unknown',
        player_name: registration?.bgmi_ingame_name || 'Unknown Player',
        player_id: registration?.bgmi_player_id || '',
        avatar_url: profile?.avatar_url || null,
        user_code: profile?.user_code || ''
      };
    });

    setPovHolds(enrichedHolds);
    setIsLoading(false);
  };

  const getStatusBadge = (status: POVStatus) => {
    const config = {
      pending: { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' },
      submitted: { label: 'Submitted', className: 'bg-blue-500/20 text-blue-500 border-blue-500/50' },
      approved: { label: 'Approved', className: 'bg-green-500/20 text-green-500 border-green-500/50' },
      rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-500 border-red-500/50' }
    };
    return <Badge variant="outline" className={config[status].className}>{config[status].label}</Badge>;
  };

  const filteredHolds = povHolds.filter(hold => {
    const matchesTab = activeTab === 'all' || hold.status === activeTab;
    const matchesSearch = !searchQuery || 
      hold.player_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hold.match_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hold.user_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleReview = (hold: POVHold) => {
    setSelectedHold(hold);
    setRejectReason('');
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedHold) return;
    setIsProcessing(true);

    try {
      // 1. Update POV hold status
      const { error: updateError } = await supabase
        .from('pov_verification_holds')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          admin_note: 'POV verified - funds restored'
        })
        .eq('id', selectedHold.id);

      if (updateError) throw updateError;

      // 2. Restore funds to user wallet
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', selectedHold.user_id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ wallet_balance: (profile.wallet_balance || 0) + selectedHold.prize_amount_held })
          .eq('id', selectedHold.user_id);
      }

      // 3. Create credit transaction
      await supabase.from('transactions').insert({
        user_id: selectedHold.user_id,
        amount: selectedHold.prize_amount_held,
        type: 'admin_credit',
        status: 'completed',
        description: `✅ POV Verified - Funds restored for "${selectedHold.match_title}"`
      });

      // 4. Send notification
      await supabase.from('notifications').insert({
        user_id: selectedHold.user_id,
        title: '✅ POV Approved - Funds Restored!',
        message: `Your POV for "${selectedHold.match_title}" has been verified. ₹${selectedHold.prize_amount_held} has been restored to your wallet!`,
        type: 'success'
      });

      toast({ title: 'Approved!', description: `₹${selectedHold.prize_amount_held} restored to player wallet` });
      setReviewDialogOpen(false);
      fetchPOVHolds();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedHold) return;
    setIsProcessing(true);

    try {
      // 1. Update POV hold status
      const { error: updateError } = await supabase
        .from('pov_verification_holds')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          admin_note: rejectReason || 'POV rejected - suspicious gameplay confirmed'
        })
        .eq('id', selectedHold.id);

      if (updateError) throw updateError;

      // 2. Send notification
      await supabase.from('notifications').insert({
        user_id: selectedHold.user_id,
        title: '❌ POV Rejected',
        message: `Your POV for "${selectedHold.match_title}" was not approved. ${rejectReason || 'Suspicious gameplay detected.'}`,
        type: 'error'
      });

      toast({ title: 'Rejected', description: 'Player has been notified' });
      setReviewDialogOpen(false);
      fetchPOVHolds();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const counts = {
    all: povHolds.length,
    pending: povHolds.filter(h => h.status === 'pending').length,
    submitted: povHolds.filter(h => h.status === 'submitted').length,
    approved: povHolds.filter(h => h.status === 'approved').length,
    rejected: povHolds.filter(h => h.status === 'rejected').length
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            POV Verification Review
          </h1>
          <p className="text-muted-foreground text-sm">Review suspicious player gameplay recordings</p>
        </div>
        <Button onClick={fetchPOVHolds} variant="outline" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.all}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-yellow-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{counts.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-blue-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Video className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{counts.submitted}</p>
              <p className="text-xs text-muted-foreground">Submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-green-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{counts.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{counts.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by player name, match title, or user code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as POVStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({counts.submitted})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <ScrollArea className="h-[calc(100vh-450px)]">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading POV holds...</div>
            ) : filteredHolds.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No POV verification holds found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHolds.map((hold) => (
                  <Card key={hold.id} className="bg-card hover:bg-card/80 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <Avatar className="w-12 h-12 border-2 border-primary/30">
                          <AvatarImage src={hold.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold">
                            {hold.player_name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{hold.player_name}</p>
                            {getStatusBadge(hold.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {hold.match_title} • {hold.match_type?.toUpperCase()}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {hold.user_code || hold.user_id.slice(0, 8)}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ₹{hold.prize_amount_held} held
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(hold.created_at), 'dd MMM, hh:mm a')}
                            </span>
                          </div>

                          {/* Video links */}
                          {(hold.pov_video_url || hold.handcam_video_url) && (
                            <div className="flex gap-2 mt-2">
                              {hold.pov_video_url && (
                                <a 
                                  href={hold.pov_video_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <Video className="w-3 h-3" /> Screen Recording
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {hold.handcam_video_url && (
                                <a 
                                  href={hold.handcam_video_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <Smartphone className="w-3 h-3" /> Handcam
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}

                          {hold.admin_note && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Note: {hold.admin_note}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReview(hold)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Review POV Submission
            </DialogTitle>
            <DialogDescription>
              Review the player's gameplay recordings and approve or reject their prize claim.
            </DialogDescription>
          </DialogHeader>

          {selectedHold && (
            <div className="space-y-4">
              {/* Player Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedHold.avatar_url || ''} />
                  <AvatarFallback>{selectedHold.player_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedHold.player_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedHold.match_title}</p>
                </div>
                <Badge className="ml-auto">₹{selectedHold.prize_amount_held}</Badge>
              </div>

              {/* Videos */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Submitted Videos:</p>
                {selectedHold.pov_video_url ? (
                  <a 
                    href={selectedHold.pov_video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                  >
                    <Video className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Screen Recording</span>
                    <ExternalLink className="w-4 h-4 ml-auto text-blue-500" />
                  </a>
                ) : (
                  <p className="text-sm text-yellow-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Screen recording not submitted yet
                  </p>
                )}
                
                {selectedHold.handcam_video_url ? (
                  <a 
                    href={selectedHold.handcam_video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                  >
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Handcam Footage</span>
                    <ExternalLink className="w-4 h-4 ml-auto text-blue-500" />
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Handcam not submitted (optional)
                  </p>
                )}
              </div>

              {/* Reject reason */}
              <div>
                <p className="text-sm font-medium mb-2">Rejection Reason (if rejecting):</p>
                <Textarea
                  placeholder="Describe why the POV is being rejected..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isProcessing}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve & Restore ₹{selectedHold?.prize_amount_held}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPOVReview;
