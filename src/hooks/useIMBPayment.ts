import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface IMBPaymentResponse {
  success: boolean;
  payment_url?: string;
  order_id?: string;
  error?: string;
}

export const useIMBPayment = () => {
  const [isLoading, setIsLoading] = useState(false);

  const initiatePayment = async (amount: number): Promise<IMBPaymentResponse> => {
    if (amount <= 0) {
      toast({ 
        title: 'Error', 
        description: 'Invalid amount', 
        variant: 'destructive' 
      });
      return { success: false, error: 'Invalid amount' };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-imb-payment', {
        body: { amount }
      });

      if (error) {
        console.error('IMB payment error:', error);
        toast({ 
          title: 'Payment Error', 
          description: error.message || 'Failed to initiate payment', 
          variant: 'destructive' 
        });
        return { success: false, error: error.message };
      }

      if (!data.success || !data.payment_url) {
        const errorMessage = data.error || 'Failed to get payment URL';
        toast({ 
          title: 'Payment Error', 
          description: errorMessage, 
          variant: 'destructive' 
        });
        return { success: false, error: errorMessage };
      }

      // Success - return the payment URL
      return {
        success: true,
        payment_url: data.payment_url,
        order_id: data.order_id
      };

    } catch (error: any) {
      console.error('IMB payment exception:', error);
      toast({ 
        title: 'Error', 
        description: 'Something went wrong. Please try again.', 
        variant: 'destructive' 
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToPayment = async (amount: number): Promise<boolean> => {
    const result = await initiatePayment(amount);
    
    if (result.success && result.payment_url) {
      // Store order ID for tracking
      localStorage.setItem('imb_pending_order', result.order_id || '');
      
      // Redirect to payment gateway
      window.location.href = result.payment_url;
      return true;
    }
    
    return false;
  };

  return {
    initiatePayment,
    redirectToPayment,
    isLoading
  };
};
