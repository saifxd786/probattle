-- Drop and recreate functions for deposit-based spin eligibility
-- 1 spin per 1000 rupees deposited (not cooldown based)

CREATE OR REPLACE FUNCTION public.check_spin_availability()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_total_deposits NUMERIC;
  v_total_spins INTEGER;
  v_available_spins INTEGER;
  v_required_deposit NUMERIC;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated', 'can_spin', false);
  END IF;
  
  -- Get required deposit per spin from settings
  SELECT required_deposit INTO v_required_deposit
  FROM spin_wheel_settings
  WHERE is_enabled = true
  LIMIT 1;
  
  IF v_required_deposit IS NULL THEN
    RETURN json_build_object('can_spin', false, 'message', 'Spin wheel is disabled', 'available_spins', 0);
  END IF;
  
  -- Calculate total completed deposits
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
  FROM transactions
  WHERE user_id = v_user_id
    AND type = 'deposit'
    AND status = 'completed';
  
  -- Calculate total spins used
  SELECT COUNT(*) INTO v_total_spins
  FROM spin_wheel
  WHERE user_id = v_user_id;
  
  -- Calculate available spins (1 spin per required_deposit amount)
  v_available_spins := GREATEST(0, FLOOR(v_total_deposits / v_required_deposit)::INTEGER - v_total_spins);
  
  RETURN json_build_object(
    'can_spin', v_available_spins > 0,
    'available_spins', v_available_spins,
    'total_deposits', v_total_deposits,
    'total_spins_used', v_total_spins,
    'required_per_spin', v_required_deposit
  );
END;
$$;

-- Update spin_wheel function to check deposit-based eligibility
CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_total_deposits NUMERIC;
  v_total_spins INTEGER;
  v_available_spins INTEGER;
  v_required_deposit NUMERIC;
  v_random_num FLOAT;
  v_reward_amount INTEGER;
  v_segment_values INTEGER[];
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get settings
  SELECT required_deposit, segment_values INTO v_required_deposit, v_segment_values
  FROM spin_wheel_settings
  WHERE is_enabled = true
  LIMIT 1;
  
  IF v_required_deposit IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Spin wheel is disabled');
  END IF;
  
  -- Calculate total completed deposits
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
  FROM transactions
  WHERE user_id = v_user_id
    AND type = 'deposit'
    AND status = 'completed';
  
  -- Calculate total spins used
  SELECT COUNT(*) INTO v_total_spins
  FROM spin_wheel
  WHERE user_id = v_user_id;
  
  -- Check if user has available spins
  v_available_spins := GREATEST(0, FLOOR(v_total_deposits / v_required_deposit)::INTEGER - v_total_spins);
  
  IF v_available_spins <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No spins available. Deposit ₹' || v_required_deposit || ' to unlock a spin.'
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
    'reward_amount', v_reward_amount,
    'remaining_spins', v_available_spins - 1
  );
END;
$$;