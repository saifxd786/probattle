import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, User } from 'lucide-react';

// Import custom avatars
import avatarWarrior from '@/assets/avatar-warrior.png';
import avatarNinja from '@/assets/avatar-ninja.png';
import avatarRanger from '@/assets/avatar-ranger.png';
import avatarKnight from '@/assets/avatar-knight.png';
import avatarMage from '@/assets/avatar-mage.png';

interface LudoAvatarPickerProps {
  userAvatar?: string | null;
  selectedAvatar: string | null;
  onSelectAvatar: (avatar: string | null) => void;
}

const CUSTOM_AVATARS = [
  { id: 'warrior', src: avatarWarrior, name: 'Warrior' },
  { id: 'ninja', src: avatarNinja, name: 'Ninja' },
  { id: 'ranger', src: avatarRanger, name: 'Ranger' },
  { id: 'knight', src: avatarKnight, name: 'Knight' },
  { id: 'mage', src: avatarMage, name: 'Mage' },
];

const LudoAvatarPicker = ({ userAvatar, selectedAvatar, onSelectAvatar }: LudoAvatarPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Get current display avatar
  const getCurrentAvatar = () => {
    if (selectedAvatar === null || selectedAvatar === 'profile') {
      return userAvatar;
    }
    const customAvatar = CUSTOM_AVATARS.find(a => a.id === selectedAvatar);
    return customAvatar?.src || userAvatar;
  };

  const currentAvatar = getCurrentAvatar();
  const isProfileSelected = selectedAvatar === null || selectedAvatar === 'profile';

  return (
    <div className="relative">
      {/* Current Avatar Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-xl bg-gray-800/60 border border-gray-700/50 hover:bg-gray-700/60 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
          {currentAvatar ? (
            <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            
            {/* Picker Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 p-3 rounded-xl bg-gray-900 border border-gray-800 shadow-xl min-w-[200px]"
            >
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">
                Choose Avatar
              </p>

              {/* Profile Avatar (Default) */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onSelectAvatar('profile');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg mb-2 transition-colors ${
                  isProfileSelected
                    ? 'bg-indigo-500/20 border border-indigo-500/50'
                    : 'bg-gray-800/50 border border-transparent hover:bg-gray-700/50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white text-sm font-medium">Profile</p>
                  <p className="text-gray-500 text-[10px]">Default avatar</p>
                </div>
                {isProfileSelected && (
                  <Check className="w-4 h-4 text-indigo-400" />
                )}
              </motion.button>

              {/* Divider */}
              <div className="h-px bg-gray-800 my-2" />

              {/* Custom Avatars Grid */}
              <div className="grid grid-cols-5 gap-2">
                {CUSTOM_AVATARS.map((avatar) => {
                  const isSelected = selectedAvatar === avatar.id;
                  return (
                    <motion.button
                      key={avatar.id}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        onSelectAvatar(avatar.id);
                        setIsOpen(false);
                      }}
                      className={`relative w-10 h-10 rounded-lg overflow-hidden transition-all ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900'
                          : 'hover:ring-2 hover:ring-gray-600'
                      }`}
                    >
                      <img src={avatar.src} alt={avatar.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LudoAvatarPicker;
export { CUSTOM_AVATARS };
