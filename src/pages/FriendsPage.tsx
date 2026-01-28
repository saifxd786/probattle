import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useGameChallenge } from '@/hooks/useGameChallenge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Gamepad2, Clock, Check, X, Swords, Loader2, Copy, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const FriendsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { friends, pendingRequests, sentRequests, isLoading, sendFriendRequest, acceptRequest, rejectRequest, removeFriend } = useFriends();
  const { pendingChallenges, sendChallenge, acceptChallenge, rejectChallenge, isLoading: challengeLoading } = useGameChallenge();
  
  const [userCode, setUserCode] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [challengeGame, setChallengeGame] = useState('ludo');
  const [challengeAmount, setChallengeAmount] = useState('10');
  const [myCode, setMyCode] = useState<string | null>(null);

  // Fetch user's own code
  useState(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('user_code')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setMyCode(data?.user_code || null));
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">Login Required</h2>
              <p className="text-muted-foreground mb-4">Please login to access Friends</p>
              <Button onClick={() => navigate('/auth')}>Login</Button>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  const handleAddFriend = async () => {
    if (!userCode.trim()) return;
    setIsAddingFriend(true);
    const result = await sendFriendRequest(userCode.trim());
    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    }
    setUserCode('');
    setIsAddingFriend(false);
  };

  const handleChallenge = async () => {
    if (!selectedFriend) return;
    const result = await sendChallenge(selectedFriend, challengeGame, parseInt(challengeAmount));
    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    }
    setSelectedFriend(null);
  };

  const copyCode = () => {
    if (myCode) {
      navigator.clipboard.writeText(myCode);
      toast({ title: "Copied!", description: "Your friend code copied to clipboard" });
    }
  };

  const incomingChallenges = pendingChallenges.filter(c => c.challenged_id === user.id);
  const outgoingChallenges = pendingChallenges.filter(c => c.challenger_id === user.id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Friends
              </h1>
              <p className="text-muted-foreground text-sm">Add friends & challenge them</p>
            </div>
            
            {myCode && (
              <Button variant="outline" size="sm" onClick={copyCode} className="gap-2">
                <Share2 className="w-4 h-4" />
                {myCode}
              </Button>
            )}
          </div>

          {/* Incoming Challenges Alert */}
          <AnimatePresence>
            {incomingChallenges.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Swords className="w-5 h-5 text-primary animate-pulse" />
                      Incoming Challenges!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {incomingChallenges.map((challenge) => (
                      <div key={challenge.id} className="flex items-center justify-between p-3 rounded-lg bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={challenge.challenger?.avatar_url || ''} />
                            <AvatarFallback>{challenge.challenger?.username?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{challenge.challenger?.username}</p>
                            <p className="text-sm text-muted-foreground">
                              {challenge.game_type.toUpperCase()} • ₹{challenge.entry_amount}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectChallenge(challenge.id)}
                            disabled={challengeLoading}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => acceptChallenge(challenge.id)}
                            disabled={challengeLoading}
                          >
                            {challengeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add Friend Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add Friend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter friend's code (e.g., ABC12)"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="uppercase"
                />
                <Button onClick={handleAddFriend} disabled={isAddingFriend || !userCode.trim()}>
                  {isAddingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="friends" className="gap-1">
                <Users className="w-4 h-4" />
                Friends ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1">
                <Clock className="w-4 h-4" />
                Requests ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="challenges" className="gap-1">
                <Gamepad2 className="w-4 h-4" />
                Challenges ({outgoingChallenges.length})
              </TabsTrigger>
            </TabsList>

            {/* Friends List */}
            <TabsContent value="friends" className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : friends.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No friends yet</p>
                    <p className="text-sm text-muted-foreground">Add friends using their code</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={friend.avatar_url || ''} />
                                <AvatarFallback className="bg-primary/20 text-primary">
                                  {friend.username?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{friend.username}</p>
                                <Badge variant="outline" className="text-xs">
                                  {friend.user_code}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => setSelectedFriend(friend.id)}
                                  >
                                    <Swords className="w-4 h-4 mr-1" />
                                    Challenge
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Challenge {friend.username}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-4">
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">Game</label>
                                      <Select value={challengeGame} onValueChange={setChallengeGame}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="ludo">🎲 Ludo</SelectItem>
                                          <SelectItem value="thimble">🎩 Thimble</SelectItem>
                                          <SelectItem value="mines">💣 Mines</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">Entry Amount</label>
                                      <Select value={challengeAmount} onValueChange={setChallengeAmount}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="10">₹10</SelectItem>
                                          <SelectItem value="20">₹20</SelectItem>
                                          <SelectItem value="50">₹50</SelectItem>
                                          <SelectItem value="100">₹100</SelectItem>
                                          <SelectItem value="200">₹200</SelectItem>
                                          <SelectItem value="500">₹500</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button 
                                      className="w-full" 
                                      onClick={handleChallenge}
                                      disabled={challengeLoading}
                                    >
                                      {challengeLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      ) : (
                                        <Swords className="w-4 h-4 mr-2" />
                                      )}
                                      Send Challenge
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => removeFriend(friend.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pending Requests */}
            <TabsContent value="requests" className="mt-4 space-y-3">
              {pendingRequests.length === 0 && sentRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No pending requests</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {pendingRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.sender?.avatar_url || ''} />
                              <AvatarFallback>{request.sender?.username?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{request.sender?.username}</p>
                              <p className="text-sm text-muted-foreground">Wants to be friends</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => rejectRequest(request.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={() => acceptRequest(request.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {sentRequests.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground mb-2">Sent Requests</p>
                      {sentRequests.map((request) => (
                        <Card key={request.id} className="opacity-70">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm">Request pending...</p>
                              <Badge variant="outline">Waiting</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Outgoing Challenges */}
            <TabsContent value="challenges" className="mt-4">
              {outgoingChallenges.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No active challenges</p>
                    <p className="text-sm text-muted-foreground">Challenge a friend to play!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {outgoingChallenges.map((challenge) => (
                    <Card key={challenge.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={challenge.challenged?.avatar_url || ''} />
                              <AvatarFallback>{challenge.challenged?.username?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{challenge.challenged?.username}</p>
                              <p className="text-sm text-muted-foreground">
                                {challenge.game_type.toUpperCase()} • ₹{challenge.entry_amount}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="animate-pulse">
                            <Clock className="w-3 h-3 mr-1" />
                            Waiting
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default FriendsPage;
