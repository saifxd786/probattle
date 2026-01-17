import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Image, Video, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

const MAX_IMAGES = 5;
const MAX_VIDEO_SIZE = 3 * 1024 * 1024 * 1024; // 3GB

const SupportChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch or create active ticket
  useEffect(() => {
    if (user && isOpen) {
      fetchActiveTicket();
    }
  }, [user, isOpen]);

  // Subscribe to new messages
  useEffect(() => {
    if (!ticket) return;

    const channel = supabase
      .channel(`support-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          // Mark as read if chat is open
          if (isOpen && newMsg.sender_type === 'admin') {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket, isOpen]);

  // Check for unread messages
  useEffect(() => {
    if (user) {
      checkUnreadMessages();
    }
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkUnreadMessages = async () => {
    if (!user) return;

    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['open', 'in_progress']);

    if (!tickets || tickets.length === 0) return;

    const { count } = await supabase
      .from('support_messages')
      .select('*', { count: 'exact', head: true })
      .in('ticket_id', tickets.map(t => t.id))
      .eq('sender_type', 'admin')
      .eq('is_read', false);

    setUnreadCount(count || 0);
  };

  const fetchActiveTicket = async () => {
    if (!user) return;
    setIsLoading(true);

    // Find active ticket
    const { data: existingTicket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingTicket) {
      setTicket(existingTicket);
      await fetchMessages(existingTicket.id);
    }

    setIsLoading(false);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    // Cast properly since attachments is jsonb
    const parsedMessages = (data || []).map(msg => ({
      ...msg,
      sender_type: msg.sender_type as 'user' | 'admin',
      attachments: (msg.attachments as unknown as Attachment[]) || [],
    }));
    setMessages(parsedMessages);
    markMessagesAsRead();
  };

  const markMessagesAsRead = async () => {
    if (!ticket) return;

    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('ticket_id', ticket.id)
      .eq('sender_type', 'admin')
      .eq('is_read', false);

    setUnreadCount(0);
  };

  const createTicket = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: 'Support Chat',
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to start chat. Please try again.',
        variant: 'destructive',
      });
      return null;
    }

    setTicket(data);
    return data;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageCount = attachments.filter(f => f.type.startsWith('image/')).length;
    const newImages = files.filter(f => f.type.startsWith('image/'));
    
    if (imageCount + newImages.length > MAX_IMAGES) {
      toast({
        title: 'Limit Exceeded',
        description: `Maximum ${MAX_IMAGES} images allowed`,
        variant: 'destructive',
      });
      return;
    }

    setAttachments(prev => [...prev, ...newImages]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const videos = files.filter(f => f.type.startsWith('video/'));
    
    for (const video of videos) {
      if (video.size > MAX_VIDEO_SIZE) {
        toast({
          title: 'File Too Large',
          description: 'Video must be under 3GB',
          variant: 'destructive',
        });
        return;
      }
    }

    // Only allow 1 video per message
    if (attachments.some(f => f.type.startsWith('video/'))) {
      toast({
        title: 'Limit Exceeded',
        description: 'Only 1 video per message allowed',
        variant: 'destructive',
      });
      return;
    }

    setAttachments(prev => [...prev, ...videos.slice(0, 1)]);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<Attachment[]> => {
    if (!user || attachments.length === 0) return [];

    const uploaded: Attachment[] = [];
    
    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(fileName);

      uploaded.push({
        url: urlData.publicUrl,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name,
      });
    }

    return uploaded;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || !user) return;

    setIsSending(true);
    setIsUploading(attachments.length > 0);

    let currentTicket = ticket;
    if (!currentTicket) {
      currentTicket = await createTicket();
      if (!currentTicket) {
        setIsSending(false);
        setIsUploading(false);
        return;
      }
    }

    // Upload attachments
    let uploadedAttachments: Attachment[] = [];
    if (attachments.length > 0) {
      uploadedAttachments = await uploadAttachments();
    }

    const messageData: {
      ticket_id: string;
      sender_id: string;
      sender_type: string;
      message: string;
      attachments?: Attachment[];
    } = {
      ticket_id: currentTicket.id,
      sender_id: user.id,
      sender_type: 'user',
      message: newMessage.trim() || (uploadedAttachments.length > 0 ? '[Attachments]' : ''),
    };

    if (uploadedAttachments.length > 0) {
      (messageData as Record<string, unknown>).attachments = uploadedAttachments;
    }

    const { error } = await supabase.from('support_messages').insert(messageData as never);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
      setAttachments([]);
    }

    setIsSending(false);
    setIsUploading(false);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Chat Button in Header - Small Icon */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
        title="Live Support"
      >
        <MessageCircle className="w-5 h-5 text-primary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleImageSelect}
      />
      <input
        type="file"
        ref={videoInputRef}
        className="hidden"
        accept="video/*"
        onChange={handleVideoSelect}
      />

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed top-16 right-4 z-50 w-80 sm:w-96 h-[500px] max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm">Support Chat</h3>
                  <p className="text-xs text-muted-foreground">We typically reply in minutes</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Start a conversation with our support team
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.sender_type === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary text-foreground rounded-bl-md'
                        }`}
                      >
                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {(msg.attachments as Attachment[]).map((att, idx) => (
                              <div key={idx}>
                                {att.type === 'image' ? (
                                  <img 
                                    src={att.url} 
                                    alt={att.name}
                                    className="rounded-lg max-w-full cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(att.url, '_blank')}
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
                        <p className={`text-[10px] mt-1 ${msg.sender_type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Attachment Preview */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-secondary/20">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="relative group">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={file.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center">
                          <Video className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-border bg-secondary/20">
              <div className="flex gap-2 items-end">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isSending}
                  >
                    <Image className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isSending}
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-background/50"
                  disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={isSending || (!newMessage.trim() && attachments.length === 0)}>
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {isUploading && (
                <p className="text-xs text-muted-foreground mt-2">Uploading files...</p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportChat;