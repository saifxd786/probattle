import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

export const useMaintenanceMode = () => {
  const queryClient = useQueryClient();

  const { data: maintenanceSettings, isLoading } = useQuery({
    queryKey: ['maintenance-mode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (error) throw error;
      return data?.value as unknown as MaintenanceSettings | null;
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 60 * 1000, // Check every minute
    refetchOnMount: false, // Don't refetch on every component mount
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: MaintenanceSettings) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: settings as unknown as Json })
        .eq('key', 'maintenance_mode');

      if (error) throw error;
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });
    },
  });

  return {
    isMaintenanceMode: maintenanceSettings?.enabled ?? false,
    maintenanceMessage: maintenanceSettings?.message ?? 'We are upgrading our systems. Please check back soon!',
    isLoading,
    updateMaintenanceMode: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
