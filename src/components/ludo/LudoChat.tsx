import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Smile, VolumeX, Volume2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  isEmoji: boolean;
  timestamp: Date;
}

interface LudoChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, isEmoji: boolean) => void;
  currentUserId: string;
  playerColor: string;
}

const QUICK_EMOJIS = ['👋', '😂', '😢', '🎉', '👍', '👎', '😎', '🔥', '💪', '🤔', '😡', '❤️'];

const QUICK_MESSAGES = [
  'Nice move!',
  'Good luck!',
  'Hurry up!',
  'Well played!',
  'Oops!',
  'Thanks!',
];

const COLORS = {
  red: { 
    main: '#D32F2F', 
    gradient: 'linear-gradient(135deg, #EF5350 0%, #C62828 50%, #8B0000 100%)',
    glow: 'rgba(211,47,47,0.4)'
  },
  green: { 
    main: '#388E3C', 
    gradient: 'linear-gradient(135deg, #66BB6A 0%, #388E3C 50%, #1B5E20 100%)',
    glow: 'rgba(56,142,60,0.4)'
  },
  yellow: { 
    main: '#FBC02D', 
    gradient: 'linear-gradient(135deg, #FFEE58 0%, #FBC02D 50%, #F57F17 100%)',
    glow: 'rgba(251,192,45,0.4)'
  },
  blue: { 
    main: '#1976D2', 
    gradient: 'linear-gradient(135deg, #42A5F5 0%, #1976D2 50%, #0D47A1 100%)',
    glow: 'rgba(25,118,210,0.4)'
  }
};

const LudoChat = ({ messages, onSendMessage, currentUserId, playerColor }: LudoChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('ludo-chat-muted');
    return saved === 'true';
  });
  const [emojiOnlyMode, setEmojiOnlyMode] = useState(() => {
    const saved = localStorage.getItem('ludo-chat-emoji-only');
    return saved === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('ludo-chat-muted', String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('ludo-chat-emoji-only', String(emojiOnlyMode));
  }, [emojiOnlyMode]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Track unread messages when chat is closed (unless muted)
  useEffect(() => {
    if (!isOpen && messages.length > 0 && !isMuted) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== currentUserId) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages.length, isOpen, currentUserId, isMuted]);

  const handleSend = () => {
    if (inputValue.trim() && !emojiOnlyMode) {
      onSendMessage(inputValue.trim(), false);
      setInputValue('');
    }
  };

  const handleEmojiClick = (emoji: string) => {
    onSendMessage(emoji, true);
    setShowEmojis(false);
  };

  const handleQuickMessage = (msg: string) => {
    if (!emojiOnlyMode) {
      onSendMessage(msg, false);
    }
  };

  const colorConfig = COLORS[playerColor as keyof typeof COLORS] || COLORS.red;

  // Filter messages in muted mode (hide opponent's non-emoji messages)
  const displayMessages = isMuted 
    ? messages.filter(msg => msg.senderId === currentUserId || msg.isEmoji)
    : messages;

  return (
    <>
      {/* Premium Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-50 p-3.5 rounded-2xl"
        style={{
          background: colorConfig.gradient,
          boxShadow: `0 6px 25px ${colorConfig.glow}, 0 3px 10px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,255,255,0.3)`,
          border: '2px solid rgba(255,255,255,0.2)',
          opacity: isMuted ? 0.7 : 1,
        }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white drop-shadow" />
        ) : (
          <MessageCircle className="w-5 h-5 text-white drop-shadow" />
        )}
        
        {/* Unread badge */}
        {unreadCount > 0 && !isMuted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #EF5350 0%, #C62828 100%)',
              boxShadow: '0 3px 10px rgba(239,83,80,0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          >
            <span className="text-white text-[10px] font-black">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </motion.div>
        )}
        
        {/* Pulse ring animation */}
        {unreadCount > 0 && !isMuted && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ border: `2px solid ${colorConfig.main}` }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Premium Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-4 left-4 z-50 max-w-sm ml-auto overflow-hidden"
            style={{ 
              maxHeight: '70vh',
              borderRadius: 20,
              background: 'linear-gradient(180deg, rgba(30,28,25,0.98) 0%, rgba(20,18,15,0.99) 100%)',
              boxShadow: `0 0 40px ${colorConfig.glow}, 0 20px 50px rgba(0,0,0,0.5)`,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Premium Header */}
            <div 
              className="p-3.5 flex items-center justify-between relative overflow-hidden"
              style={{ background: colorConfig.gradient }}
            >
              {/* Header shimmer */}
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              
              <div className="flex items-center gap-2.5 relative">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ 
                    background: 'rgba(255,255,255,0.2)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)'
                  }}
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-white text-sm tracking-wide">Game Chat</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-white/70">Live</span>
                  </div>
                </div>
              </div>
              
              <motion.button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 rounded-lg transition-colors relative"
                style={{ background: 'rgba(0,0,0,0.2)' }}
                whileHover={{ scale: 1.1, background: 'rgba(0,0,0,0.4)' }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-4 h-4 text-white" />
              </motion.button>
            </div>

            {/* Premium Settings Bar */}
            <div 
              className="px-3.5 py-2.5 flex items-center justify-between gap-2"
              style={{
                background: 'linear-gradient(180deg, rgba(50,45,40,0.6) 0%, rgba(40,35,30,0.4) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <motion.button
                onClick={() => setIsMuted(!isMuted)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: isMuted 
                    ? 'linear-gradient(135deg, rgba(239,83,80,0.3) 0%, rgba(198,40,40,0.3) 100%)'
                    : 'rgba(255,255,255,0.08)',
                  border: isMuted ? '1px solid rgba(239,83,80,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: isMuted ? '#EF5350' : 'rgba(255,255,255,0.6)',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isMuted ? 'Muted' : 'Mute'}
              </motion.button>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/50 font-medium">Emoji Only</span>
                <Switch
                  checked={emojiOnlyMode}
                  onCheckedChange={setEmojiOnlyMode}
                  className="scale-80"
                />
              </div>
            </div>

            {/* Muted Notice */}
            <AnimatePresence>
              {isMuted && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3.5 py-2"
                  style={{
                    background: 'linear-gradient(90deg, rgba(239,83,80,0.1) 0%, rgba(239,83,80,0.05) 100%)',
                    borderBottom: '1px solid rgba(239,83,80,0.2)',
                  }}
                >
                  <p className="text-[11px] text-red-400/80 text-center font-medium">
                    🔇 Chat muted - Only emoji reactions visible
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium Messages Area */}
            <div 
              className="h-44 overflow-y-auto p-3.5 space-y-2.5"
              style={{
                background: 'linear-gradient(180deg, rgba(25,22,18,0.5) 0%, rgba(20,18,15,0.3) 100%)',
              }}
            >
              {displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div 
                    className="p-3 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <Sparkles className="w-6 h-6 text-white/30" />
                  </div>
                  <p className="text-center text-white/40 text-xs font-medium">
                    {isMuted ? 'Emoji reactions only 👋' : 'No messages yet. Say hi! 👋'}
                  </p>
                </div>
              ) : (
                displayMessages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      'flex',
                      msg.senderId === currentUserId ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className="max-w-[80%] rounded-2xl px-3.5 py-2 relative overflow-hidden"
                      style={{
                        background: msg.senderId === currentUserId
                          ? colorConfig.gradient
                          : 'linear-gradient(135deg, rgba(60,55,50,0.8) 0%, rgba(45,40,35,0.9) 100%)',
                        boxShadow: msg.senderId === currentUserId
                          ? `0 4px 15px ${colorConfig.glow}`
                          : '0 2px 8px rgba(0,0,0,0.2)',
                        border: msg.senderId === currentUserId
                          ? '1px solid rgba(255,255,255,0.2)'
                          : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {msg.senderId !== currentUserId && (
                        <p className="text-[10px] text-white/50 mb-0.5 font-medium">{msg.senderName}</p>
                      )}
                      <p className={cn(
                        'text-white',
                        msg.isEmoji ? 'text-2xl' : 'text-sm'
                      )}>
                        {msg.message}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Premium Quick Emojis */}
            <div className="px-3.5 pb-2.5">
              <div 
                className="grid grid-cols-6 gap-1 p-2.5 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(50,45,40,0.5) 0%, rgba(40,35,30,0.4) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-xl p-1.5 rounded-lg transition-colors"
                    style={{ background: 'transparent' }}
                    whileHover={{ 
                      scale: 1.25, 
                      background: 'rgba(255,255,255,0.1)',
                    }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Premium Quick Messages */}
            <AnimatePresence>
              {!emojiOnlyMode && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3.5 pb-2.5"
                >
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {QUICK_MESSAGES.map((msg) => (
                      <motion.button
                        key={msg}
                        onClick={() => handleQuickMessage(msg)}
                        className="shrink-0 px-3 py-1.5 text-[11px] rounded-full font-medium text-white/80 transition-all"
                        style={{
                          background: 'linear-gradient(135deg, rgba(60,55,50,0.6) 0%, rgba(50,45,40,0.5) 100%)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        whileHover={{ 
                          scale: 1.05,
                          background: 'linear-gradient(135deg, rgba(80,75,70,0.7) 0%, rgba(60,55,50,0.6) 100%)',
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {msg}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium Input Area */}
            <AnimatePresence>
              {!emojiOnlyMode && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="p-3.5 flex gap-2.5"
                  style={{
                    background: 'linear-gradient(180deg, rgba(40,35,30,0.5) 0%, rgba(30,25,20,0.6) 100%)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <motion.button
                    onClick={() => setShowEmojis(!showEmojis)}
                    className="p-2.5 rounded-xl transition-all"
                    style={{
                      background: showEmojis 
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Smile className={cn(
                      'w-4 h-4 transition-colors',
                      showEmojis ? 'text-white' : 'text-white/50'
                    )} />
                  </motion.button>
                  
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 h-10 text-sm rounded-xl border-0"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                    }}
                  />
                  
                  <motion.button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="p-2.5 rounded-xl transition-all disabled:opacity-40"
                    style={{
                      background: inputValue.trim() ? colorConfig.gradient : 'rgba(255,255,255,0.08)',
                      boxShadow: inputValue.trim() ? `0 4px 15px ${colorConfig.glow}` : 'none',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                    whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                    whileTap={inputValue.trim() ? { scale: 0.95 } : {}}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LudoChat;
