import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Loader2, Image, Video, Trash2, 
  Mic, MicOff, Bot, Gamepad2, Wallet, HelpCircle, ChevronRight,
  Sparkles, Volume2, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ImageLightbox from '@/components/ImageLightbox';
import { uploadResumableToBucket } from '@/utils/resumableUpload';
import { SUPPORT_ATTACHMENTS_BUCKET } from '@/utils/supportAttachments';
import ReactMarkdown from 'react-markdown';
import heroBanner from '@/assets/hero-banner.jpg';
import ludoCard from '@/assets/ludo-card.jpg';
import minesCard from '@/assets/mines-card.jpg';
import thimbleCard from '@/assets/thimble-card.jpg';
import bgmiCard from '@/assets/bgmi-card.jpg';

interface Attachment {
  url: string;
  type: 'image' | 'video';
  name: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: Date;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

// Problem categories
const GAME_CATEGORIES = [
  { id: 'ludo', name: 'Ludo', icon: '🎲', color: 'from-red-500 to-orange-500' },
  { id: 'mines', name: 'Mines', icon: '💣', color: 'from-yellow-500 to-amber-500' },
  { id: 'thimble', name: 'Thimble', icon: '🎯', color: 'from-purple-500 to-pink-500' },
  { id: 'bgmi', name: 'BGMI Tournament', icon: '🔫', color: 'from-green-500 to-emerald-500' },
];

const ISSUE_CATEGORIES = [
  { id: 'deposit', name: 'Deposit Issue', icon: <Wallet className="w-5 h-5" />, color: 'from-green-500 to-emerald-500' },
  { id: 'withdrawal', name: 'Withdrawal Issue', icon: <Wallet className="w-5 h-5" />, color: 'from-blue-500 to-cyan-500' },
  { id: 'game', name: 'Game Problem', icon: <Gamepad2 className="w-5 h-5" />, color: 'from-purple-500 to-pink-500' },
  { id: 'account', name: 'Account Issue', icon: <HelpCircle className="w-5 h-5" />, color: 'from-orange-500 to-red-500' },
  { id: 'other', name: 'Other', icon: <MessageCircle className="w-5 h-5" />, color: 'from-gray-500 to-slate-500' },
];


const MAX_IMAGES = 5;
const MAX_VIDEO_SIZE = 3 * 1024 * 1024 * 1024; // 3GB

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

const SupportChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'category' | 'game' | 'chat'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  
  // AI Chat state
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  // Inactivity timer
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice input
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Image upload
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Inactivity auto-reset effect
  useEffect(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
    }

    // Only run timer if there are messages
    if (aiMessages.length > 0) {
      inactivityTimerRef.current = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          // Reset chat after 1 hour of inactivity
          resetChat();
          toast({
            title: 'Chat Reset',
            description: '1 hour of inactivity. Chat has been reset.',
          });
        }
      }, 60000); // Check every minute
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [aiMessages.length, lastActivityTime]);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'hi-IN'; // Support Hindi, will auto-detect others
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setNewMessage(transcript);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: 'Voice Error',
          description: 'Could not recognize speech. Please try again.',
          variant: 'destructive',
        });
      };
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [aiMessages, isAiTyping]);

  const toggleListening = () => {
    if (!speechSupported) {
      toast({
        title: 'Not Supported',
        description: 'Voice input is not supported in your browser.',
        variant: 'destructive',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const selectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'game') {
      setStep('game');
    } else {
      setStep('chat');
      // Add initial AI greeting
      addAiGreeting(categoryId);
    }
  };

  const selectGame = (gameId: string) => {
    setSelectedGame(gameId);
    setStep('chat');
    addAiGreeting('game', gameId);
  };

  const addAiGreeting = (category: string, game?: string) => {
    const greetings: Record<string, string> = {
      deposit: "🙏 Namaste! Main ProBattle AI Support hoon.\n\nAapko deposit mein koi problem aa rahi hai? Please apni issue batao ya screenshot share karo - main turant help karunga!\n\n**Common deposit issues:**\n- Payment deducted but not credited\n- UPI transaction failed\n- Minimum deposit amount query",
      withdrawal: "🙏 Namaste! Withdrawal mein help ke liye main yahan hoon.\n\nAapki withdrawal request mein kya issue hai? UTR number ya transaction screenshot share karein toh jaldi solve ho jayega!\n\n**Note:** Withdrawals 24-48 hours mein process hote hain.",
      account: "🙏 Hello! Account related help ke liye batao kya problem hai?\n\n- Login issue?\n- Password reset?\n- Profile update?\n- Account verification?\n\nMain ready hoon help karne ke liye! 💪",
      other: "🙏 Namaste! Main aapki kisi bhi query mein help kar sakta hoon.\n\nBatao kya help chahiye? Screenshots bhi share kar sakte ho agar koi error aa raha ho!",
    };

    let greeting = greetings[category] || greetings.other;
    
    if (game) {
      const gameGreetings: Record<string, string> = {
        ludo: "🎲 **Ludo Game Support**\n\nLudo mein kya issue aa raha hai?\n- Match not starting?\n- Sync problem with friend?\n- Entry fee issue?\n- Game stuck?\n\nBatao, main solve karunga! Screenshot bhi bhej sakte ho.",
        mines: "💣 **Mines Game Support**\n\nMines mein kya problem hai?\n- Game freeze?\n- Payout not credited?\n- Multiplier issue?\n\nDetails share karo with screenshots if possible!",
        thimble: "🎯 **Thimble Game Support**\n\nThimble game mein help chahiye?\n- Animation lag?\n- Result not showing?\n- Balance issue?\n\nMain ready hoon help karne ke liye!",
        bgmi: "🔫 **BGMI Tournament Support**\n\nTournament mein kya issue hai?\n- Room ID/Password nahi mila?\n- Registration problem?\n- Prize money not received?\n\nMatch details batao, main check karta hoon!",
      };
      greeting = gameGreetings[game] || greeting;
    }

    setAiMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
    }]);
    setLastActivityTime(Date.now()); // Start activity timer
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !pendingImage) || isAiTyping) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage.trim() || (pendingImage ? 'Please check this image' : ''),
      image: pendingImage || undefined,
      timestamp: new Date(),
    };

    setAiMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setPendingImage(null);
    setIsAiTyping(true);
    setLastActivityTime(Date.now()); // Update activity time

    try {
      // Build messages for API
      const messagesForApi = aiMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        image: msg.image,
      }));
      messagesForApi.push({
        role: userMessage.role,
        content: userMessage.content,
        image: userMessage.image,
      });

      const { data, error } = await supabase.functions.invoke('ai-support-chat', {
        body: {
          messages: messagesForApi,
          category: selectedCategory || 'other',
          subCategory: selectedGame || selectedCategory || 'general',
          language: 'auto', // Auto-detect
          hasImage: !!userMessage.image,
          userId: user?.id, // Pass user ID for ticket creation
        },
      });

      if (error) throw error;

      const aiReply: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Sorry, I could not process that. Please try again.',
        timestamp: new Date(),
      };

      setAiMessages(prev => [...prev, aiReply]);

      // Show notification if issue was escalated to admin
      if (data.escalated) {
        toast({
          title: '🎫 Ticket Created',
          description: 'Aapki problem admin team ko report kar di gayi hai. Jaldi response milega!',
        });
      }
    } catch (error) {
      console.error('AI chat error:', error);
      toast({
        title: 'Error',
        description: 'Could not get AI response. Please try again.',
        variant: 'destructive',
      });
      
      // Add fallback message
      setAiMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, main abhi respond nahi kar pa raha. Please thodi der baad try karein ya admin se contact karein.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const resetChat = () => {
    setStep('category');
    setSelectedCategory(null);
    setSelectedGame(null);
    setAiMessages([]);
    setNewMessage('');
    setPendingImage(null);
    setLastActivityTime(Date.now()); // Reset activity time
  };

  const openLightbox = (imageUrl: string) => {
    const images = aiMessages.filter(m => m.image).map(m => m.image!);
    const index = images.indexOf(imageUrl);
    setLightboxImages(images);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
        title="AI Support"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-primary" />
          <Sparkles className="w-2.5 h-2.5 text-yellow-400 absolute -top-1 -right-1" />
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageSelect}
      />

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed top-16 right-4 z-50 w-[340px] sm:w-[400px] h-[550px] max-h-[75vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                {step !== 'category' && (
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={resetChat}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm flex items-center gap-1">
                    ProBattle AI Support
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {step === 'category' ? 'Select your issue type' : 
                     step === 'game' ? 'Select game' : 
                     'Online • Instant replies'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Category Selection */}
            <AnimatePresence mode="wait">
              {step === 'category' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 p-4 overflow-auto"
                >
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    🙏 Namaste! Kaise madad kar sakta hoon?
                  </p>
                  <div className="space-y-2">
                    {ISSUE_CATEGORIES.map((category) => (
                      <motion.button
                        key={category.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectCategory(category.id)}
                        className={`w-full p-3 rounded-xl bg-gradient-to-r ${category.color} text-white flex items-center justify-between shadow-md hover:shadow-lg transition-shadow`}
                      >
                        <div className="flex items-center gap-3">
                          {category.icon}
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <ChevronRight className="w-5 h-5" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}


              {/* Game Selection */}
              {step === 'game' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 p-4 overflow-auto"
                >
                  {/* Hero Banner */}
                  <div className="relative mb-4 rounded-xl overflow-hidden">
                    <img 
                      src={heroBanner} 
                      alt="ProBattle Gaming" 
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <h4 className="font-display font-bold text-white text-sm drop-shadow-lg">
                        Game Support
                      </h4>
                      <p className="text-[10px] text-white/80">Select your game for help</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    🎮 Konse game mein problem hai?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Ludo */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectGame('ludo')}
                      className="relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow aspect-[4/3]"
                    >
                      <img src={ludoCard} alt="Ludo" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <span className="font-bold text-base drop-shadow-lg">🎲 Ludo</span>
                      </div>
                    </motion.button>

                    {/* Mines */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectGame('mines')}
                      className="relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow aspect-[4/3]"
                    >
                      <img src={minesCard} alt="Mines" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <span className="font-bold text-base drop-shadow-lg">💣 Mines</span>
                      </div>
                    </motion.button>

                    {/* Thimble */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectGame('thimble')}
                      className="relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow aspect-[4/3]"
                    >
                      <img src={thimbleCard} alt="Thimble" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <span className="font-bold text-base drop-shadow-lg">🎯 Thimble</span>
                      </div>
                    </motion.button>

                    {/* BGMI */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectGame('bgmi')}
                      className="relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow aspect-[4/3]"
                    >
                      <img src={bgmiCard} alt="BGMI" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <span className="font-bold text-base drop-shadow-lg">🔫 BGMI</span>
                      </div>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Chat Interface */}
              {step === 'chat' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                    <div className="space-y-3">
                      {aiMessages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-secondary text-foreground rounded-bl-md'
                            }`}
                          >
                            {msg.role === 'assistant' && (
                              <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-border/30">
                                <Bot className="w-3 h-3" />
                                <span className="text-[10px] font-medium opacity-70">AI Assistant</span>
                              </div>
                            )}
                            
                            {/* Image */}
                            {msg.image && (
                              <div className="mb-2">
                                <img
                                  src={msg.image}
                                  alt="Uploaded"
                                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                                  onClick={() => openLightbox(msg.image!)}
                                />
                              </div>
                            )}
                            
                            {/* Message with Markdown */}
                            <div className={`text-sm ${msg.role === 'assistant' ? 'prose prose-sm dark:prose-invert max-w-none' : ''}`}>
                              {msg.role === 'assistant' ? (
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              ) : (
                                <p>{msg.content}</p>
                              )}
                            </div>
                            
                            <span className="text-[10px] opacity-50 mt-1 block">
                              {format(msg.timestamp, 'HH:mm')}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                      
                      {/* AI Typing Indicator */}
                      {isAiTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-start"
                        >
                          <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              <span className="text-xs text-muted-foreground">AI typing...</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Pending Image Preview */}
                  {pendingImage && (
                    <div className="px-3 py-2 border-t border-border bg-secondary/30">
                      <div className="relative inline-block">
                        <img
                          src={pendingImage}
                          alt="To send"
                          className="h-16 rounded-lg"
                        />
                        <button
                          onClick={() => setPendingImage(null)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Input Area */}
                  <form onSubmit={sendMessage} className="p-3 border-t border-border bg-secondary/20">
                    <div className="flex items-center gap-2">
                      {/* Voice Input */}
                      <Button
                        type="button"
                        variant={isListening ? "destructive" : "outline"}
                        size="icon"
                        className="shrink-0 w-9 h-9"
                        onClick={toggleListening}
                      >
                        {isListening ? (
                          <MicOff className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Image Upload */}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 w-9 h-9"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Image className="w-4 h-4" />
                      </Button>

                      {/* Text Input */}
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isListening ? "🎤 Listening..." : "Type or speak..."}
                        className="flex-1 bg-background"
                        disabled={isAiTyping}
                      />

                      {/* Send Button */}
                      <Button
                        type="submit"
                        size="icon"
                        className="shrink-0 w-9 h-9 bg-primary"
                        disabled={(!newMessage.trim() && !pendingImage) || isAiTyping}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {isListening && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 flex items-center justify-center gap-2 text-xs text-primary"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                        <span>Listening... Speak now</span>
                      </motion.div>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

export default SupportChat;
