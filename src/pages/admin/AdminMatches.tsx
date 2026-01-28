import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Send, Trophy, Users, Copy, Check, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import MatchResultsDialog from '@/components/admin/MatchResultsDialog';
import MatchParticipantsDialog from '@/components/MatchParticipantsDialog';

type GameType = Database['public']['Enums']['game_type'];
type MatchType = Database['public']['Enums']['match_type'];
type MatchStatus = Database['public']['Enums']['match_status'];

type Match = {
  id: string;
  title: string;
  game: GameType;
  match_type: MatchType;
  status: MatchStatus;
  entry_fee: number;
  prize_pool: number;
  prize_per_kill: number;
  first_place_prize: number;
  map_name: string | null;
  max_slots: number;
  filled_slots: number;
  match_time: string;
  room_id: string | null;
  room_password: string | null;
  is_free: boolean;
  gun_category: string | null;
};

const defaultFormData = {
  title: '',
  game: 'bgmi' as GameType,
  match_type: 'classic' as MatchType,
  entry_fee: 0,
  prize_pool: 0,
  prize_per_kill: 0,
  first_place_prize: 0,
  second_place_prize: 0,
  third_place_prize: 0,
  map_name: '',
  max_slots: 100,
  match_time: '',
  room_id: '',
  room_password: '',
  rules: '',
  is_free: false,
  gun_category: '' as string,
};

const AdminMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [resultsMatch, setResultsMatch] = useState<Match | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isEditResultsMode, setIsEditResultsMode] = useState(false);
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
      .order('match_time', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch matches', variant: 'destructive' });
    } else {
      setMatches(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert local datetime to proper ISO format with timezone
    const localDate = new Date(formData.match_time);
    const isoMatchTime = localDate.toISOString();

    const matchData = {
      title: formData.title,
      game: formData.game,
      match_type: formData.match_type,
      entry_fee: formData.is_free ? 0 : formData.entry_fee,
      prize_pool: formData.prize_pool,
      prize_per_kill: formData.prize_per_kill,
      first_place_prize: formData.first_place_prize,
      second_place_prize: formData.second_place_prize,
      third_place_prize: formData.third_place_prize,
      map_name: formData.map_name || null,
      max_slots: formData.max_slots,
      match_time: isoMatchTime,
      room_id: formData.room_id || null,
      room_password: formData.room_password || null,
      rules: formData.rules || null,
      is_free: formData.is_free,
      gun_category: formData.gun_category || null,
      created_by: user?.id,
    };

    if (editingMatch) {
      const { error } = await supabase
        .from('matches')
        .update(matchData)
        .eq('id', editingMatch.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Match updated successfully' });
        fetchMatches();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from('matches').insert(matchData);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Match created successfully' });
        fetchMatches();
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;

    const { error } = await supabase.from('matches').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Match deleted successfully' });
      fetchMatches();
    }
  };

  const handleEdit = (match: Match) => {
    setEditingMatch(match);
    // Convert ISO time to local datetime-local format
    const matchDate = new Date(match.match_time);
    const localDateTime = matchDate.toLocaleString('sv-SE', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).replace(' ', 'T');
    
    setFormData({
      title: match.title,
      game: match.game,
      match_type: match.match_type,
      entry_fee: match.entry_fee,
      prize_pool: match.prize_pool,
      prize_per_kill: match.prize_per_kill || 0,
      first_place_prize: match.first_place_prize || 0,
      second_place_prize: (match as any).second_place_prize || 0,
      third_place_prize: (match as any).third_place_prize || 0,
      map_name: match.map_name || '',
      max_slots: match.max_slots,
      match_time: localDateTime,
      room_id: match.room_id || '',
      room_password: match.room_password || '',
      rules: '',
      is_free: match.is_free,
      gun_category: match.gun_category || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingMatch(null);
  };

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
    if (!match.room_id || !match.room_password) {
      toast({ title: 'Error', description: 'Please set Room ID and Password first', variant: 'destructive' });
      return;
    }

    // Get all approved registrations for this match
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

    // Create notifications for all registered users
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

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-500';
      case 'live': return 'bg-green-500/20 text-green-500';
      case 'completed': return 'bg-gray-500/20 text-gray-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-yellow-500/20 text-yellow-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Match Management</h1>
          <p className="text-muted-foreground">Create and manage tournament matches</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="neon">
              <Plus className="w-4 h-4 mr-2" />
              Create Match
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMatch ? 'Edit Match' : 'Create New Match'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Match title"
                    required
                  />
                </div>
                <div>
                  <Label>Game</Label>
                  <Select value={formData.game} onValueChange={(v) => setFormData({ ...formData, game: v as GameType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bgmi">BGMI</SelectItem>
                      <SelectItem value="freefire">Free Fire</SelectItem>
                      <SelectItem value="clash_royale">Clash Royale</SelectItem>
                      <SelectItem value="ludo">Ludo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Match Type</Label>
                  <Select value={formData.match_type} onValueChange={(v) => setFormData({ ...formData, match_type: v as MatchType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tdm_1v1">TDM 1v1</SelectItem>
                      <SelectItem value="tdm_2v2">TDM 2v2</SelectItem>
                      <SelectItem value="tdm_4v4">TDM 4v4</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Gun Category - Only for TDM matches */}
                {formData.match_type.startsWith('tdm') && (
                  <div>
                    <Label>Gun Category</Label>
                    <Select value={formData.gun_category} onValueChange={(v) => setFormData({ ...formData, gun_category: v })}>
                      <SelectTrigger><SelectValue placeholder="Select gun category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m416_only">Only M416</SelectItem>
                        <SelectItem value="shotgun_only">Only Shotgun</SelectItem>
                        <SelectItem value="any_gun">Any Gun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Entry Fee (₹)</Label>
                  <Input
                    type="number"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: Number(e.target.value) })}
                    disabled={formData.is_free}
                  />
                </div>
                <div>
                  <Label>Prize Pool (₹)</Label>
                  <Input
                    type="number"
                    value={formData.prize_pool}
                    onChange={(e) => setFormData({ ...formData, prize_pool: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Per Kill Prize (₹)</Label>
                  <Input
                    type="number"
                    value={formData.prize_per_kill}
                    onChange={(e) => setFormData({ ...formData, prize_per_kill: Number(e.target.value) })}
                    placeholder="Reward per kill"
                  />
                </div>
                {formData.match_type === 'classic' && (
                  <>
                    <div>
                      <Label>1st Place Prize (₹)</Label>
                      <Input
                        type="number"
                        value={formData.first_place_prize}
                        onChange={(e) => setFormData({ ...formData, first_place_prize: Number(e.target.value) })}
                        placeholder="Winner prize"
                      />
                    </div>
                    <div>
                      <Label>2nd Place Prize (₹)</Label>
                      <Input
                        type="number"
                        value={formData.second_place_prize}
                        onChange={(e) => setFormData({ ...formData, second_place_prize: Number(e.target.value) })}
                        placeholder="Runner up prize"
                      />
                    </div>
                    <div>
                      <Label>3rd Place Prize (₹)</Label>
                      <Input
                        type="number"
                        value={formData.third_place_prize}
                        onChange={(e) => setFormData({ ...formData, third_place_prize: Number(e.target.value) })}
                        placeholder="Third place prize"
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label>Map Name</Label>
                  <Input
                    value={formData.map_name}
                    onChange={(e) => setFormData({ ...formData, map_name: e.target.value })}
                    placeholder="e.g., Erangel, Sanhok"
                  />
                </div>
                <div>
                  <Label>Max Slots</Label>
                  <Input
                    type="number"
                    value={formData.max_slots}
                    onChange={(e) => setFormData({ ...formData, max_slots: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Match Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.match_time}
                    onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Room ID</Label>
                  <Input
                    value={formData.room_id}
                    onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                    placeholder="Room ID (visible after approval)"
                  />
                </div>
                <div>
                  <Label>Room Password</Label>
                  <Input
                    value={formData.room_password}
                    onChange={(e) => setFormData({ ...formData, room_password: e.target.value })}
                    placeholder="Room password"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_free"
                    checked={formData.is_free}
                    onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                    className="rounded border-border"
                  />
                  <Label htmlFor="is_free" className="cursor-pointer">Free Entry</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="neon">
                  {editingMatch ? 'Update Match' : 'Create Match'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Matches Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">Match ID</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Match</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Entry</th>
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
                    <td colSpan={9} className="p-4 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : matches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-muted-foreground">No matches found</td>
                  </tr>
                ) : (
                  matches.map((match) => (
                    <tr key={match.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="p-4">
                        <button
                          onClick={() => copyMatchId(match.id)}
                          className="flex items-center gap-1 text-xs font-mono bg-secondary/50 px-2 py-1 rounded hover:bg-secondary transition-colors"
                          title="Click to copy"
                        >
                          {match.id.slice(0, 8).toUpperCase()}
                          {copiedMatchId === match.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{match.title}</p>
                          <p className="text-xs text-muted-foreground uppercase">{match.game}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{match.match_type.replace('_', ' ').toUpperCase()}</td>
                      <td className="p-4">{match.is_free ? 'Free' : `₹${match.entry_fee}`}</td>
                      <td className="p-4">₹{match.prize_pool}</td>
                      <td className="p-4">{match.filled_slots}/{match.max_slots}</td>
                      <td className="p-4 text-sm">
                        {match.match_time ? format(new Date(match.match_time), 'MMM dd, hh:mm a') : '-'}
                      </td>
                      <td className="p-4">
                        <Select
                          value={match.status}
                          onValueChange={(v) => updateStatus(match.id, v as MatchStatus)}
                        >
                          <SelectTrigger className={`w-28 h-8 text-xs ${getStatusColor(match.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
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
                            onClick={() => { setParticipantsMatch(match); setIsParticipantsOpen(true); }}
                            title="View Players"
                          >
                            <Users className="w-4 h-4 text-blue-500" />
                          </Button>
                          {match.room_id && match.room_password && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => publishRoomDetails(match)}
                              title="Send room details to players"
                            >
                              <Send className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                          {match.status === 'completed' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-blue-500 border-blue-500/50 hover:bg-blue-500/10"
                              onClick={() => { setResultsMatch(match); setIsEditResultsMode(true); setIsResultsOpen(true); }}
                              title="Edit Results"
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit Results
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/10"
                              onClick={() => { setResultsMatch(match); setIsEditResultsMode(false); setIsResultsOpen(true); }}
                              title="Declare Results"
                            >
                              <Trophy className="w-4 h-4 mr-1" />
                              Result Out
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(match)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(match.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
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

      <MatchResultsDialog
        match={resultsMatch}
        isOpen={isResultsOpen}
        onClose={() => { setIsResultsOpen(false); setIsEditResultsMode(false); }}
        onResultsDeclared={fetchMatches}
        isEditMode={isEditResultsMode}
      />

      <MatchParticipantsDialog
        matchId={participantsMatch?.id || null}
        matchTitle={participantsMatch?.title || ''}
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
      />
    </div>
  );
};

export default AdminMatches;
