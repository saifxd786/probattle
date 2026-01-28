import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Eye, Trophy, CreditCard, MessageSquare, Reply, CheckCircle, Key } from 'lucide-react';

type AgentPermissions = {
  id: string;
  agent_user_id: string;
  can_view_users: boolean;
  can_view_user_details: boolean;
  can_manage_bgmi_results: boolean;
  can_view_transactions: boolean;
  can_view_support: boolean;
  can_reply_support: boolean;
  can_approve_registrations: boolean;
  can_publish_room_details: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string | null;
};

const permissionConfig = [
  { key: 'can_view_users', label: 'View Users List', description: 'Users ki list dekh sakta hai', icon: Users },
  { key: 'can_view_user_details', label: 'View User Details', description: 'User ki poori details dekh sakta hai', icon: Eye },
  { key: 'can_manage_bgmi_results', label: 'Manage BGMI Results', description: 'Match results update kar sakta hai', icon: Trophy },
  { key: 'can_publish_room_details', label: 'Publish Room Details', description: 'Room ID aur password publish kar sakta hai', icon: Key },
  { key: 'can_approve_registrations', label: 'Approve Registrations', description: 'Match registrations approve kar sakta hai', icon: CheckCircle },
  { key: 'can_view_transactions', label: 'View Transactions', description: 'Deposits/withdrawals dekh sakta hai', icon: CreditCard },
  { key: 'can_view_support', label: 'View Support Tickets', description: 'Support tickets dekh sakta hai', icon: MessageSquare },
  { key: 'can_reply_support', label: 'Reply to Support', description: 'Support tickets ka reply kar sakta hai', icon: Reply },
] as const;

const AgentPermissionsDialog = ({ isOpen, onClose, userId, username }: Props) => {
  const [permissions, setPermissions] = useState<AgentPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchPermissions();
    }
  }, [isOpen, userId]);

  const fetchPermissions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('agent_permissions')
      .select('*')
      .eq('agent_user_id', userId)
      .single();

    if (error) {
      // If no permissions exist, create default ones
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('agent_permissions')
          .insert({ agent_user_id: userId })
          .select()
          .single();

        if (!insertError && newData) {
          setPermissions(newData);
        }
      } else {
        toast({ title: 'Error', description: 'Failed to fetch permissions', variant: 'destructive' });
      }
    } else {
      setPermissions(data);
    }
    setIsLoading(false);
  };

  const handleToggle = (key: keyof AgentPermissions) => {
    if (!permissions) return;
    setPermissions({
      ...permissions,
      [key]: !permissions[key],
    });
  };

  const handleSave = async () => {
    if (!permissions) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('agent_permissions')
      .update({
        can_view_users: permissions.can_view_users,
        can_view_user_details: permissions.can_view_user_details,
        can_manage_bgmi_results: permissions.can_manage_bgmi_results,
        can_view_transactions: permissions.can_view_transactions,
        can_view_support: permissions.can_view_support,
        can_reply_support: permissions.can_reply_support,
        can_approve_registrations: permissions.can_approve_registrations,
        can_publish_room_details: permissions.can_publish_room_details,
      })
      .eq('agent_user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Agent permissions updated' });
      onClose();
    }
    setIsSaving(false);
  };

  const toggleAll = (value: boolean) => {
    if (!permissions) return;
    setPermissions({
      ...permissions,
      can_view_users: value,
      can_view_user_details: value,
      can_manage_bgmi_results: value,
      can_view_transactions: value,
      can_view_support: value,
      can_reply_support: value,
      can_approve_registrations: value,
      can_publish_room_details: value,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Agent Permissions: {username || 'Unknown'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : permissions ? (
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="flex gap-2 pb-2 border-b border-border">
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
                Enable All
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
                Disable All
              </Button>
            </div>

            {/* Permission toggles */}
            <div className="space-y-3">
              {permissionConfig.map(({ key, label, description, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-primary" />
                    <div>
                      <Label className="font-medium cursor-pointer">{label}</Label>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions[key as keyof AgentPermissions] as boolean}
                    onCheckedChange={() => handleToggle(key as keyof AgentPermissions)}
                  />
                </div>
              ))}
            </div>

            {/* Save button */}
            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Permissions'
              )}
            </Button>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Could not load permissions. Make sure the user has agent role.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AgentPermissionsDialog;
