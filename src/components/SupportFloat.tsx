import { Headset } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import SupportChat from './SupportChat';
import { useAuth } from '@/contexts/AuthContext';

const SupportFloat = () => {
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <>
      <motion.button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-20 right-4 z-50 md:bottom-6 group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
          
          {/* Button */}
          <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(var(--primary),0.6)]">
            <Headset className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-card/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap border border-border/50">
            Customer Support
          </div>
        </div>
      </motion.button>
      
      {showChat && <SupportChat />}
    </>
  );
};

export default SupportFloat;
