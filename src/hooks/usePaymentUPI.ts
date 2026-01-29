import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';

interface PaymentUPISettings {
  upi_id: string;
}

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
      const settings: PaymentUPISettings = { upi_id: upiId };
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
    upiId: upiSettings?.upi_id ?? 'mohdqureshi807@naviaxis',
    isLoading,
    updateUPI: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
