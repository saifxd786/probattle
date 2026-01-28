import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
  red: { main: '#D32F2F', bg: 'from-red-600 to-red-800' },
  green: { main: '#388E3C', bg: 'from-green-600 to-green-800' },
  yellow: { main: '#FBC02D', bg: 'from-yellow-500 to-yellow-700' },
  blue: { main: '#1976D2', bg: 'from-blue-600 to-blue-800' }
};

const LudoChat = ({ messages, onSendMessage, currentUserId, playerColor }: LudoChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== currentUserId) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages.length, isOpen, currentUserId]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim(), false);
      setInputValue('');
    }
  };

  const handleEmojiClick = (emoji: string) => {
    onSendMessage(emoji, true);
    setShowEmojis(false);
  };

  const handleQuickMessage = (msg: string) => {
    onSendMessage(msg, false);
  };

  const colorConfig = COLORS[playerColor as keyof typeof COLORS] || COLORS.red;

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg',
          'bg-gradient-to-br',
          colorConfig.bg
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <MessageCircle className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-20 right-4 left-4 z-50 max-w-sm ml-auto bg-black/95 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
            style={{ maxHeight: '60vh' }}
          >
            {/* Header */}
            <div 
              className={cn('p-3 flex items-center justify-between bg-gradient-to-r', colorConfig.bg)}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-white" />
                <span className="font-semibold text-white text-sm">Game Chat</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="h-48 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 text-xs py-4">
                  No messages yet. Say hi! 👋
                </p>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex',
                      msg.senderId === currentUserId ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-xl px-3 py-1.5',
                        msg.senderId === currentUserId
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white'
                          : 'bg-white/10 text-white'
                      )}
                    >
                      {msg.senderId !== currentUserId && (
                        <p className="text-[10px] text-gray-400 mb-0.5">{msg.senderName}</p>
                      )}
                      <p className={cn('text-sm', msg.isEmoji && 'text-2xl')}>
                        {msg.message}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Messages */}
            <div className="px-3 pb-2">
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                {QUICK_MESSAGES.map((msg) => (
                  <button
                    key={msg}
                    onClick={() => handleQuickMessage(msg)}
                    className="shrink-0 px-2.5 py-1 text-[10px] rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji Panel */}
            <AnimatePresence>
              {showEmojis && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-2 overflow-hidden"
                >
                  <div className="grid grid-cols-6 gap-2 p-2 bg-white/5 rounded-lg">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        className="text-xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="p-3 border-t border-white/10 flex gap-2">
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  showEmojis ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400 hover:text-white'
                )}
              >
                <Smile className="w-4 h-4" />
              </button>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-white/10 border-white/10 text-white placeholder:text-gray-500 text-sm h-9"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                size="sm"
                className={cn('bg-gradient-to-r px-3', colorConfig.bg)}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LudoChat;
