import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Gift, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Only 7 segments as requested
const SEGMENTS = [
  { value: 10, color: 'hsl(200, 100%, 50%)', label: '₹10' },
  { value: 20, color: 'hsl(170, 100%, 45%)', label: '₹20' },
  { value: 100, color: 'hsl(270, 100%, 55%)', label: '₹100' },
  { value: 300, color: 'hsl(45, 100%, 50%)', label: '₹300' },
  { value: 500, color: 'hsl(0, 100%, 55%)', label: '₹500' },
  { value: 1000, color: 'hsl(320, 100%, 50%)', label: '₹1000' },
  { value: 5000, color: 'hsl(50, 100%, 50%)', label: '₹5000' },
];

const SpinWheel = () => {
  const { user } = useAuth();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);

  const segmentAngle = 360 / SEGMENTS.length;
  const REQUIRED_DEPOSIT = 1000;

  useEffect(() => {
    if (user) {
      checkEligibility();
    }
  }, [user]);

  const checkEligibility = async () => {
    setIsLoading(true);
    try {
      // Check total deposits
      const { data: deposits, error: depositError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user!.id)
        .eq('type', 'deposit')
        .eq('status', 'completed');

      if (depositError) throw depositError;

      const totalDep = deposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      setTotalDeposits(totalDep);

      if (totalDep < REQUIRED_DEPOSIT) {
        setIsLocked(true);
        setCanSpin(false);
      } else {
        setIsLocked(false);
        // Check spin availability from server
        const { data, error } = await supabase.rpc('check_spin_availability');
        if (error) throw error;
        
        const spinResult = data as { can_spin: boolean; next_spin_at: string | null };
        setCanSpin(spinResult.can_spin);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpin = async () => {
    if (!canSpin || isSpinning || isLocked) return;
    
    setIsSpinning(true);
    setShowResult(false);
    
    try {
      const { data, error } = await supabase.rpc('spin_wheel');
      
      if (error) throw error;
      
      const spinResult = data as { success: boolean; reward_amount?: number; message: string };
      
      if (spinResult.success && spinResult.reward_amount !== undefined) {
        const rewardAmount = spinResult.reward_amount;
        
        // Find the segment index that matches the reward
        const targetSegmentIndex = SEGMENTS.findIndex(s => s.value === rewardAmount);
        
        // Calculate rotation to land on target segment
        // The pointer is at the top (12 o'clock)
        const segmentMiddleAngle = targetSegmentIndex * segmentAngle + segmentAngle / 2;
        const targetRotation = 360 - segmentMiddleAngle + 270;
        
        // Add multiple full spins for effect
        const spins = 5 + Math.floor(Math.random() * 3);
        const newRotation = rotation + (spins * 360) + targetRotation - (rotation % 360);
        
        setRotation(newRotation);
        setResult(rewardAmount);
        
        // Show result after animation
        setTimeout(() => {
          setShowResult(true);
          setIsSpinning(false);
          setCanSpin(false);
          
          toast({
            title: '🎉 Congratulations!',
            description: `You won ₹${rewardAmount}!`,
          });
        }, 5000);
      } else {
        toast({
          title: 'Error',
          description: spinResult.message,
          variant: 'destructive',
        });
        setIsSpinning(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsSpinning(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="w-5 h-5 text-yellow-500" />
          Lucky Spin
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-6">
        {/* Locked State */}
        {isLocked && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
            <Lock className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Deposit ₹{REQUIRED_DEPOSIT}+ to unlock
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your deposits: ₹{totalDeposits}
            </p>
          </div>
        )}

        {/* Wheel Container */}
        <div className="relative w-64 h-64 my-4">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-500 drop-shadow-lg" />
          </div>
          
          {/* Wheel */}
          <motion.div
            ref={wheelRef}
            animate={{ rotate: rotation }}
            transition={{ 
              duration: 5,
              ease: [0.17, 0.67, 0.12, 0.99],
            }}
            className="w-full h-full rounded-full relative overflow-hidden border-4 border-primary/50"
            style={{
              boxShadow: '0 0 30px hsl(200 100% 50% / 0.3), inset 0 0 20px hsl(0 0% 0% / 0.5)',
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {SEGMENTS.map((segment, index) => {
                const startAngle = index * segmentAngle;
                const endAngle = startAngle + segmentAngle;
                const startRad = (startAngle - 90) * (Math.PI / 180);
                const endRad = (endAngle - 90) * (Math.PI / 180);
                
                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);
                
                const largeArc = segmentAngle > 180 ? 1 : 0;
                
                const midAngle = (startAngle + endAngle) / 2 - 90;
                const midRad = midAngle * (Math.PI / 180);
                const textX = 50 + 35 * Math.cos(midRad);
                const textY = 50 + 35 * Math.sin(midRad);
                
                return (
                  <g key={index}>
                    <path
                      d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={segment.color}
                      stroke="hsl(0 0% 0% / 0.3)"
                      strokeWidth="0.5"
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="5"
                      fontWeight="bold"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="50" cy="50" r="10" fill="hsl(220 30% 10%)" stroke="hsl(200 100% 50%)" strokeWidth="1" />
              <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="4" fontWeight="bold">
                SPIN
              </text>
            </svg>
          </motion.div>
          
          {/* Glow effect */}
          <motion.div
            animate={{ 
              boxShadow: isSpinning 
                ? ['0 0 30px hsl(200 100% 50% / 0.5)', '0 0 60px hsl(200 100% 50% / 0.8)', '0 0 30px hsl(200 100% 50% / 0.5)']
                : '0 0 20px hsl(200 100% 50% / 0.3)'
            }}
            transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0 }}
            className="absolute inset-0 rounded-full pointer-events-none"
          />
        </div>

        {/* Result Display */}
        <AnimatePresence>
          {showResult && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="text-center mb-4"
            >
              <p className="text-2xl font-display font-bold text-gradient">
                You Won ₹{result}!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spin Button */}
        {!isLocked && (
          canSpin ? (
            <Button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 font-display"
            >
              {isSpinning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Spinning...
                </>
              ) : (
                'SPIN NOW'
              )}
            </Button>
          ) : (
            <div className="text-center w-full">
              <p className="text-sm text-green-500 mb-2">✓ Already spun today!</p>
              <p className="text-xs text-muted-foreground">Deposit ₹1000+ to unlock next spin</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default SpinWheel;
