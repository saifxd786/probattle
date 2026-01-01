-- Create thimble game difficulty enum
CREATE TYPE public.thimble_difficulty AS ENUM ('easy', 'hard', 'impossible');

-- Create thimble settings table
CREATE TABLE public.thimble_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    is_enabled boolean NOT NULL DEFAULT true,
    difficulty thimble_difficulty NOT NULL DEFAULT 'easy',
    min_entry_amount numeric NOT NULL DEFAULT 100,
    reward_multiplier numeric NOT NULL DEFAULT 1.5,
    platform_commission numeric NOT NULL DEFAULT 0.1,
    shuffle_duration_easy integer NOT NULL DEFAULT 3000,
    shuffle_duration_hard integer NOT NULL DEFAULT 2000,
    shuffle_duration_impossible integer NOT NULL DEFAULT 1200,
    selection_time_easy integer NOT NULL DEFAULT 10,
    selection_time_hard integer NOT NULL DEFAULT 6,
    selection_time_impossible integer NOT NULL DEFAULT 3,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create thimble games table
CREATE TABLE public.thimble_games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    entry_amount numeric NOT NULL,
    reward_amount numeric NOT NULL,
    ball_position integer NOT NULL,
    selected_position integer,
    is_win boolean,
    difficulty thimble_difficulty NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.thimble_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thimble_games ENABLE ROW LEVEL SECURITY;

-- RLS for thimble_settings
CREATE POLICY "Anyone can view thimble settings" ON public.thimble_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can update thimble settings" ON public.thimble_settings
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- RLS for thimble_games
CREATE POLICY "Users can view their own thimble games" ON public.thimble_games
FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own thimble games" ON public.thimble_games
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own thimble games" ON public.thimble_games
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all thimble games" ON public.thimble_games
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.thimble_settings (id) VALUES (gen_random_uuid());