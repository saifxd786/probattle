import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const TelegramFloat = () => {
  return (
    <motion.a
      href="https://t.me/ProScimstournament"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 z-50 md:bottom-6 group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-[#0088cc] rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
        
        {/* Button */}
        <div className="relative flex items-center justify-center w-14 h-14 bg-[#0088cc] rounded-full shadow-lg transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(0,136,204,0.6)]">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full border-2 border-[#0088cc] animate-ping opacity-30" />
      </div>
      
      {/* Tooltip */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="bg-card/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap border border-border/50">
          Join Telegram Support
        </div>
      </div>
    </motion.a>
  );
};

export default TelegramFloat;
