import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Loader2, User, Clock, CheckCircle, AlertCircle, Zap, Eye, Download, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import UserDetailDialog from '@/components/admin/UserDetailDialog';
import ImageLightbox from '@/components/ImageLightbox';
import JSZip from 'jszip';
import { resolveSupportAttachments, SupportAttachmentResolved } from '@/utils/supportAttachments';

// Canned responses for quick replies
const CANNED_RESPONSES = [
  { label: 'Greeting', message: 'Hello! Thank you for contacting ProBattle support. How can I help you today?' },
  { label: 'Processing', message: 'Your request is being processed. Please wait 24-48 hours for resolution.' },
  { label: 'Withdrawal', message: 'Withdrawals are processed within 24 hours. Please ensure your UPI ID is correct.' },
  { label: 'Deposit Issue', message: 'If your deposit is not reflected, please share the transaction UTR number for verification.' },
  { label: 'Game Rules', message: 'Please check our Rules & FAQs section for detailed game rules and guidelines.' },
  { label: 'Account Ban', message: 'Your account has been reviewed. Please ensure you follow our fair play policies.' },
  { label: 'Resolved', message: 'Your issue has been resolved. Is there anything else I can help you with?' },
  { label: 'Closing', message: 'Thank you for contacting us. If you have any more questions, feel free to reach out!' },
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

  // Count all attachments (images + videos) for download button
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

  // Download all attachments as zip
  const downloadAllAttachments = useCallback(async () => {
    if (!selectedTicket) return;
    
    // Collect all attachments from messages
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
      
      // Download each attachment and add to zip
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

      // Generate zip and download
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

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      // Subscribe to new messages
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
            // Resolve attachments for realtime messages
            const resolvedAttachments = await resolveSupportAttachments(rawMsg.attachments);
            const newMsg = {
              ...rawMsg,
              attachments: resolvedAttachments,
            };
            setMessages((prev) => [...prev, newMsg]);
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
      // Fetch user info and unread counts for each ticket
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
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    // Resolve attachments with signed URLs
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

    // Mark user messages as read
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('ticket_id', ticketId)
      .eq('sender_type', 'user')
      .eq('is_read', false);

    // Update ticket list
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
      
      // Update ticket status to in_progress if it was open
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

  return (
    <div className="p-6 h-[calc(100vh-4rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Support Chat</h1>
        <p className="text-muted-foreground">Manage customer support tickets</p>
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
                      onClick={() => setSelectedTicket(ticket)}
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

        {/* Chat Area */}
        <Card className="glass-card lg:col-span-2 flex flex-col">
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedTicket.user?.username || selectedTicket.user?.phone || 'Unknown User'}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedTicket.user?.phone}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setViewUserId(selectedTicket.user_id);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Download all attachments button */}
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
                        {isDownloadingZip ? 'Zipping...' : 'Download All'}
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
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
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
                          {/* Attachments */}
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
              </CardContent>

              {/* Input */}
              <div className="p-4 border-t border-border space-y-2">
                {/* Canned Responses */}
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">Select a ticket to view conversation</p>
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

      {/* Image Lightbox */}
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
