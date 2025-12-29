-- Create match_results table for storing winner/loser data
CREATE TABLE public.match_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  registration_id UUID REFERENCES public.match_registrations(id) ON DELETE CASCADE,
  position INTEGER, -- 1st, 2nd, 3rd etc
  kills INTEGER DEFAULT 0,
  prize_amount NUMERIC DEFAULT 0.00,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, user_id)
);

-- Enable RLS
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all results"
ON public.match_results
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own results"
ON public.match_results
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view results"
ON public.match_results
FOR SELECT
USING (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;