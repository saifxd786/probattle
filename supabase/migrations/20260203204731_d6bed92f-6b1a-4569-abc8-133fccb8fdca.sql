-- Add new permission columns for scheduling matches
ALTER TABLE public.agent_permissions 
ADD COLUMN IF NOT EXISTS can_schedule_tdm_matches boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_schedule_classic_matches boolean DEFAULT false;