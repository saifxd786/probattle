-- Create POV status enum
CREATE TYPE public.pov_status AS ENUM ('pending', 'submitted', 'approved', 'rejected');

-- Create POV verification holds table
CREATE TABLE public.pov_verification_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  match_result_id UUID REFERENCES public.match_results(id) ON DELETE SET NULL,
  prize_amount_held NUMERIC NOT NULL DEFAULT 0,
  status public.pov_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  pov_video_url TEXT,
  handcam_video_url TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pov_verification_holds ENABLE ROW LEVEL SECURITY;

-- Admin read/write policy using has_role function
CREATE POLICY "Admins can manage POV holds"
  ON public.pov_verification_holds
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own holds
CREATE POLICY "Users can view own POV holds"
  ON public.pov_verification_holds
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own pending holds (to submit videos)
CREATE POLICY "Users can submit POV videos"
  ON public.pov_verification_holds
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_pov_verification_holds_updated_at
  BEFORE UPDATE ON public.pov_verification_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_pov_holds_user_id ON public.pov_verification_holds(user_id);
CREATE INDEX idx_pov_holds_match_id ON public.pov_verification_holds(match_id);
CREATE INDEX idx_pov_holds_status ON public.pov_verification_holds(status);