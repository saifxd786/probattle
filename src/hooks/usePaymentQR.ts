import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';

interface PaymentQRSettings {
  url: string | null;
  enabled: boolean;
}

export const usePaymentQR = () => {
  const queryClient = useQueryClient();

  const { data: qrSettings, isLoading } = useQuery({
    queryKey: ['payment-qr'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'payment_qr')
        .single();

      if (error) throw error;
      return data?.value as unknown as PaymentQRSettings;
    },
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: PaymentQRSettings) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: settings as unknown as Json })
        .eq('key', 'payment_qr');

      if (error) throw error;
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-qr'] });
    },
  });

  const uploadQR = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `payment-qr.${fileExt}`;
    
    // Delete existing QR if exists
    await supabase.storage.from('payment-assets').remove([fileName]);
    
    // Upload new QR
    const { error: uploadError } = await supabase.storage
      .from('payment-assets')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('payment-assets')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  return {
    qrUrl: qrSettings?.url ?? null,
    qrEnabled: qrSettings?.enabled ?? false,
    isLoading,
    updateQRSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    uploadQR,
  };
};
