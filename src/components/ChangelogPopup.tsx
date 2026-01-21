import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle, Zap, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ChangelogPopupProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
}

const CHANGELOG = [
  {
    version: '1.2.0',
    date: '21 Jan 2026',
    highlights: [
      { icon: Zap, text: 'Enhanced Ludo matchmaking experience', color: 'text-yellow-400' },
      { icon: Gift, text: 'New referral reward system', color: 'text-green-400' },
      { icon: CheckCircle, text: 'Improved spin wheel logic', color: 'text-blue-400' },
      { icon: Sparkles, text: 'Bug fixes and performance improvements', color: 'text-purple-400' },
    ]
  },
  {
    version: '1.1.0',
    date: '18 Jan 2026',
    highlights: [
      { icon: Zap, text: 'Added Ludo King game mode', color: 'text-yellow-400' },
      { icon: Gift, text: 'Daily login rewards system', color: 'text-green-400' },
      { icon: CheckCircle, text: 'Mines and Thimble games', color: 'text-blue-400' },
    ]
  }
];

const ChangelogPopup = ({ isOpen, onClose, version }: ChangelogPopupProps) => {
  const latestChangelog = CHANGELOG[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/10"
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </motion.div>
            <div>
              <p className="text-lg font-bold">What's New</p>
              <p className="text-xs text-muted-foreground font-normal">
                Version {version}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Latest Version Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                v{latestChangelog.version}
              </span>
              <span className="text-xs text-muted-foreground">
                {latestChangelog.date}
              </span>
            </div>

            <div className="space-y-2">
              {latestChangelog.highlights.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm text-foreground">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Previous Versions */}
          {CHANGELOG.slice(1).map((changelog, vIdx) => (
            <motion.div
              key={changelog.version}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + vIdx * 0.2 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  v{changelog.version}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  {changelog.date}
                </span>
              </div>
              <div className="text-xs text-muted-foreground/80 pl-2 border-l-2 border-border">
                {changelog.highlights.map((h, i) => (
                  <p key={i}>• {h.text}</p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <Button 
          onClick={onClose} 
          className="w-full bg-gradient-to-r from-primary to-primary/80"
        >
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
};

// App version constant - update this when deploying new versions
export const APP_VERSION = '1.2.0';

export default ChangelogPopup;
