-- Create agent_permissions table for per-agent permission control
CREATE TABLE public.agent_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view_users BOOLEAN NOT NULL DEFAULT true,
  can_view_user_details BOOLEAN NOT NULL DEFAULT true,
  can_manage_bgmi_results BOOLEAN NOT NULL DEFAULT true,
  can_view_transactions BOOLEAN NOT NULL DEFAULT true,
  can_view_support BOOLEAN NOT NULL DEFAULT false,
  can_reply_support BOOLEAN NOT NULL DEFAULT false,
  can_approve_registrations BOOLEAN NOT NULL DEFAULT false,
  can_publish_room_details BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_user_id)
);

-- Enable RLS
ALTER TABLE public.agent_permissions ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage agent permissions"
ON public.agent_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Agents can view their own permissions
CREATE POLICY "Agents can view own permissions"
ON public.agent_permissions
FOR SELECT
TO authenticated
USING (agent_user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_agent_permissions_updated_at
BEFORE UPDATE ON public.agent_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create permissions when agent role is assigned
CREATE OR REPLACE FUNCTION public.handle_agent_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'agent' THEN
    INSERT INTO public.agent_permissions (agent_user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (agent_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agent_role_assigned
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_agent_role_assignment();

-- Auto-delete permissions when agent role is removed
CREATE OR REPLACE FUNCTION public.handle_agent_role_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'agent' THEN
    DELETE FROM public.agent_permissions WHERE agent_user_id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_agent_role_removed
AFTER DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_agent_role_removal();