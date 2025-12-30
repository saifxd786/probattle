import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export const usePullToRefresh = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefresh = useCallback(async () => {
    try {
      // Invalidate all queries to refetch data
      await queryClient.invalidateQueries();
      
      toast({
        title: "Refreshed!",
        description: "Data updated successfully.",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    }
  }, [queryClient, toast]);

  return { handleRefresh };
};
