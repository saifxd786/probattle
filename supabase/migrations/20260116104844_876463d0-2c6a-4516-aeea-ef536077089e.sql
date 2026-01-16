-- Update claim_weekly_login_reward to add 50 bonus coins on Sunday if user has 7-day streak
CREATE OR REPLACE FUNCTION public.claim_weekly_login_reward()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_today INTEGER;
  v_week_start DATE;
  v_reward_amount INTEGER := 10;
  v_streak_bonus INTEGER := 0;
  v_already_claimed BOOLEAN;
  v_current_streak INTEGER;
  v_last_claim DATE;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get current day of week (1=Monday, 7=Sunday) using server time
  v_today := EXTRACT(ISODOW FROM now())::INTEGER;
  
  -- Calculate the start of current week (Monday)
  v_week_start := date_trunc('week', now())::DATE;
  
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
  
  -- Get current streak from daily_login_bonus table
  SELECT streak, last_claim_date::DATE INTO v_current_streak, v_last_claim
  FROM daily_login_bonus
  WHERE user_id = v_user_id;
  
  -- Update streak logic
  IF v_last_claim IS NULL THEN
    v_current_streak := 1;
  ELSIF v_last_claim = (now()::DATE - INTERVAL '1 day')::DATE THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSIF v_last_claim = now()::DATE THEN
    -- Already claimed today, keep current streak
    v_current_streak := COALESCE(v_current_streak, 1);
  ELSE
    v_current_streak := 1;
  END IF;
  
  -- Cap streak at 7
  IF v_current_streak > 7 THEN
    v_current_streak := 7;
  END IF;
  
  -- Check for 7-day streak bonus on Sunday (day 7)
  IF v_today = 7 AND v_current_streak = 7 THEN
    v_streak_bonus := 50;
  END IF;
  
  -- Insert or update daily_login_bonus record
  INSERT INTO daily_login_bonus (user_id, coins, streak, last_claim_date)
  VALUES (v_user_id, 10 + v_streak_bonus, v_current_streak, now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    coins = daily_login_bonus.coins + 10 + v_streak_bonus,
    streak = v_current_streak,
    last_claim_date = now(),
    updated_at = now();
  
  -- Insert the claim record
  INSERT INTO weekly_login_rewards (user_id, day_of_week, reward_amount, week_start)
  VALUES (v_user_id, v_today, v_reward_amount + v_streak_bonus, v_week_start);
  
  RETURN json_build_object(
    'success', true,
    'message', CASE WHEN v_streak_bonus > 0 THEN '🎉 7-Day Streak Bonus! +50 Coins!' ELSE 'Reward claimed successfully' END,
    'reward_amount', v_reward_amount,
    'streak_bonus', v_streak_bonus,
    'total_reward', v_reward_amount + v_streak_bonus,
    'day_of_week', v_today,
    'streak', v_current_streak
  );
END;
$$;

-- Update get_weekly_login_status to include streak info
CREATE OR REPLACE FUNCTION public.get_weekly_login_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_week_start DATE;
  v_claimed_days INTEGER[];
  v_today INTEGER;
  v_can_claim BOOLEAN;
  v_streak INTEGER;
  v_coins INTEGER;
  v_last_claim DATE;
  v_streak_bonus_available BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  v_today := EXTRACT(ISODOW FROM now())::INTEGER;
  v_week_start := date_trunc('week', now())::DATE;
  
  -- Get claimed days this week
  SELECT ARRAY_AGG(day_of_week ORDER BY day_of_week)
  INTO v_claimed_days
  FROM weekly_login_rewards
  WHERE user_id = v_user_id AND week_start = v_week_start;
  
  -- Check if can claim today
  v_can_claim := NOT (v_today = ANY(COALESCE(v_claimed_days, '{}'::INTEGER[])));
  
  -- Get streak and coins from daily_login_bonus
  SELECT streak, coins, last_claim_date::DATE INTO v_streak, v_coins, v_last_claim
  FROM daily_login_bonus
  WHERE user_id = v_user_id;
  
  -- Reset streak if more than 1 day since last claim
  IF v_last_claim IS NOT NULL AND v_last_claim < (now()::DATE - INTERVAL '1 day')::DATE THEN
    v_streak := 0;
  END IF;
  
  -- Check if 7-day streak bonus is available (Sunday + 6 consecutive days)
  IF v_today = 7 AND COALESCE(v_streak, 0) = 6 AND v_can_claim THEN
    v_streak_bonus_available := true;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'claimed_days', COALESCE(v_claimed_days, '{}'::INTEGER[]),
    'today', v_today,
    'can_claim', v_can_claim,
    'streak', COALESCE(v_streak, 0),
    'coins', COALESCE(v_coins, 0),
    'week_start', v_week_start,
    'streak_bonus_available', v_streak_bonus_available
  );
END;
$$;