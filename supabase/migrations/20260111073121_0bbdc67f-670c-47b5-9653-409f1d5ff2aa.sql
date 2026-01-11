-- Create daily_login_bonus table to track user login streaks and coins
CREATE TABLE public.daily_login_bonus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_claim_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.daily_login_bonus ENABLE ROW LEVEL SECURITY;

-- Users can read their own bonus data
CREATE POLICY "Users can view their own bonus" 
ON public.daily_login_bonus 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own bonus record
CREATE POLICY "Users can insert their own bonus" 
ON public.daily_login_bonus 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own bonus
CREATE POLICY "Users can update their own bonus" 
ON public.daily_login_bonus 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to claim daily bonus
CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _bonus_record RECORD;
  _today DATE := CURRENT_DATE;
  _yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  _new_streak INTEGER;
  _coins_earned INTEGER := 10;
  _wallet_credit NUMERIC;
  _result JSON;
BEGIN
  -- Get the current user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Get or create bonus record
  SELECT * INTO _bonus_record FROM daily_login_bonus WHERE user_id = _user_id;
  
  IF _bonus_record IS NULL THEN
    -- First time user - create record and give bonus
    INSERT INTO daily_login_bonus (user_id, coins, streak, last_claim_date)
    VALUES (_user_id, _coins_earned, 1, _today);
    
    _new_streak := 1;
  ELSE
    -- Check if already claimed today
    IF _bonus_record.last_claim_date = _today THEN
      RETURN json_build_object(
        'success', false, 
        'message', 'Already claimed today',
        'coins', _bonus_record.coins,
        'streak', _bonus_record.streak,
        'next_claim', _today + INTERVAL '1 day'
      );
    END IF;
    
    -- Calculate new streak
    IF _bonus_record.last_claim_date = _yesterday THEN
      _new_streak := _bonus_record.streak + 1;
    ELSE
      _new_streak := 1; -- Reset streak if missed a day
    END IF;
    
    -- Update bonus record
    UPDATE daily_login_bonus 
    SET 
      coins = coins + _coins_earned,
      streak = _new_streak,
      last_claim_date = _today,
      updated_at = now()
    WHERE user_id = _user_id;
  END IF;
  
  -- Get updated coins
  SELECT coins INTO _bonus_record FROM daily_login_bonus WHERE user_id = _user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Daily bonus claimed!',
    'coins_earned', _coins_earned,
    'total_coins', _bonus_record.coins,
    'streak', _new_streak,
    'next_claim', _today + INTERVAL '1 day'
  );
END;
$$;

-- Create function to convert coins to wallet balance
CREATE OR REPLACE FUNCTION public.convert_coins_to_wallet(coins_to_convert INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _current_coins INTEGER;
  _rupees_earned NUMERIC;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Minimum 100 coins to convert
  IF coins_to_convert < 100 THEN
    RETURN json_build_object('success', false, 'message', 'Minimum 100 coins required to convert');
  END IF;
  
  -- Check user has enough coins
  SELECT coins INTO _current_coins FROM daily_login_bonus WHERE user_id = _user_id;
  
  IF _current_coins IS NULL OR _current_coins < coins_to_convert THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient coins');
  END IF;
  
  -- Calculate rupees (100 coins = 10 Rs)
  _rupees_earned := (coins_to_convert::NUMERIC / 100) * 10;
  
  -- Deduct coins
  UPDATE daily_login_bonus 
  SET coins = coins - coins_to_convert, updated_at = now()
  WHERE user_id = _user_id;
  
  -- Add to wallet
  UPDATE profiles 
  SET wallet_balance = COALESCE(wallet_balance, 0) + _rupees_earned
  WHERE id = _user_id;
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (_user_id, 'admin_credit', _rupees_earned, 'completed', 'Converted ' || coins_to_convert || ' coins to wallet');
  
  RETURN json_build_object(
    'success', true,
    'message', 'Coins converted successfully!',
    'coins_converted', coins_to_convert,
    'rupees_earned', _rupees_earned
  );
END;
$$;