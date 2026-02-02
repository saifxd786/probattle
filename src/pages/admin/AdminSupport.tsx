import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Send, Loader2, User, Clock, CheckCircle, AlertCircle, 
  Zap, Eye, Download, Archive, Bell, FileText, AlertTriangle, 
  Wallet, Bug, Gamepad2, ShieldAlert, Image, Video, Bot, ChevronDown,
  ChevronUp, ExternalLink, Copy, RefreshCw, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import UserDetailDialog from '@/components/admin/UserDetailDialog';
import ImageLightbox from '@/components/ImageLightbox';
import JSZip from 'jszip';
import { resolveSupportAttachments, SupportAttachmentResolved } from '@/utils/supportAttachments';
import { playNotificationSound, requestNotificationPermission, showBrowserNotification } from '@/utils/notificationSound';

// Canned responses for quick replies
const CANNED_RESPONSES = [
  { label: 'Greeting', message: 'Hello! Thank you for contacting ProBattle support. How can I help you today?' },
  { label: 'Processing', message: 'Your request is being processed. Please wait 24-48 hours for resolution.' },
  { label: 'Withdrawal', message: 'Withdrawals are processed within 24 hours. Please ensure your UPI ID is correct.' },
  { label: 'Deposit Issue', message: 'If your deposit is not reflected, please share the transaction UTR number for verification.' },
  { label: 'Resolved', message: 'Your issue has been resolved. Is there anything else I can help you with?' },
];

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    phone: string;
    email: string;
  };
  unread_count?: number;
}

interface Attachment {
  url: string;
  type: 'image' | 'video';
  name: string;
}

interface Message {
  id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
  is_read: boolean;
  attachments?: Attachment[];
}

interface SupportReport {
  ticketId: string;
  userId: string;
  username: string;
  phone: string;
  email: string;
  issueCategory: string;
  issueSummary: string;
  proofAttached: {
    images: number;
    videos: number;
    hasScreenshot: boolean;
    hasUTR: boolean;
    attachmentUrls: string[];
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  aiRecommendation: string;
  extractedDetails: {
    transactionAmount?: string;
    utr?: string;
    gameType?: string;
    hackerName?: string;
    errorMessage?: string;
    deviceInfo?: string;
  };
  createdAt: string;
  lastMessageAt: string;
}

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'deposit':
    case 'withdrawal':
    case 'refund':
      return <Wallet className="w-4 h-4" />;
    case 'hacker_report':
      return <ShieldAlert className="w-4 h-4" />;
    case 'bug_glitch':
      return <Bug className="w-4 h-4" />;
    case 'game_issue':
      return <Gamepad2 className="w-4 h-4" />;
    default:
      return <MessageCircle className="w-4 h-4" />;
  }
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const config = {
    critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'CRITICAL' },
    high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'HIGH' },
    medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'MEDIUM' },
    low: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'LOW' },
  };
  const { color, label } = config[severity as keyof typeof config] || config.low;
  return <Badge className={`${color} border`}>{label}</Badge>;
};

const CategoryBadge = ({ category }: { category: string }) => {
  const labels: Record<string, string> = {
    deposit: '💰 Deposit Issue',
    withdrawal: '💳 Withdrawal',
    hacker_report: '🔫 Hacker Report',
    bug_glitch: '🐛 Bug/Glitch',
    game_issue: '🎮 Game Issue',
    account: '👤 Account',
    refund: '💵 Refund',
    other: '📋 Other'
  };
  return (
    <Badge variant="outline" className="gap-1">
      <CategoryIcon category={category} />
      {labels[category] || labels.other}
    </Badge>
  );
};

const AdminSupport = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Report state
  const [activeTab, setActiveTab] = useState<'report' | 'chat'>('report');
  const [report, setReport] = useState<SupportReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Cleanup stale tickets (no admin reply in 24h)
  const cleanupStaleTickets = async () => {
    setIsCleaningUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-stale-tickets');
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ 
        title: 'Cleanup Complete', 
        description: data.message || `Deleted ${data.deleted_count} stale tickets`,
      });
      
      // Refresh tickets list
      fetchTickets();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCleaningUp(false);
    }
  };
  // Request notification permission on mount
  useEffect(() => {
    const setupNotifications = async () => {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
    };
    setupNotifications();
  }, []);

  // Collect all images from messages for lightbox
  const allImages = useMemo(() => {
    const images: string[] = [];
    messages.forEach(msg => {
      if (msg.attachments) {
        msg.attachments.forEach(att => {
          if (att.type === 'image') {
            images.push(att.url);
          }
        });
      }
    });
    return images;
  }, [messages]);

  // Count all attachments
  const totalAttachments = useMemo(() => {
    let count = 0;
    messages.forEach(msg => {
      if (msg.attachments) {
        count += msg.attachments.length;
      }
    });
    return count;
  }, [messages]);

  const openLightbox = (imageUrl: string) => {
    const index = allImages.indexOf(imageUrl);
    setLightboxImages(allImages);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const downloadAllAttachments = useCallback(async () => {
    if (!selectedTicket) return;
    
    const attachments: Attachment[] = [];
    messages.forEach(msg => {
      if (msg.attachments && msg.attachments.length > 0) {
        attachments.push(...msg.attachments);
      }
    });

    if (attachments.length === 0) {
      toast({ title: 'No attachments', description: 'This ticket has no attachments to download.' });
      return;
    }

    setIsDownloadingZip(true);
    
    try {
      const zip = new JSZip();
      
      await Promise.all(
        attachments.map(async (att, index) => {
          try {
            const response = await fetch(att.url);
            const blob = await response.blob();
            const extension = att.type === 'image' ? (att.name.split('.').pop() || 'jpg') : (att.name.split('.').pop() || 'mp4');
            const filename = att.name || `attachment_${index + 1}.${extension}`;
            zip.file(filename, blob);
          } catch (err) {
            console.error('Failed to fetch attachment:', att.url, err);
          }
        })
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket_${selectedTicket.id.slice(0, 8)}_attachments.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Downloaded', description: `${attachments.length} attachments downloaded as zip.` });
    } catch (error) {
      console.error('Zip download error:', error);
      toast({ title: 'Error', description: 'Failed to create zip file.', variant: 'destructive' });
    }
    
    setIsDownloadingZip(false);
  }, [selectedTicket, messages]);

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  // Subscribe to new support messages for notifications
  useEffect(() => {
    const globalChannel = supabase
      .channel('admin-support-global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        async (payload) => {
          const rawMsg = payload.new as any;
          
          if (rawMsg.sender_type === 'user') {
            playNotificationSound();
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, phone')
              .eq('id', rawMsg.sender_id)
              .maybeSingle();
            
            const userName = profile?.username || profile?.phone || 'User';
            
            showBrowserNotification(
              'New Support Message',
              `${userName}: ${rawMsg.message.substring(0, 100)}${rawMsg.message.length > 100 ? '...' : ''}`,
              () => fetchTickets()
            );
            
            toast({
              title: '📩 New Support Message',
              description: `From ${userName}`,
            });
            
            fetchTickets();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, []);

  // Generate report when ticket is selected
  const generateReport = async (ticketId: string) => {
    setIsLoadingReport(true);
    setReport(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-support-report', {
        body: { ticketId }
      });
      
      if (error) throw error;
      if (data?.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
      toast({
        title: 'Report Generation Failed',
        description: 'Could not generate AI report. View raw chat instead.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      generateReport(selectedTicket.id);
      
      const channel = supabase
        .channel(`admin-support-${selectedTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `ticket_id=eq.${selectedTicket.id}`,
          },
          async (payload) => {
            const rawMsg = payload.new as Message;
            const resolvedAttachments = await resolveSupportAttachments(rawMsg.attachments);
            const newMsg = {
              ...rawMsg,
              attachments: resolvedAttachments,
            };
            setMessages((prev) => [...prev, newMsg]);
            // Refresh report when new message arrives
            generateReport(selectedTicket.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchTickets = async () => {
    setIsLoading(true);

    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data: ticketsData } = await query;

    if (ticketsData) {
      const ticketsWithInfo = await Promise.all(
        ticketsData.map(async (ticket) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, phone, email')
            .eq('id', ticket.user_id)
            .maybeSingle();

          const { count } = await supabase
            .from('support_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticket.id)
            .eq('sender_type', 'user')
            .eq('is_read', false);

          return {
            ...ticket,
            user: profile || undefined,
            unread_count: count || 0,
          };
        })
      );

      setTickets(ticketsWithInfo);
    }

    setIsLoading(false);
  };

  const useCannedResponse = (message: string) => {
    setNewMessage(message);
    setActiveTab('chat');
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    const parsedMessages = await Promise.all(
      (data || []).map(async (msg) => {
        const resolvedAttachments = await resolveSupportAttachments(msg.attachments);
        return {
          ...msg,
          sender_type: msg.sender_type as 'user' | 'admin',
          attachments: resolvedAttachments,
        };
      })
    );
    setMessages(parsedMessages);

    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('ticket_id', ticketId)
      .eq('sender_type', 'user')
      .eq('is_read', false);

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, unread_count: 0 } : t
      )
    );
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !user) return;

    setIsSending(true);

    const { error } = await supabase.from('support_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      sender_type: 'admin',
      message: newMessage.trim(),
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
      
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', selectedTicket.id);
        
        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
        fetchTickets();
      }
    }

    setIsSending(false);
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    await supabase
      .from('support_tickets')
      .update({ 
        status, 
        updated_at: new Date().toISOString(),
        closed_at: status === 'closed' || status === 'resolved' ? new Date().toISOString() : null
      })
      .eq('id', ticketId);

    fetchTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status });
    }

    toast({ title: 'Status Updated', description: `Ticket marked as ${status}` });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-500/20 text-yellow-500';
      case 'in_progress': return 'bg-blue-500/20 text-blue-500';
      case 'resolved': return 'bg-green-500/20 text-green-500';
      case 'closed': return 'bg-gray-500/20 text-gray-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            AI Support Reports
          </h1>
          <p className="text-muted-foreground">View AI-analyzed support tickets with structured reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
            onClick={cleanupStaleTickets}
            disabled={isCleaningUp}
          >
            {isCleaningUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Cleanup 24h+ Unanswered
          </Button>
          <Button
            variant={notificationsEnabled ? "outline" : "default"}
            size="sm"
            className="gap-2"
            onClick={async () => {
              const granted = await requestNotificationPermission();
              setNotificationsEnabled(granted);
              if (granted) {
                playNotificationSound();
                toast({ title: 'Notifications Enabled' });
              }
            }}
          >
            <Bell className={`w-4 h-4 ${notificationsEnabled ? 'text-green-500' : ''}`} />
            {notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-5rem)]">
        {/* Tickets List */}
        <Card className="glass-card lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tickets</CardTitle>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tickets found</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tickets.map((ticket) => (
                    <motion.button
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setActiveTab('report');
                      }}
                      className={`w-full p-4 text-left hover:bg-secondary/30 transition-colors ${
                        selectedTicket?.id === ticket.id ? 'bg-secondary/50' : ''
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm truncate">
                              {ticket.user?.username || ticket.user?.phone || 'Unknown User'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {ticket.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(ticket.status)} variant="secondary">
                              {ticket.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(ticket.updated_at), 'MMM d, HH:mm')}
                            </span>
                          </div>
                        </div>
                        {ticket.unread_count && ticket.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                            {ticket.unread_count}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Report/Chat Area */}
        <Card className="glass-card lg:col-span-2 flex flex-col">
          {selectedTicket ? (
            <>
              {/* Header */}
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedTicket.user?.username || selectedTicket.user?.phone || 'Unknown User'}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => {
                            setViewUserId(selectedTicket.user_id);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {selectedTicket.user?.phone && (
                          <span 
                            className="cursor-pointer hover:text-primary"
                            onClick={() => copyToClipboard(selectedTicket.user?.phone || '')}
                          >
                            📱 {selectedTicket.user.phone}
                          </span>
                        )}
                        <span 
                          className="text-xs cursor-pointer hover:text-primary"
                          onClick={() => copyToClipboard(selectedTicket.user_id)}
                        >
                          ID: {selectedTicket.user_id.slice(0, 8)}...
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalAttachments > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={downloadAllAttachments}
                        disabled={isDownloadingZip}
                      >
                        {isDownloadingZip ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                        Download All
                      </Button>
                    )}
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value) => updateTicketStatus(selectedTicket.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'report' | 'chat')} className="mt-3">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="report" className="gap-2">
                      <Bot className="w-4 h-4" />
                      AI Report
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Raw Chat
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              {/* Content */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'report' ? (
                    <motion.div
                      key="report"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="h-full"
                    >
                      <ScrollArea className="h-full p-4">
                        {isLoadingReport ? (
                          <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Generating AI Report...</p>
                          </div>
                        ) : report ? (
                          <div className="space-y-4">
                            {/* Severity & Category */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <SeverityBadge severity={report.severity} />
                              <CategoryBadge category={report.issueCategory} />
                              <Badge variant="outline" className="gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(report.createdAt), 'dd MMM yyyy, HH:mm')}
                              </Badge>
                            </div>

                            {/* Issue Summary */}
                            <Card className="bg-secondary/30 border-primary/20">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-primary" />
                                  Issue Summary
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm">{report.issueSummary}</p>
                              </CardContent>
                            </Card>

                            {/* AI Recommendation */}
                            <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Bot className="w-4 h-4 text-primary" />
                                  AI Recommendation
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm font-medium">{report.aiRecommendation}</p>
                              </CardContent>
                            </Card>

                            {/* Proof Attached */}
                            <Card className="bg-secondary/30">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Image className="w-4 h-4" />
                                  Proof Attached
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="flex items-center gap-1">
                                    <Image className="w-4 h-4 text-blue-400" />
                                    {report.proofAttached.images} Images
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Video className="w-4 h-4 text-purple-400" />
                                    {report.proofAttached.videos} Videos
                                  </span>
                                  {report.proofAttached.hasUTR && (
                                    <Badge variant="outline" className="text-green-400 border-green-400/30">
                                      ✓ UTR Found
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Show attachment thumbnails */}
                                {report.proofAttached.attachmentUrls.length > 0 && (
                                  <div className="flex gap-2 mt-3 flex-wrap">
                                    {allImages.slice(0, 4).map((url, idx) => (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt={`Proof ${idx + 1}`}
                                        className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-border"
                                        onClick={() => openLightbox(url)}
                                      />
                                    ))}
                                    {allImages.length > 4 && (
                                      <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center text-sm font-medium border border-border">
                                        +{allImages.length - 4}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Extracted Details */}
                            {(report.extractedDetails.utr || report.extractedDetails.transactionAmount || report.extractedDetails.gameType || report.extractedDetails.hackerName) && (
                              <Card className="bg-secondary/30">
                                <CardHeader className="pb-2">
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-between p-0 h-auto hover:bg-transparent"
                                    onClick={() => setExpandedDetails(!expandedDetails)}
                                  >
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <FileText className="w-4 h-4" />
                                      Extracted Details
                                    </CardTitle>
                                    {expandedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </Button>
                                </CardHeader>
                                <AnimatePresence>
                                  {expandedDetails && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                    >
                                      <CardContent className="grid grid-cols-2 gap-3 pt-0">
                                        {report.extractedDetails.utr && (
                                          <div className="p-2 bg-background/50 rounded-lg">
                                            <p className="text-xs text-muted-foreground">UTR Number</p>
                                            <p className="text-sm font-mono flex items-center gap-1">
                                              {report.extractedDetails.utr}
                                              <Copy 
                                                className="w-3 h-3 cursor-pointer hover:text-primary" 
                                                onClick={() => copyToClipboard(report.extractedDetails.utr || '')}
                                              />
                                            </p>
                                          </div>
                                        )}
                                        {report.extractedDetails.transactionAmount && (
                                          <div className="p-2 bg-background/50 rounded-lg">
                                            <p className="text-xs text-muted-foreground">Amount</p>
                                            <p className="text-sm font-bold text-green-400">
                                              {report.extractedDetails.transactionAmount}
                                            </p>
                                          </div>
                                        )}
                                        {report.extractedDetails.gameType && (
                                          <div className="p-2 bg-background/50 rounded-lg">
                                            <p className="text-xs text-muted-foreground">Game Type</p>
                                            <p className="text-sm">{report.extractedDetails.gameType}</p>
                                          </div>
                                        )}
                                        {report.extractedDetails.hackerName && (
                                          <div className="p-2 bg-background/50 rounded-lg">
                                            <p className="text-xs text-muted-foreground">Reported Player</p>
                                            <p className="text-sm font-medium text-red-400">
                                              {report.extractedDetails.hackerName}
                                            </p>
                                          </div>
                                        )}
                                      </CardContent>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </Card>
                            )}

                            {/* Quick Actions */}
                            <div className="flex gap-2 flex-wrap">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-1"
                                onClick={() => generateReport(selectedTicket.id)}
                              >
                                <RefreshCw className="w-4 h-4" />
                                Refresh Report
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-1"
                                onClick={() => setActiveTab('chat')}
                              >
                                <MessageCircle className="w-4 h-4" />
                                View Full Chat
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <AlertTriangle className="w-8 h-8 text-yellow-500" />
                            <p className="text-sm text-muted-foreground">No report available</p>
                            <Button variant="outline" size="sm" onClick={() => generateReport(selectedTicket.id)}>
                              Generate Report
                            </Button>
                          </div>
                        )}
                      </ScrollArea>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="h-full flex flex-col"
                    >
                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                  msg.sender_type === 'admin'
                                    ? 'bg-primary text-primary-foreground rounded-br-md'
                                    : 'bg-secondary text-foreground rounded-bl-md'
                                }`}
                              >
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="space-y-2 mb-2">
                                    {msg.attachments.map((att, idx) => (
                                      <div key={idx}>
                                        {att.type === 'image' ? (
                                          <img 
                                            src={att.url} 
                                            alt={att.name}
                                            className="rounded-lg max-w-full cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => openLightbox(att.url)}
                                          />
                                        ) : (
                                          <video 
                                            src={att.url} 
                                            controls 
                                            className="rounded-lg max-w-full"
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {msg.message !== '[Attachments]' && (
                                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                )}
                                <p className={`text-[10px] mt-1 ${msg.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  {format(new Date(msg.created_at), 'HH:mm')}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Input */}
                      <div className="p-4 border-t border-border space-y-2">
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <Zap className="w-4 h-4" />
                                Quick Replies
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-2" align="start">
                              <div className="grid gap-1">
                                {CANNED_RESPONSES.map((response, idx) => (
                                  <Button
                                    key={idx}
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start text-left h-auto py-2 px-3"
                                    onClick={() => useCannedResponse(response.message)}
                                  >
                                    <div>
                                      <p className="font-medium text-xs text-primary">{response.label}</p>
                                      <p className="text-xs text-muted-foreground truncate max-w-60">{response.message}</p>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <form onSubmit={sendMessage} className="flex gap-2">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your reply..."
                            className="flex-1"
                            disabled={isSending}
                          />
                          <Button type="submit" disabled={isSending || !newMessage.trim()}>
                            {isSending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">Select a ticket to view AI report</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <UserDetailDialog
        isOpen={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        userId={viewUserId}
      />

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};

export default AdminSupport;
