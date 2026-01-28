import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AgentPermissions = {
  can_view_users: boolean;
  can_view_user_details: boolean;
  can_manage_bgmi_results: boolean;
  can_view_transactions: boolean;
  can_view_support: boolean;
  can_reply_support: boolean;
  can_approve_registrations: boolean;
  can_publish_room_details: boolean;
};

const defaultPermissions: AgentPermissions = {
  can_view_users: false,
  can_view_user_details: false,
  can_manage_bgmi_results: false,
  can_view_transactions: false,
  can_view_support: false,
  can_reply_support: false,
  can_approve_registrations: false,
  can_publish_room_details: false,
};

export const useAgentPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<AgentPermissions>(defaultPermissions);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions(defaultPermissions);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('agent_permissions')
        .select('*')
        .eq('agent_user_id', user.id)
        .single();

      if (error || !data) {
        setPermissions(defaultPermissions);
      } else {
        setPermissions({
          can_view_users: data.can_view_users,
          can_view_user_details: data.can_view_user_details,
          can_manage_bgmi_results: data.can_manage_bgmi_results,
          can_view_transactions: data.can_view_transactions,
          can_view_support: data.can_view_support,
          can_reply_support: data.can_reply_support,
          can_approve_registrations: data.can_approve_registrations,
          can_publish_room_details: data.can_publish_room_details,
        });
      }
      setIsLoading(false);
    };

    fetchPermissions();
  }, [user]);

  return { permissions, isLoading };
};
