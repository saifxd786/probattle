-- Create weekly_login_rewards table for 7-day daily login system
CREATE TABLE public.weekly_login_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reward_amount INTEGER NOT NULL DEFAULT 10,
  week_start DATE NOT NULL, -- To track which week this claim belongs to
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_login_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own rewards" ON public.weekly_login_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can claim rewards through function" ON public.weekly_login_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create spin_wheel table for tracking spins
CREATE TABLE public.spin_wheel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_amount INTEGER NOT NULL,
  spun_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spin_wheel ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own spins" ON public.spin_wheel
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can spin through function" ON public.spin_wheel
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create spin_wheel_settings table
CREATE TABLE public.spin_wheel_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  cooldown_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for settings (admin only for write, all can read)
ALTER TABLE public.spin_wheel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read spin settings" ON public.spin_wheel_settings
  FOR SELECT USING (true);

-- Insert default settings
INSERT INTO public.spin_wheel_settings (is_enabled, cooldown_hours) VALUES (true, 24);

-- Function to claim daily login reward (server-side validation)
CREATE OR REPLACE FUNCTION public.claim_weekly_login_reward()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_today INTEGER;
  v_week_start DATE;
  v_reward_amount INTEGER;
  v_already_claimed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get current day of week (0=Sunday, 1=Monday, etc.) using server time
  v_today := EXTRACT(DOW FROM now());
  
  -- Calculate the start of current week (Sunday)
  v_week_start := date_trunc('week', now())::DATE - INTERVAL '1 day';
  
  -- Define reward amounts for each day
  v_reward_amount := CASE v_today
    WHEN 0 THEN 50  -- Sunday (bonus day)
    WHEN 1 THEN 10  -- Monday
    WHEN 2 THEN 15  -- Tuesday
    WHEN 3 THEN 20  -- Wednesday
    WHEN 4 THEN 25  -- Thursday
    WHEN 5 THEN 30  -- Friday
    WHEN 6 THEN 40  -- Saturday
    ELSE 10
  END;
  
  -- Check if already claimed today
  SELECT EXISTS(
    SELECT 1 FROM weekly_login_rewards
    WHERE user_id = v_user_id
      AND day_of_week = v_today
      AND week_start = v_week_start
  ) INTO v_already_claimed;
  
  IF v_already_claimed THEN
    RETURN json_build_object('success', false, 'message', 'Already claimed today''s reward');
  END IF;
  
  -- Insert the claim
  INSERT INTO weekly_login_rewards (user_id, day_of_week, reward_amount, week_start)
  VALUES (v_user_id, v_today, v_reward_amount, v_week_start);
  
  -- Add to wallet balance
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward_amount
  WHERE id = v_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Reward claimed successfully',
    'reward_amount', v_reward_amount,
    'day_of_week', v_today
  );
END;
$$;

-- Function to get weekly login status
CREATE OR REPLACE FUNCTION public.get_weekly_login_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_today INTEGER;
  v_week_start DATE;
  v_claimed_days INTEGER[];
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  v_today := EXTRACT(DOW FROM now());
  v_week_start := date_trunc('week', now())::DATE - INTERVAL '1 day';
  
  SELECT ARRAY_AGG(day_of_week) INTO v_claimed_days
  FROM weekly_login_rewards
  WHERE user_id = v_user_id
    AND week_start = v_week_start;
  
  RETURN json_build_object(
    'success', true,
    'today', v_today,
    'week_start', v_week_start,
    'claimed_days', COALESCE(v_claimed_days, ARRAY[]::INTEGER[])
  );
END;
$$;

-- Function to spin the wheel (server-side with probabilities)
CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_last_spin TIMESTAMP WITH TIME ZONE;
  v_cooldown_hours INTEGER;
  v_random_num FLOAT;
  v_reward_amount INTEGER;
  v_can_spin BOOLEAN;
  v_next_spin_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get cooldown from settings
  SELECT cooldown_hours INTO v_cooldown_hours
  FROM spin_wheel_settings
  WHERE is_enabled = true
  LIMIT 1;
  
  IF v_cooldown_hours IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Spin wheel is disabled');
  END IF;
  
  -- Check last spin time
  SELECT spun_at INTO v_last_spin
  FROM spin_wheel
  WHERE user_id = v_user_id
  ORDER BY spun_at DESC
  LIMIT 1;
  
  v_can_spin := v_last_spin IS NULL OR (now() - v_last_spin) > (v_cooldown_hours || ' hours')::INTERVAL;
  
  IF NOT v_can_spin THEN
    v_next_spin_at := v_last_spin + (v_cooldown_hours || ' hours')::INTERVAL;
    RETURN json_build_object(
      'success', false,
      'message', 'Spin on cooldown',
      'next_spin_at', v_next_spin_at
    );
  END IF;
  
  -- Generate random number and determine reward
  -- Probabilities: 99% for 10/20, 0.5% for 100, 0.25% for 300, 0.15% for 500, 0.07% for 1000, 0.03% for 5000
  v_random_num := random();
  
  v_reward_amount := CASE
    WHEN v_random_num < 0.50 THEN 10      -- 50% chance
    WHEN v_random_num < 0.99 THEN 20      -- 49% chance
    WHEN v_random_num < 0.995 THEN 100    -- 0.5% chance
    WHEN v_random_num < 0.9975 THEN 300   -- 0.25% chance
    WHEN v_random_num < 0.999 THEN 500    -- 0.15% chance
    WHEN v_random_num < 0.9997 THEN 1000  -- 0.07% chance
    ELSE 5000                              -- 0.03% chance
  END;
  
  -- Record the spin
  INSERT INTO spin_wheel (user_id, reward_amount)
  VALUES (v_user_id, v_reward_amount);
  
  -- Add to wallet
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward_amount
  WHERE id = v_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Spin successful',
    'reward_amount', v_reward_amount
  );
END;
$$;

-- Function to check spin availability
CREATE OR REPLACE FUNCTION public.check_spin_availability()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_last_spin TIMESTAMP WITH TIME ZONE;
  v_cooldown_hours INTEGER;
  v_can_spin BOOLEAN;
  v_next_spin_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  SELECT cooldown_hours INTO v_cooldown_hours
  FROM spin_wheel_settings
  WHERE is_enabled = true
  LIMIT 1;
  
  IF v_cooldown_hours IS NULL THEN
    RETURN json_build_object('can_spin', false, 'message', 'Spin wheel is disabled');
  END IF;
  
  SELECT spun_at INTO v_last_spin
  FROM spin_wheel
  WHERE user_id = v_user_id
  ORDER BY spun_at DESC
  LIMIT 1;
  
  v_can_spin := v_last_spin IS NULL OR (now() - v_last_spin) > (v_cooldown_hours || ' hours')::INTERVAL;
  v_next_spin_at := CASE WHEN v_last_spin IS NOT NULL THEN v_last_spin + (v_cooldown_hours || ' hours')::INTERVAL ELSE NULL END;
  
  RETURN json_build_object(
    'can_spin', v_can_spin,
    'last_spin', v_last_spin,
    'next_spin_at', v_next_spin_at,
    'cooldown_hours', v_cooldown_hours
  );
END;
$$;