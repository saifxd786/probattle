import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CoreXPaymentResponse {
  success: boolean;
  payment_url?: string;
  order_id?: string;
  error?: string;
}

interface PaymentStatus {
  success: boolean;
  order_id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  transaction_id?: string;
  message?: string;
}

export const useCoreXPayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const initiatePayment = async (amount: number): Promise<CoreXPaymentResponse> => {
    if (amount < 1) {
      toast({ 
        title: 'Error', 
        description: 'Minimum deposit is ₹1', 
        variant: 'destructive' 
      });
      return { success: false, error: 'Invalid amount' };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-corex-payment', {
        body: { amount }
      });

      if (error) {
        console.error('CoreX payment error:', error);
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
      console.error('CoreX payment exception:', error);
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

  const checkPaymentStatus = useCallback(async (orderId: string): Promise<PaymentStatus | null> => {
    if (!orderId) return null;
    
    setIsCheckingStatus(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('corex-check-status', {
        body: { order_id: orderId }
      });

      if (error) {
        console.error('Status check error:', error);
        return null;
      }

      return data as PaymentStatus;
    } catch (error) {
      console.error('Status check exception:', error);
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  const redirectToPayment = async (amount: number): Promise<boolean> => {
    const result = await initiatePayment(amount);
    
    if (result.success && result.payment_url) {
      // Store order ID for tracking when user returns
      if (result.order_id) {
        localStorage.setItem('corex_pending_order', result.order_id);
        localStorage.setItem('corex_pending_amount', amount.toString());
      }
      
      // Redirect to payment gateway
      window.location.href = result.payment_url;
      return true;
    }
    
    return false;
  };

  // Check for pending payment on mount (when user returns from gateway)
  const getPendingOrder = useCallback(() => {
    const orderId = localStorage.getItem('corex_pending_order');
    const amount = localStorage.getItem('corex_pending_amount');
    return {
      orderId,
      amount: amount ? Number(amount) : null
    };
  }, []);

  const clearPendingOrder = useCallback(() => {
    localStorage.removeItem('corex_pending_order');
    localStorage.removeItem('corex_pending_amount');
  }, []);

  return {
    initiatePayment,
    redirectToPayment,
    checkPaymentStatus,
    getPendingOrder,
    clearPendingOrder,
    isLoading,
    isCheckingStatus
  };
};
