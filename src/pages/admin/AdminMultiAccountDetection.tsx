import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Smartphone, 
  Globe, 
  CreditCard,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  alert_type: string;
  identifier_value: string;
  user_ids: string[];
  user_count: number;
  severity: string;
  is_resolved: boolean;
  notes: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  wallet_balance: number;
  created_at: string;
  is_banned: boolean;
}

interface UserSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  device_fingerprint: string | null;
  device_name: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: UserProfile;
}

interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  isp: string;
}

const AdminMultiAccountDetection = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertUsers, setAlertUsers] = useState<UserProfile[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [resolveNotes, setResolveNotes] = useState('');
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [scanSummary, setScanSummary] = useState<{
    total: number;
    critical: number;
    high: number;
  } | null>(null);
  const [geoLocations, setGeoLocations] = useState<Record<string, GeoLocation | null>>({});
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchAlerts(), fetchSessions()]);
    setIsLoading(false);
  };

  const fetchGeoLocations = async (ipAddresses: string[]) => {
    const uniqueIps = [...new Set(ipAddresses.filter(ip => ip && !geoLocations[ip]))];
    if (uniqueIps.length === 0) return;
    
    setIsLoadingGeo(true);
    try {
      const { data, error } = await supabase.functions.invoke('ip-geolocation', {
        body: { ip_addresses: uniqueIps }
      });
      
      if (!error && data?.locations) {
        setGeoLocations(prev => ({ ...prev, ...data.locations }));
      }
    } catch (err) {
      console.error('Failed to fetch geolocation:', err);
    }
    setIsLoadingGeo(false);
  };

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('multi_account_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setAlerts(data);
  };

  const fetchSessions = async () => {
    // First get sessions
    const { data: sessionData } = await supabase
      .from('user_login_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!sessionData) return;

    // Get unique user IDs
    const userIds = [...new Set(sessionData.map(s => s.user_id))];
    
    // Fetch profiles for those users
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, email, phone, wallet_balance, created_at, is_banned')
      .in('id', userIds);

    // Map profiles to sessions
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    
    const sessionsWithProfiles = sessionData.map(session => ({
      ...session,
      profiles: profilesMap.get(session.user_id) as UserProfile | undefined
    }));

    setSessions(sessionsWithProfiles);
    
    // Fetch geolocation for IPs
    const ips = sessionData.map(s => s.ip_address).filter(Boolean) as string[];
    fetchGeoLocations(ips);
  };

  const runDetection = async (useEdgeFunction = false) => {
    setIsScanning(true);
    
    try {
      if (useEdgeFunction) {
        // Use edge function for more comprehensive scan
        const { data, error } = await supabase.functions.invoke('daily-multi-account-scan');
        
        if (error) {
          toast({ title: 'Detection failed', description: error.message, variant: 'destructive' });
        } else {
          setLastScanTime(data.scan_time);
          setScanSummary(data.summary);
          toast({ 
            title: 'Scan complete', 
            description: `Found ${data.summary.total} alerts (${data.summary.critical} critical, ${data.summary.high} high)` 
          });
          await fetchAlerts();
        }
      } else {
        // Quick scan using RPC
        const { data, error } = await supabase.rpc('detect_multi_accounts');
        
        if (error) {
          toast({ title: 'Detection failed', description: error.message, variant: 'destructive' });
        } else {
          setLastScanTime(new Date().toISOString());
          toast({ title: 'Quick scan complete', description: `Detection scan finished` });
          await fetchAlerts();
        }
      }
    } catch (err) {
      toast({ title: 'Scan failed', variant: 'destructive' });
    }
    
    setIsScanning(false);
  };

  const viewAlertDetails = async (alert: Alert) => {
    setSelectedAlert(alert);
    
    // Fetch user profiles for alert
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('id', alert.user_ids);
    
    if (data) setAlertUsers(data);
  };

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('multi_account_alerts')
      .update({ 
        is_resolved: true, 
        resolved_at: new Date().toISOString(),
        notes: resolveNotes || null
      })
      .eq('id', alertId);

    if (error) {
      toast({ title: 'Failed to resolve', variant: 'destructive' });
    } else {
      toast({ title: 'Alert resolved' });
      setSelectedAlert(null);
      setResolveNotes('');
      fetchAlerts();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      default: return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'ip_match': return <Globe className="w-4 h-4" />;
      case 'device_match': return <Smartphone className="w-4 h-4" />;
      case 'upi_match': return <CreditCard className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'ip_match': return 'Same IP Address';
      case 'device_match': return 'Same Device';
      case 'upi_match': return 'Same UPI Account';
      default: return type;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterType !== 'all' && alert.alert_type !== filterType) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (searchQuery && !alert.identifier_value.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const unresolvedCount = alerts.filter(a => !a.is_resolved).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.is_resolved).length;

  // Group sessions by IP for easy viewing
  const sessionsByIP = sessions.reduce((acc, session) => {
    const ip = session.ip_address || 'Unknown';
    if (!acc[ip]) acc[ip] = [];
    acc[ip].push(session);
    return acc;
  }, {} as Record<string, UserSession[]>);

  const suspiciousIPs = Object.entries(sessionsByIP).filter(([_, sessions]) => {
    const uniqueUsers = new Set(sessions.map(s => s.user_id));
    return uniqueUsers.size > 1;
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Multi-Account Detection
          </h1>
          <p className="text-muted-foreground">Track and detect users with multiple accounts</p>
          {lastScanTime && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              Last scan: {formatDistanceToNow(new Date(lastScanTime), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => runDetection(false)} disabled={isScanning}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
            Quick Scan
          </Button>
          <Button onClick={() => runDetection(true)} disabled={isScanning}>
            <Zap className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Full Scan'}
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="font-display text-2xl font-bold">{unresolvedCount}</p>
            <p className="text-xs text-muted-foreground">Unresolved Alerts</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="font-display text-2xl font-bold">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critical Alerts</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <Globe className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="font-display text-2xl font-bold">{suspiciousIPs.length}</p>
            <p className="text-xs text-muted-foreground">Suspicious IPs</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="font-display text-2xl font-bold">{sessions.length}</p>
            <p className="text-xs text-muted-foreground">Tracked Sessions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alerts ({unresolvedCount})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Globe className="w-4 h-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="suspicious" className="gap-2">
            <Shield className="w-4 h-4" />
            Suspicious IPs ({suspiciousIPs.length})
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Alert Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ip_match">IP Match</SelectItem>
                  <SelectItem value="device_match">Device Match</SelectItem>
                  <SelectItem value="upi_match">UPI Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by identifier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">No alerts found</p>
                </CardContent>
              </Card>
            ) : (
              filteredAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`glass-card ${!alert.is_resolved ? 'border-l-4' : ''} ${
                    alert.severity === 'critical' ? 'border-l-red-500' :
                    alert.severity === 'high' ? 'border-l-orange-500' :
                    'border-l-yellow-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                            {getAlertTypeIcon(alert.alert_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{getAlertTypeLabel(alert.alert_type)}</p>
                              <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              {alert.is_resolved && (
                                <Badge variant="outline" className="bg-green-500/20 text-green-500">
                                  Resolved
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">
                              {alert.identifier_value.substring(0, 50)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {alert.user_count} accounts linked • {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => viewAlertDetails(alert)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Recent Login Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {sessions.slice(0, 100).map((session) => {
                  const geo = session.ip_address ? geoLocations[session.ip_address] : null;
                  return (
                    <div key={session.id} className="p-3 bg-secondary/30 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/20">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{session.profiles?.username || session.profiles?.email || 'Unknown'}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {session.ip_address && (
                                <span className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  {session.ip_address}
                                </span>
                              )}
                              {geo && (
                                <span className="flex items-center gap-1 text-primary">
                                  <MapPin className="w-3 h-3" />
                                  {geo.city}, {geo.regionName}, {geo.country}
                                </span>
                              )}
                              {session.device_name && (
                                <span className="flex items-center gap-1">
                                  <Smartphone className="w-3 h-3" />
                                  {session.device_name}
                                </span>
                              )}
                            </div>
                            {geo?.isp && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5">ISP: {geo.isp}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(session.created_at), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suspicious IPs Tab */}
        <TabsContent value="suspicious" className="space-y-4">
          <div className="space-y-3">
            {suspiciousIPs.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">No suspicious IPs detected</p>
                </CardContent>
              </Card>
            ) : (
              suspiciousIPs.map(([ip, ipSessions]) => {
                const uniqueUsers = [...new Set(ipSessions.map(s => s.user_id))];
                const isExpanded = expandedSessions.has(ip);
                const geo = geoLocations[ip];
                
                return (
                  <Card key={ip} className="glass-card border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          const newExpanded = new Set(expandedSessions);
                          if (isExpanded) newExpanded.delete(ip);
                          else newExpanded.add(ip);
                          setExpandedSessions(newExpanded);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-orange-500/20">
                            <Globe className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium font-mono">{ip}</p>
                              {geo && (
                                <Badge variant="outline" className="text-xs">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {geo.city}, {geo.country}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {uniqueUsers.length} different users • {ipSessions.length} sessions
                              {geo?.isp && ` • ${geo.isp}`}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border space-y-2">
                          {ipSessions.map(session => (
                            <div key={session.id} className="p-2 bg-secondary/30 rounded flex items-center justify-between text-sm">
                              <div>
                                <p className="font-medium">{session.profiles?.username || session.profiles?.email}</p>
                                <p className="text-xs text-muted-foreground">{session.device_name || 'Unknown Device'}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(session.created_at), 'MMM dd, HH:mm')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getAlertTypeIcon(selectedAlert.alert_type)}
              Alert Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Matching Identifier</p>
                <p className="font-mono text-sm break-all">{selectedAlert.identifier_value}</p>
              </div>

              <div className="flex gap-3">
                <Badge className={getSeverityColor(selectedAlert.severity)}>
                  {selectedAlert.severity.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {getAlertTypeLabel(selectedAlert.alert_type)}
                </Badge>
                {selectedAlert.is_resolved && (
                  <Badge className="bg-green-500/20 text-green-500">Resolved</Badge>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Linked Accounts ({alertUsers.length})</p>
                <div className="space-y-2">
                  {alertUsers.map(user => (
                    <div key={user.id} className="p-3 bg-secondary/30 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.username || user.email || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.phone} • Balance: ₹{user.wallet_balance || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined: {format(new Date(user.created_at || ''), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.is_banned && (
                          <Badge variant="destructive">Banned</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!selectedAlert.is_resolved && (
                <div className="space-y-3 pt-4 border-t">
                  <Textarea
                    placeholder="Add notes before resolving..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => resolveAlert(selectedAlert.id)} className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Resolved
                    </Button>
                  </div>
                </div>
              )}

              {selectedAlert.notes && (
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Resolution Notes</p>
                  <p className="text-sm">{selectedAlert.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMultiAccountDetection;
