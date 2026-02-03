import { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Send, Trophy, Users, Copy, Check, Pencil, Clock, Play, CheckCircle, XCircle, List, Search, X } from 'lucide-react';
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
import AdminMatchParticipantsDialog from '@/components/admin/AdminMatchParticipantsDialog';

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'live' | 'completed' | 'cancelled'>('all');
  const [searchCode, setSearchCode] = useState('');
  const [searchedMatch, setSearchedMatch] = useState<Match | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Filter matches based on active filter
  const filteredMatches = useMemo(() => {
    if (activeFilter === 'all') return matches;
    return matches.filter(match => match.status === activeFilter);
  }, [matches, activeFilter]);

  // Search match by code
  const searchMatchByCode = async () => {
    if (!searchCode.trim()) {
      toast({ title: 'Error', description: 'Please enter a match code', variant: 'destructive' });
      return;
    }
    
    setIsSearching(true);
    setSearchedMatch(null);
    
    // Match code is first 8 chars of UUID (case insensitive)
    const searchPattern = searchCode.trim().toLowerCase();
    
    // Search in all matches - match_code column or id prefix
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(`match_code.ilike.${searchPattern}%,id.ilike.${searchPattern}%`)
      .limit(1)
      .single();
    
    if (error || !data) {
      toast({ title: 'Not Found', description: 'No match found with this code', variant: 'destructive' });
    } else {
      setSearchedMatch(data);
      toast({ title: 'Match Found!', description: `Found: ${data.title}` });
    }
    setIsSearching(false);
  };

  const clearSearch = () => {
    setSearchCode('');
    setSearchedMatch(null);
  };

  const filterTabs = [
    { id: 'all', label: 'All', icon: List, count: matches.length },
    { id: 'upcoming', label: 'Upcoming', icon: Clock, count: matches.filter(m => m.status === 'upcoming').length },
    { id: 'live', label: 'Live', icon: Play, count: matches.filter(m => m.status === 'live').length },
    { id: 'completed', label: 'Result Out', icon: CheckCircle, count: matches.filter(m => m.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', icon: XCircle, count: matches.filter(m => m.status === 'cancelled').length },
  ] as const;

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Match Management</h1>
          <p className="text-muted-foreground">Create and manage tournament matches</p>
        </div>
        
        {/* Search by Match Code */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by match code..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && searchMatchByCode()}
              className="pl-9 pr-8 w-48 md:w-56 font-mono uppercase"
            />
            {searchCode && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={searchMatchByCode} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
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
                {/* Map Selection for Classic matches */}
                {formData.match_type === 'classic' && (
                  <div>
                    <Label>Map</Label>
                    <Select value={formData.map_name} onValueChange={(v) => setFormData({ ...formData, map_name: v })}>
                      <SelectTrigger><SelectValue placeholder="Select map" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="erangel">Erangel</SelectItem>
                        <SelectItem value="miramar">Miramar</SelectItem>
                        <SelectItem value="sanhok">Sanhok</SelectItem>
                        <SelectItem value="vikendi">Vikendi</SelectItem>
                        <SelectItem value="livik">Livik</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Map Name for TDM matches */}
                {formData.match_type.startsWith('tdm') && (
                  <div>
                    <Label>Map Name</Label>
                    <Input
                      value={formData.map_name}
                      onChange={(e) => setFormData({ ...formData, map_name: e.target.value })}
                      placeholder="e.g., Warehouse, Hangar"
                    />
                  </div>
                )}
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

      {/* Searched Match Result */}
      {searchedMatch && (
        <Card className="glass-card border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search Result
              </h3>
              <Button variant="ghost" size="sm" onClick={clearSearch}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-medium text-muted-foreground text-sm">Match Code</th>
                    <th className="text-left p-2 font-medium text-muted-foreground text-sm">Match</th>
                    <th className="text-left p-2 font-medium text-muted-foreground text-sm">Type</th>
                    <th className="text-left p-2 font-medium text-muted-foreground text-sm">Entry</th>
                    <th className="text-left p-2 font-medium text-muted-foreground text-sm">Prize</th>
                    <th className="text-left p-2 font-medium text-muted-foreground text-sm">Slots</th>
                    <th className="text-left p-2 font-medium text-muted-foreground text-sm">Time</th>
                    <th className="text-left p-2 font-medium text-muted-foreground text-sm">Status</th>
                    <th className="text-left p-2 font-medium text-muted-foreground text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-secondary/20">
                    <td className="p-2">
                      <button
                        onClick={() => copyMatchId(searchedMatch.id)}
                        className="flex items-center gap-1 text-xs font-mono bg-primary/20 px-2 py-1 rounded hover:bg-primary/30 transition-colors text-primary"
                        title="Click to copy"
                      >
                        {searchedMatch.id.slice(0, 8).toUpperCase()}
                        {copiedMatchId === searchedMatch.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </td>
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{searchedMatch.title}</p>
                        <p className="text-xs text-muted-foreground uppercase">{searchedMatch.game}</p>
                      </div>
                    </td>
                    <td className="p-2 text-sm">{searchedMatch.match_type.replace('_', ' ').toUpperCase()}</td>
                    <td className="p-2">{searchedMatch.is_free ? 'Free' : `₹${searchedMatch.entry_fee}`}</td>
                    <td className="p-2">₹{searchedMatch.prize_pool}</td>
                    <td className="p-2">{searchedMatch.filled_slots}/{searchedMatch.max_slots}</td>
                    <td className="p-2 text-sm">
                      {searchedMatch.match_time ? format(new Date(searchedMatch.match_time), 'MMM dd, hh:mm a') : '-'}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(searchedMatch.status)}`}>
                        {searchedMatch.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setParticipantsMatch(searchedMatch); setIsParticipantsOpen(true); }}
                          title="View Players"
                        >
                          <Users className="w-4 h-4 text-blue-500" />
                        </Button>
                        {searchedMatch.status === 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-blue-500 border-blue-500/50 hover:bg-blue-500/10"
                            onClick={() => { setResultsMatch(searchedMatch); setIsEditResultsMode(true); setIsResultsOpen(true); }}
                            title="View/Edit Results"
                          >
                            <Trophy className="w-4 h-4 mr-1" />
                            Results
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(searchedMatch)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? tab.id === 'live' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : tab.id === 'cancelled'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : tab.id === 'completed'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : tab.id === 'upcoming'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive 
                  ? 'bg-background/50' 
                  : 'bg-muted/50'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
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
                ) : filteredMatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-muted-foreground">
                      {activeFilter === 'all' ? 'No matches found' : `No ${activeFilter} matches found`}
                    </td>
                  </tr>
                ) : (
                  filteredMatches.map((match) => (
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

      <AdminMatchParticipantsDialog
        matchId={participantsMatch?.id || null}
        matchTitle={participantsMatch?.title || ''}
        entryFee={participantsMatch?.entry_fee || 0}
        matchStatus={participantsMatch?.status}
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        onParticipantKicked={fetchMatches}
        onMatchCancelled={fetchMatches}
      />
    </div>
  );
};

export default AdminMatches;
