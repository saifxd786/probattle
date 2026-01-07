-- Create mines_settings table
CREATE TABLE public.mines_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  min_entry_amount NUMERIC NOT NULL DEFAULT 10,
  platform_commission NUMERIC NOT NULL DEFAULT 0.1,
  grid_size INTEGER NOT NULL DEFAULT 25,
  min_mines INTEGER NOT NULL DEFAULT 1,
  max_mines INTEGER NOT NULL DEFAULT 24,
  base_multiplier NUMERIC NOT NULL DEFAULT 1.03,
  difficulty TEXT NOT NULL DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mines_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage settings
CREATE POLICY "Admins can manage mines settings" ON public.mines_settings
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Allow all to read settings
CREATE POLICY "Anyone can read mines settings" ON public.mines_settings
FOR SELECT USING (true);

-- Create mines_games table
CREATE TABLE public.mines_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_amount NUMERIC NOT NULL,
  mines_count INTEGER NOT NULL,
  mine_positions INTEGER[] NOT NULL,
  revealed_positions INTEGER[] NOT NULL DEFAULT '{}',
  current_multiplier NUMERIC NOT NULL DEFAULT 1,
  potential_win NUMERIC NOT NULL DEFAULT 0,
  is_cashed_out BOOLEAN DEFAULT false,
  is_mine_hit BOOLEAN DEFAULT false,
  final_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'won', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.mines_games ENABLE ROW LEVEL SECURITY;

-- Users can view their own games
CREATE POLICY "Users can view their own mines games" ON public.mines_games
FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own games
CREATE POLICY "Users can create their own mines games" ON public.mines_games
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own games
CREATE POLICY "Users can update their own mines games" ON public.mines_games
FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all games
CREATE POLICY "Admins can view all mines games" ON public.mines_games
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.mines_settings (is_enabled, min_entry_amount, platform_commission, grid_size, min_mines, max_mines, base_multiplier, difficulty)
VALUES (true, 10, 0.1, 25, 1, 24, 1.03, 'normal');

-- Create trigger for updated_at
CREATE TRIGGER update_mines_settings_updated_at
BEFORE UPDATE ON public.mines_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();