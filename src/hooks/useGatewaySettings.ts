import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface GatewaySettings {
  manual_enabled: boolean;
  auto_enabled: boolean;
  corex_enabled: boolean;
  imb_enabled: boolean;
}

const DEFAULT_SETTINGS: GatewaySettings = {
  manual_enabled: true,
  auto_enabled: true,
  corex_enabled: true,
  imb_enabled: true,
};

export function useGatewaySettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['gateway-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'gateway_settings')
        .single();

      if (error || !data) {
        return DEFAULT_SETTINGS;
      }

      const value = data.value as unknown as GatewaySettings;
      return {
        manual_enabled: value.manual_enabled ?? true,
        auto_enabled: value.auto_enabled ?? true,
        corex_enabled: value.corex_enabled ?? true,
        imb_enabled: value.imb_enabled ?? true,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const { mutate: updateSettings, isPending: isUpdating } = useMutation({
    mutationFn: async (newSettings: Partial<GatewaySettings>) => {
      const merged = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('app_settings')
        .update({ value: merged, updated_at: new Date().toISOString() })
        .eq('key', 'gateway_settings');

      if (error) throw error;
      return merged;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['gateway-settings'], data);
    },
  });

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
    isUpdating,
    updateSettings,
  };
}
