import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { soundManager } from '@/utils/soundManager';

interface SoundToggleProps {
  compact?: boolean;
}

const SoundToggle = ({ compact = false }: SoundToggleProps) => {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('ludo-sound-muted');
    return saved === 'true';
  });

  useEffect(() => {
    soundManager.setEnabled(!isMuted);
    localStorage.setItem('ludo-sound-muted', String(isMuted));
  }, [isMuted]);

  const toggleSound = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      // Play a quick click when unmuting
      soundManager.setEnabled(true);
      soundManager.playClick();
    }
  };

  if (compact) {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggleSound}
        className={`p-2 rounded-lg transition-colors ${
          isMuted 
            ? 'bg-red-500/20 text-red-400' 
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
        title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleSound}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
        isMuted 
          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
          : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
      }`}
    >
      {isMuted ? (
        <>
          <VolumeX className="w-4 h-4" />
          <span className="text-xs font-medium">Muted</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4" />
          <span className="text-xs font-medium">Sound</span>
        </>
      )}
    </motion.button>
  );
};

export default SoundToggle;
