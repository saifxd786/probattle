import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Copy, Check, Upload, Shield, Zap, 
  AlertTriangle, Loader2, X, CheckCircle2, Timer, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import phonepeLogo from '@/assets/phonepe-logo.png';
import gpayLogo from '@/assets/gpay-logo.png';
import paytmLogo from '@/assets/paytm-logo.png';
import paymentProcessingGif from '@/assets/payment-processing.gif';
import { toast } from '@/hooks/use-toast';
import { usePaymentQR } from '@/hooks/usePaymentQR';

const DEPOSIT_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const UPI_ID = 'mohdqureshi807@naviaxis';
const TIMER_DURATION = 300; // 5 minutes in seconds

interface DepositPaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, utrId: string, screenshot: File | null) => Promise<void>;
  isSubmitting: boolean;
}

const DepositPaymentGateway = ({ isOpen, onClose, onSubmit, isSubmitting }: DepositPaymentGatewayProps) => {
  const { qrUrl, qrEnabled } = usePaymentQR();
  
  const [step, setStep] = useState<'amount' | 'payment' | 'verify'>('amount');
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [utrId, setUtrId] = useState('');
  const [copied, setCopied] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [timerActive, setTimerActive] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [gifLoaded, setGifLoaded] = useState(false);
  const [showQRLightbox, setShowQRLightbox] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const finalAmount = customAmount ? Number(customAmount) : selectedAmount;

  // Preload the processing GIF when component mounts
  useEffect(() => {
    const img = new Image();
    img.onload = () => setGifLoaded(true);
    img.src = paymentProcessingGif;
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      toast({ 
        title: 'Session Expired', 
        description: 'Payment session has expired. Please start again.', 
        variant: 'destructive' 
      });
      handleClose();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const handleClose = () => {
    setStep('amount');
    setSelectedAmount(100);
    setCustomAmount('');
    setUtrId('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setTimeLeft(TIMER_DURATION);
    setTimerActive(false);
    onClose();
  };

  const handleProceedToPayment = () => {
    if (finalAmount < 100) {
      toast({ title: 'Error', description: 'Minimum deposit is ₹100', variant: 'destructive' });
      return;
    }
    setStep('payment');
    setTimerActive(true);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Error', description: 'File size must be less than 5MB', variant: 'destructive' });
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    toast({ title: 'Copied!', description: 'UPI ID copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!utrId.trim()) {
      toast({ title: 'Error', description: 'Please enter UTR/Transaction ID', variant: 'destructive' });
      return;
    }
    setShowProcessing(true);
    await onSubmit(finalAmount, utrId, screenshot);
    setTimeout(() => {
      setShowProcessing(false);
      handleClose();
    }, 5000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timerPercent = (timeLeft / TIMER_DURATION) * 100;

  const upiApps = [
    { 
      name: 'PhonePe', 
      logo: phonepeLogo, 
      scheme: `phonepe://pay?pa=${UPI_ID}&pn=ProBattle&am=${finalAmount}&cu=INR`,
      color: 'from-purple-600 to-purple-800'
    },
    { 
      name: 'GPay', 
      logo: gpayLogo, 
      scheme: `gpay://upi/pay?pa=${UPI_ID}&pn=ProBattle&am=${finalAmount}&cu=INR`,
      color: 'from-blue-500 to-blue-700'
    },
    { 
      name: 'Paytm', 
      logo: paytmLogo, 
      scheme: `paytmmp://pay?pa=${UPI_ID}&pn=ProBattle&am=${finalAmount}&cu=INR`,
      color: 'from-sky-500 to-sky-700'
    },
  ];

  return (
    <>
      {/* QR Lightbox */}
      <AnimatePresence>
        {showQRLightbox && qrUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setShowQRLightbox(false)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={qrUrl}
              alt="Payment QR Code"
              className="max-w-[90vw] max-h-[80vh] rounded-2xl bg-white p-4 object-contain"
            />
            <p className="absolute bottom-8 text-white text-sm">Tap anywhere to close</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Processing Overlay */}
      <AnimatePresence>
        {showProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
          >
            <img 
              src={paymentProcessingGif} 
              alt="Payment Processing" 
              className="w-full h-full object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden bg-gradient-to-b from-card to-background border-primary/20 flex flex-col">
        {/* Header */}
        <div className="relative flex-shrink-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 p-4 border-b border-primary/20">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">Secure Payment</h2>
                <p className="text-xs text-muted-foreground">ProBattle Payment Gateway</p>
              </div>
            </div>
            
            {timerActive && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg border border-border/50">
                <Timer className={`w-4 h-4 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-primary'}`} />
                <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-foreground'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
          </div>
          
          {/* Progress steps */}
          <div className="relative mt-4 flex items-center gap-2">
            {['amount', 'payment', 'verify'].map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-all duration-300 ${
                  ['amount', 'payment', 'verify'].indexOf(step) >= i 
                    ? 'bg-primary' 
                    : 'bg-muted'
                }`} />
                <p className={`text-[10px] mt-1 text-center capitalize ${
                  step === s ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {step === 'amount' && (
              <motion.div
                key="amount"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <h3 className="font-display font-bold text-xl mb-1">Select Amount</h3>
                  <p className="text-sm text-muted-foreground">Choose or enter your deposit amount</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {DEPOSIT_AMOUNTS.map((amount) => (
                    <motion.button
                      key={amount}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                      className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                        selectedAmount === amount && !customAmount
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <span className="font-display font-bold text-lg">₹{amount}</span>
                      {selectedAmount === amount && !customAmount && (
                        <motion.div
                          layoutId="selected"
                          className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="relative">
                  <Label className="text-xs text-muted-foreground">Custom Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount (Min ₹100)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="mt-1 font-display text-lg"
                  />
                </div>

                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
                  <Zap className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-500">Instant Credit</p>
                    <p className="text-xs text-muted-foreground">Funds credited within minutes</p>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-none h-12 text-lg font-display"
                  onClick={handleProceedToPayment}
                >
                  Continue with ₹{finalAmount}
                </Button>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Timer progress bar */}
                <div className="space-y-1">
                  <Progress value={timerPercent} className={`h-1 ${timeLeft < 60 ? '[&>div]:bg-red-500' : ''}`} />
                  <p className="text-[10px] text-center text-muted-foreground">Complete payment before timer expires</p>
                </div>

                {/* Amount display */}
                <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Amount to Pay</p>
                  <p className="font-display text-4xl font-bold text-primary">₹{finalAmount}</p>
                </div>

                <Tabs defaultValue={qrEnabled && qrUrl ? "qr" : "upi"} className="w-full">
                  <TabsList className={`w-full grid bg-secondary/50 ${qrEnabled && qrUrl ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {qrEnabled && qrUrl && (
                      <TabsTrigger value="qr" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <QrCode className="w-4 h-4 mr-1" />
                        QR Code
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="upi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      UPI Apps
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Manual UPI
                    </TabsTrigger>
                  </TabsList>

                  {qrEnabled && qrUrl && (
                    <TabsContent value="qr" className="mt-3 space-y-3">
                      <p className="text-xs text-center text-muted-foreground">Scan this QR code with any UPI app</p>
                      <div 
                        className="relative cursor-pointer group"
                        onClick={() => setShowQRLightbox(true)}
                      >
                        <img 
                          src={qrUrl} 
                          alt="Payment QR Code" 
                          className="w-48 h-48 mx-auto rounded-xl border-2 border-primary/30 bg-white p-2 object-contain transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">Tap to enlarge</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-center text-muted-foreground">
                        Amount: <span className="font-bold text-primary">₹{finalAmount}</span>
                      </p>
                    </TabsContent>
                  )}

                  <TabsContent value="upi" className="mt-3 space-y-3">
                    <p className="text-xs text-center text-muted-foreground">Tap to pay directly with your UPI app</p>
                    <div className="grid grid-cols-3 gap-3">
                      {upiApps.map((app) => (
                        <motion.a
                          key={app.name}
                          href={app.scheme}
                          whileTap={{ scale: 0.95 }}
                          className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden p-1.5">
                            <img src={app.logo} alt={app.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="text-xs font-medium">{app.name}</span>
                        </motion.a>
                      ))}
                    </div>
                    <a 
                      href={`upi://pay?pa=${UPI_ID}&pn=ProBattle&am=${finalAmount}&cu=INR`}
                      className="block w-full"
                    >
                      <Button variant="outline" className="w-full">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-500 to-green-600 flex items-center justify-center mr-2">
                          <span className="text-white font-bold text-[8px]">UPI</span>
                        </div>
                        Other UPI App
                      </Button>
                    </a>
                  </TabsContent>

                  <TabsContent value="manual" className="mt-3 space-y-3">
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Send to this UPI ID:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-background rounded text-sm font-mono truncate">
                          {UPI_ID}
                        </code>
                        <Button variant="outline" size="icon" onClick={copyUPI}>
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <Button 
                  variant="neon" 
                  className="w-full h-12"
                  onClick={() => setStep('verify')}
                >
                  I've Made the Payment
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setStep('amount'); setTimerActive(false); setTimeLeft(TIMER_DURATION); }}
                  className="w-full text-muted-foreground"
                >
                  ← Change Amount
                </Button>
              </motion.div>
            )}

            {step === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Timer warning */}
                {timeLeft < 120 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="text-xs text-red-500">Complete verification quickly! {formatTime(timeLeft)} remaining</p>
                  </div>
                )}

                <div className="text-center mb-2">
                  <h3 className="font-display font-bold text-xl mb-1">Verify Payment</h3>
                  <p className="text-sm text-muted-foreground">Enter your transaction details</p>
                </div>

                <div className="p-3 bg-primary/5 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Amount Paid</p>
                  <p className="font-display text-2xl font-bold text-primary">₹{finalAmount}</p>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    UTR / Transaction ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={utrId}
                    onChange={(e) => setUtrId(e.target.value)}
                    placeholder="Enter 12-digit UTR number"
                    className="mt-1 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Find this in your UPI app → Payment History → Transaction Details
                  </p>
                </div>

                <div>
                  <Label>Payment Screenshot (Optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 border-2 border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {screenshotPreview ? (
                      <div className="relative">
                        <img 
                          src={screenshotPreview} 
                          alt="Screenshot preview" 
                          className="w-full h-24 object-contain rounded"
                        />
                        <p className="text-xs text-center text-muted-foreground mt-1">Tap to change</p>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Upload screenshot (optional)</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-none h-12"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !utrId.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit Payment
                    </>
                  )}
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setStep('payment')}
                  className="w-full text-muted-foreground"
                >
                  ← Back to Payment
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-4 py-3 bg-muted/30 border-t border-border/50 flex items-center justify-center gap-2">
            <Shield className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">256-bit SSL Secured Payment</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DepositPaymentGateway;