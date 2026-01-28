import { useEffect, useState } from 'react';
import { Trophy, Users, Send, Copy, Check, ShieldX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import MatchResultsDialog from '@/components/admin/MatchResultsDialog';
import MatchParticipantsDialog from '@/components/MatchParticipantsDialog';
import { useAgentPermissions } from '@/hooks/useAgentPermissions';

type MatchStatus = Database['public']['Enums']['match_status'];

type Match = {
  id: string;
  title: string;
  game: string;
  match_type: string;
  status: MatchStatus;
  entry_fee: number;
  prize_pool: number;
  prize_per_kill: number | null;
  first_place_prize: number | null;
  max_slots: number;
  filled_slots: number;
  match_time: string;
  room_id: string | null;
  room_password: string | null;
};

const AgentMatches = () => {
  const { permissions, isLoading: permissionsLoading } = useAgentPermissions();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resultsMatch, setResultsMatch] = useState<Match | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [participantsMatch, setParticipantsMatch] = useState<Match | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);

  const copyMatchId = (matchId: string) => {
    navigator.clipboard.writeText(matchId.slice(0, 8).toUpperCase());
    setCopiedMatchId(matchId);
    toast({ title: 'Copied!', description: 'Match ID copied to clipboard' });
    setTimeout(() => setCopiedMatchId(null), 2000);
  };

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('game', 'bgmi')
      .order('match_time', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch matches', variant: 'destructive' });
    } else {
      setMatches(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (permissions.can_manage_bgmi_results) {
      fetchMatches();
    } else {
      setIsLoading(false);
    }
  }, [permissions.can_manage_bgmi_results]);

  const updateStatus = async (id: string, status: MatchStatus) => {
    const { error } = await supabase.from('matches').update({ status }).eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Status updated' });
      fetchMatches();
    }
  };

  const publishRoomDetails = async (match: Match) => {
    if (!permissions.can_publish_room_details) {
      toast({ title: 'Access Denied', description: 'You do not have permission to publish room details', variant: 'destructive' });
      return;
    }

    if (!match.room_id || !match.room_password) {
      toast({ title: 'Error', description: 'Room details not set by admin', variant: 'destructive' });
      return;
    }

    const { data: registrations, error } = await supabase
      .from('match_registrations')
      .select('user_id')
      .eq('match_id', match.id)
      .eq('is_approved', true);

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch registrations', variant: 'destructive' });
      return;
    }

    if (!registrations || registrations.length === 0) {
      toast({ title: 'Info', description: 'No approved registrations for this match' });
      return;
    }

    const notifications = registrations.map(reg => ({
      user_id: reg.user_id,
      title: '🎮 Room Details Published!',
      message: `Room details for "${match.title}" are now available! Room ID: ${match.room_id} | Password: ${match.room_password}`,
      type: 'success',
    }));

    const { error: notifError } = await supabase.from('notifications').insert(notifications);

    if (notifError) {
      toast({ title: 'Error', description: 'Failed to send notifications', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Room details sent to ${registrations.length} players!` });
    }
  };

  const handleManageResults = (match: Match) => {
    if (!permissions.can_manage_bgmi_results) {
      toast({ title: 'Access Denied', description: 'You do not have permission to manage results', variant: 'destructive' });
      return;
    }
    setResultsMatch(match);
    setIsResultsOpen(true);
  };

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-500';
      case 'live': return 'bg-green-500/20 text-green-500';
      case 'completed': return 'bg-gray-500/20 text-gray-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-yellow-500/20 text-yellow-500';
    }
  };

  if (permissionsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  if (!permissions.can_manage_bgmi_results) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <ShieldX className="w-16 h-16 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-center">
          You don't have permission to manage BGMI matches.<br />
          Contact admin to enable this access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">BGMI Match Management</h1>
        <p className="text-muted-foreground">Manage match results and status</p>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">Match ID</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Match</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Prize</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Slots</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Time</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : matches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">No BGMI matches found</td>
                  </tr>
                ) : (
                  matches.map((match) => (
                    <tr key={match.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-mono text-xs gap-1"
                          onClick={() => copyMatchId(match.id)}
                        >
                          {match.id.slice(0, 8).toUpperCase()}
                          {copiedMatchId === match.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{match.title}</p>
                          <p className="text-xs text-muted-foreground uppercase">{match.game}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">
                          {match.match_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 font-display font-bold text-foreground">₹{match.prize_pool}</td>
                      <td className="p-4">
                        <span className="text-foreground">{match.filled_slots}/{match.max_slots}</span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(match.match_time), 'MMM dd, hh:mm a')}
                      </td>
                      <td className="p-4">
                        <Select
                          value={match.status}
                          onValueChange={(value) => updateStatus(match.id, value as MatchStatus)}
                        >
                          <SelectTrigger className={`w-32 ${getStatusColor(match.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setParticipantsMatch(match);
                              setIsParticipantsOpen(true);
                            }}
                            title="View participants"
                          >
                            <Users className="w-4 h-4 text-blue-500" />
                          </Button>
                          {permissions.can_publish_room_details && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => publishRoomDetails(match)}
                              title="Publish room details"
                            >
                              <Send className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleManageResults(match)}
                            title="Manage results"
                          >
                            <Trophy className="w-4 h-4 text-yellow-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {resultsMatch && (
        <MatchResultsDialog
          isOpen={isResultsOpen}
          onClose={() => {
            setIsResultsOpen(false);
            setResultsMatch(null);
          }}
          match={resultsMatch as any}
          onResultsDeclared={() => fetchMatches()}
        />
      )}

      {participantsMatch && (
        <MatchParticipantsDialog
          isOpen={isParticipantsOpen}
          onClose={() => {
            setIsParticipantsOpen(false);
            setParticipantsMatch(null);
          }}
          matchId={participantsMatch.id}
          matchTitle={participantsMatch.title}
        />
      )}
    </div>
  );
};

export default AgentMatches;
