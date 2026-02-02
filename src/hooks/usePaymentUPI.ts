import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';

interface PaymentUPISettings {
  upi_id: string;
}

// UPI ID format: username@bankhandle
// Examples: 9876543210@ybl, user.name@oksbi, example@upi
const UPI_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

export const validateUPIId = (upiId: string): { valid: boolean; error?: string } => {
  const trimmed = upiId.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'UPI ID cannot be empty' };
  }
  
  if (!trimmed.includes('@')) {
    return { valid: false, error: 'UPI ID must contain @ symbol (e.g., name@bank)' };
  }
  
  const [username, handle] = trimmed.split('@');
  
  if (!username || username.length < 3) {
    return { valid: false, error: 'Username before @ must be at least 3 characters' };
  }
  
  if (!handle || handle.length < 2) {
    return { valid: false, error: 'Bank handle after @ must be at least 2 characters' };
  }
  
  if (!UPI_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid UPI format. Use only letters, numbers, dots, hyphens, and underscores' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'UPI ID must be less than 50 characters' };
  }
  
  return { valid: true };
};

export const usePaymentUPI = () => {
  const queryClient = useQueryClient();

  const { data: upiSettings, isLoading } = useQuery({
    queryKey: ['payment-upi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'payment_upi')
        .single();

      if (error) throw error;
      return data?.value as unknown as PaymentUPISettings;
    },
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (upiId: string) => {
      const validation = validateUPIId(upiId);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      const settings: PaymentUPISettings = { upi_id: upiId.trim() };
      const { error } = await supabase
        .from('app_settings')
        .update({ value: settings as unknown as Json })
        .eq('key', 'payment_upi');

      if (error) throw error;
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-upi'] });
    },
  });

  return {
    upiId: upiSettings?.upi_id ?? 'qureshi.saif@freecharge',
    isLoading,
    updateUPI: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    validateUPIId,
  };
};
