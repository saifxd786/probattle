import { useState } from 'react';
import { Download, Smartphone, Apple, Share, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Android Icon SVG
const AndroidIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M17.523 15.341c.0 .54-.438.977-.977.977h-.976v2.93c0 .58-.468 1.046-1.046 1.046-.579 0-1.046-.467-1.046-1.046v-2.93h-2.93v2.93c0 .58-.467 1.046-1.046 1.046-.579 0-1.046-.467-1.046-1.046v-2.93h-.976c-.54 0-.977-.438-.977-.977V8.318h10.02v7.023zm-8.044-10.02c-.579 0-1.046.467-1.046 1.046v4.883h10.02V6.367c0-.579-.467-1.046-1.046-1.046H9.479zm7.023-.977h-.488L17.5 2.858c.195-.195.195-.512 0-.707-.195-.195-.512-.195-.707 0l-1.66 1.66-.195.195H9.062l-.195-.195-1.66-1.66c-.195-.195-.512-.195-.707 0-.195.195-.195.512 0 .707l1.486 1.486h-.488c-.58 0-1.046.467-1.046 1.046v4.883h10.02V6.39c0-.579-.467-1.046-1.046-1.046zM6.55 8.318v7.023c0 .54-.438.977-.977.977-.58 0-1.046-.467-1.046-1.046V9.364c0-.58.467-1.046 1.046-1.046h.977zm12.946 0h.977c.579 0 1.046.467 1.046 1.046v5.908c0 .579-.467 1.046-1.046 1.046-.54 0-.977-.438-.977-.977V8.318zm-7.023-3.906c-.27 0-.488-.22-.488-.488 0-.27.22-.488.488-.488.27 0 .488.22.488.488 0 .27-.22.488-.488.488zm2.93 0c-.27 0-.488-.22-.488-.488 0-.27.22-.488.488-.488.27 0 .488.22.488.488 0 .27-.22.488-.488.488z"/>
  </svg>
);

interface DownloadAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DownloadAppDialog = ({ open, onOpenChange }: DownloadAppDialogProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | null>(null);

  const handleAndroidDownload = () => {
    // Trigger APK download
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
            📲 Download ProBattle App
          </DialogTitle>
          <DialogDescription className="text-center">
            Apna device select karo
          </DialogDescription>
        </DialogHeader>

        {!selectedPlatform ? (
          // Platform Selection
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Android Option */}
            <button
              onClick={() => setSelectedPlatform('android')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-green-500 hover:bg-green-500/10 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                <AndroidIcon />
              </div>
              <span className="font-semibold text-lg">Android</span>
              <span className="text-xs text-muted-foreground">APK Download</span>
            </button>

            {/* iOS Option */}
            <button
              onClick={() => setSelectedPlatform('ios')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/10 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <Apple className="w-8 h-8" />
              </div>
              <span className="font-semibold text-lg">iOS</span>
              <span className="text-xs text-muted-foreground">iPhone / iPad</span>
            </button>
          </div>
        ) : selectedPlatform === 'android' ? (
          // Android Download Confirmation
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
              <AndroidIcon />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Android APK Download</h3>
              <p className="text-sm text-muted-foreground mb-4">
                ProBattle APK file download hoga. Install karne ke liye "Unknown Sources" allow karna padega.
              </p>
            </div>
            <Button 
              onClick={handleAndroidDownload}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Download className="w-5 h-5" />
              Download APK (Android)
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setSelectedPlatform(null)}
              className="text-muted-foreground"
            >
              ← Back
            </Button>
          </div>
        ) : (
          // iOS Instructions
          <div className="flex flex-col gap-4 mt-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 mb-3">
                <Apple className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-1">iOS ke liye PWA Install karo</h3>
              <p className="text-sm text-muted-foreground">
                Safari browser se neeche ke steps follow karo
              </p>
            </div>

            <div className="space-y-3 bg-secondary/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Safari browser open karo</p>
                  <p className="text-xs text-muted-foreground">
                    Chrome se nahi hoga, Safari lagega
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium text-sm flex items-center gap-1">
                    Share button dabao <Share className="w-4 h-4 text-blue-500 inline" />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Neeche center mein milega
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium text-sm flex items-center gap-1">
                    "Add to Home Screen" <Plus className="w-4 h-4 text-blue-500 inline" /> tap karo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scroll karke dhundna padega
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">"Add" button dabao</p>
                  <p className="text-xs text-muted-foreground">
                    Home screen pe app icon aa jayega! 🎉
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center">
                ⚠️ iOS pe sirf Safari browser se hi install hoga
              </p>
            </div>

            <Button 
              variant="ghost" 
              onClick={() => setSelectedPlatform(null)}
              className="text-muted-foreground"
            >
              ← Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DownloadAppDialog;
