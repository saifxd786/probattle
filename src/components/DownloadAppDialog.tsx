import { useState } from 'react';
import { Download, Share, Plus, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Professional Android Icon SVG
const AndroidIcon = () => (
  <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67a.643.643 0 00-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
  </svg>
);

// Professional Apple Icon SVG
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

interface DownloadAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DownloadAppDialog = ({ open, onOpenChange }: DownloadAppDialogProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | null>(null);

  const handleAndroidDownload = () => {
    const link = document.createElement('a');
    link.href = '/probattle.apk';
    link.download = 'ProBattle.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onOpenChange(false);
    setSelectedPlatform(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedPlatform(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Download ProBattle App
          </DialogTitle>
          <DialogDescription className="text-center">
            Select your device platform
          </DialogDescription>
        </DialogHeader>

        {!selectedPlatform ? (
          // Platform Selection
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Android Option */}
            <button
              onClick={() => setSelectedPlatform('android')}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/50 transition-all group"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3DDC84]/20 to-[#3DDC84]/5 flex items-center justify-center text-[#3DDC84] group-hover:scale-105 transition-transform shadow-lg shadow-[#3DDC84]/10">
                <AndroidIcon />
              </div>
              <div className="text-center">
                <span className="font-semibold text-lg block">Android</span>
                <span className="text-xs text-muted-foreground">Download APK</span>
              </div>
            </button>

            {/* iOS Option */}
            <button
              onClick={() => setSelectedPlatform('ios')}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/50 transition-all group"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-lg shadow-white/10">
                <AppleIcon />
              </div>
              <div className="text-center">
                <span className="font-semibold text-lg block">iOS</span>
                <span className="text-xs text-muted-foreground">iPhone / iPad</span>
              </div>
            </button>
          </div>
        ) : selectedPlatform === 'android' ? (
          // Android Download Confirmation
          <div className="flex flex-col items-center gap-5 mt-4">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#3DDC84]/20 to-[#3DDC84]/5 flex items-center justify-center text-[#3DDC84] shadow-lg shadow-[#3DDC84]/10">
              <AndroidIcon />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Android APK Download</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The ProBattle APK file will be downloaded. You may need to enable "Install from Unknown Sources" in your device settings.
              </p>
            </div>
            <Button 
              onClick={handleAndroidDownload}
              className="w-full gap-2 bg-[#3DDC84] hover:bg-[#32C973] text-black font-semibold"
              size="lg"
            >
              <Download className="w-5 h-5" />
              Download APK
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setSelectedPlatform(null)}
              className="text-muted-foreground gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        ) : (
          // iOS Instructions
          <div className="flex flex-col gap-5 mt-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-white mb-4 shadow-lg shadow-white/10">
                <AppleIcon />
              </div>
              <h3 className="font-semibold text-lg mb-1">Install via Safari</h3>
              <p className="text-sm text-muted-foreground">
                Add ProBattle to your home screen using Safari
              </p>
            </div>

            <div className="space-y-3 bg-secondary/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Open in Safari browser</p>
                  <p className="text-xs text-muted-foreground">
                    This feature only works in Safari
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium text-sm flex items-center gap-1">
                    Tap the Share button <Share className="w-4 h-4 text-primary inline" />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Located at the bottom center of Safari
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium text-sm flex items-center gap-1">
                    Select "Add to Home Screen" <Plus className="w-4 h-4 text-primary inline" />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scroll down to find this option
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Tap "Add" to confirm</p>
                  <p className="text-xs text-muted-foreground">
                    The app icon will appear on your home screen
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-500 text-center font-medium">
                ⚠️ Safari browser is required for iOS installation
              </p>
            </div>

            <Button 
              variant="ghost" 
              onClick={() => setSelectedPlatform(null)}
              className="text-muted-foreground gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DownloadAppDialog;
