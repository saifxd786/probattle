import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Gift, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface WheelSettings {
  segment_values: number[];
  segment_colors: string[];
  pointer_color: string;
  center_color: string;
  border_color: string;
  required_deposit: number;
}

const DEFAULT_SETTINGS: WheelSettings = {
  segment_values: [10, 20, 100, 300, 500, 1000, 5000],
  segment_colors: [
    'hsl(200, 100%, 50%)',
    'hsl(170, 100%, 45%)',
    'hsl(270, 100%, 55%)',
    'hsl(45, 100%, 50%)',
    'hsl(0, 100%, 55%)',
    'hsl(320, 100%, 50%)',
    'hsl(50, 100%, 50%)',
  ],
  pointer_color: 'hsl(45, 100%, 50%)',
  center_color: 'hsl(220, 30%, 10%)',
  border_color: 'hsl(200, 100%, 50%)',
  required_deposit: 1000,
};

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
  const [wheelSettings, setWheelSettings] = useState<WheelSettings>(DEFAULT_SETTINGS);
  const wheelRef = useRef<HTMLDivElement>(null);

  const segmentAngle = 360 / wheelSettings.segment_values.length;

  useEffect(() => {
    fetchWheelSettings();
  }, []);

  useEffect(() => {
    if (user) {
      checkEligibility();
    }
  }, [user, wheelSettings.required_deposit]);

  const fetchWheelSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('spin_wheel_settings')
        .select('segment_values, segment_colors, pointer_color, center_color, border_color, required_deposit')
        .single();

      if (error) throw error;

      if (data) {
        setWheelSettings({
          segment_values: data.segment_values || DEFAULT_SETTINGS.segment_values,
          segment_colors: data.segment_colors || DEFAULT_SETTINGS.segment_colors,
          pointer_color: data.pointer_color || DEFAULT_SETTINGS.pointer_color,
          center_color: data.center_color || DEFAULT_SETTINGS.center_color,
          border_color: data.border_color || DEFAULT_SETTINGS.border_color,
          required_deposit: data.required_deposit || DEFAULT_SETTINGS.required_deposit,
        });
      }
    } catch (error) {
      console.error('Error fetching wheel settings:', error);
    }
  };

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

      if (totalDep < wheelSettings.required_deposit) {
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
        const targetSegmentIndex = wheelSettings.segment_values.findIndex(v => v === rewardAmount);
        
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

  const getSegmentColor = (index: number) => {
    return wheelSettings.segment_colors[index % wheelSettings.segment_colors.length];
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
              Deposit ₹{wheelSettings.required_deposit}+ to unlock
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
            <div 
              className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent drop-shadow-lg"
              style={{ borderTopColor: wheelSettings.pointer_color }}
            />
          </div>
          
          {/* Wheel */}
          <motion.div
            ref={wheelRef}
            animate={{ rotate: rotation }}
            transition={{ 
              duration: 5,
              ease: [0.17, 0.67, 0.12, 0.99],
            }}
            className="w-full h-full rounded-full relative overflow-hidden"
            style={{
              border: `4px solid ${wheelSettings.border_color}`,
              boxShadow: `0 0 30px ${wheelSettings.border_color}33, inset 0 0 20px hsl(0 0% 0% / 0.5)`,
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {wheelSettings.segment_values.map((value, index) => {
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
                      fill={getSegmentColor(index)}
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
                      ₹{value}
                    </text>
                  </g>
                );
              })}
              {/* Center circle */}
              <circle 
                cx="50" 
                cy="50" 
                r="10" 
                fill={wheelSettings.center_color} 
                stroke={wheelSettings.border_color} 
                strokeWidth="1" 
              />
              <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="4" fontWeight="bold">
                SPIN
              </text>
            </svg>
          </motion.div>
          
          {/* Glow effect */}
          <motion.div
            animate={{ 
              boxShadow: isSpinning 
                ? [`0 0 30px ${wheelSettings.border_color}88`, `0 0 60px ${wheelSettings.border_color}cc`, `0 0 30px ${wheelSettings.border_color}88`]
                : `0 0 20px ${wheelSettings.border_color}55`
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
              <p className="text-xs text-muted-foreground">Deposit ₹{wheelSettings.required_deposit}+ to unlock next spin</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default SpinWheel;