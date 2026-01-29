-- Add status column to referrals to track the reward eligibility
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add comment for status: 'pending' = waiting for bank card + deposit, 'eligible' = ready for reward, 'rewarded' = reward given

-- Update the handle_new_user function to NOT give instant reward
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_code text;
    ref_code text;
    referrer_user_id uuid;
    new_referral_code text;
BEGIN
    -- Generate unique 5-digit user code
    new_code := public.generate_5digit_user_code();

    -- Generate unique referral code (uppercase alphanumeric)
    new_referral_code := upper(substr(md5(random()::text), 1, 8));

    -- Extract referral code from metadata if present
    ref_code := NEW.raw_user_meta_data->>'referred_by';

    -- If referral code provided, resolve it to a referrer user id
    IF ref_code IS NOT NULL AND ref_code <> '' THEN
        SELECT p.id
        INTO referrer_user_id
        FROM public.profiles p
        WHERE p.referral_code = upper(ref_code)
        LIMIT 1;
    ELSE
        referrer_user_id := NULL;
    END IF;

    -- Insert the new profile (referred_by is a UUID, so store the resolved referrer id)
    INSERT INTO public.profiles (id, phone, email, user_code, referral_code, referred_by)
    VALUES (
        NEW.id,
        NEW.phone,
        NEW.email,
        new_code,
        new_referral_code,
        referrer_user_id
    );

    -- Process referral if there's a valid referrer
    -- Note: Reward is NOT given here anymore - it will be given after bank card binding + first deposit
    IF referrer_user_id IS NOT NULL THEN
        -- Create referral record with status 'pending'
        INSERT INTO public.referrals (referrer_id, referred_id, referral_code, reward_amount, is_rewarded, status)
        VALUES (referrer_user_id, NEW.id, upper(ref_code), 0, false, 'pending');
    END IF;

    RETURN NEW;
END;
$function$;

-- Create function to check and process referral reward when conditions are met
CREATE OR REPLACE FUNCTION public.check_referral_eligibility(p_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_has_bank_card BOOLEAN;
  v_has_deposit BOOLEAN;
  v_referral RECORD;
  v_referrer_id UUID;
  v_reward_amount NUMERIC := 10;
BEGIN
  -- Check if user has bank card linked
  SELECT EXISTS(
    SELECT 1 FROM public.user_bank_cards WHERE user_id = p_user_id
  ) INTO v_has_bank_card;
  
  -- Check if user has at least one completed deposit
  SELECT EXISTS(
    SELECT 1 FROM public.transactions 
    WHERE user_id = p_user_id 
    AND type = 'deposit' 
    AND status = 'completed'
  ) INTO v_has_deposit;
  
  -- If both conditions met, check for pending referral
  IF v_has_bank_card AND v_has_deposit THEN
    -- Find the referral record for this user
    SELECT * INTO v_referral 
    FROM public.referrals 
    WHERE referred_id = p_user_id AND status = 'pending'
    LIMIT 1;
    
    IF v_referral IS NOT NULL THEN
      v_referrer_id := v_referral.referrer_id;
      
      -- Update referral status and give reward
      UPDATE public.referrals
      SET status = 'rewarded', 
          is_rewarded = true, 
          reward_amount = v_reward_amount
      WHERE id = v_referral.id;
      
      -- Credit referrer wallet
      UPDATE public.profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward_amount
      WHERE id = v_referrer_id;
      
      -- Create transaction record for referrer
      INSERT INTO public.transactions (user_id, type, amount, status, description)
      VALUES (v_referrer_id, 'prize', v_reward_amount, 'completed', 'Referral bonus - friend completed verification');
      
      -- Notify referrer
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        v_referrer_id,
        'referral',
        '🎉 Referral Reward!',
        'Your friend completed verification! ₹' || v_reward_amount || ' added to your wallet.'
      );
      
      RETURN json_build_object('success', true, 'message', 'Referral reward processed', 'reward', v_reward_amount);
    END IF;
  END IF;
  
  RETURN json_build_object('success', false, 'has_bank_card', v_has_bank_card, 'has_deposit', v_has_deposit);
END;
$function$;

-- Trigger to check referral eligibility when deposit is completed
CREATE OR REPLACE FUNCTION public.trigger_check_referral_on_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check when a deposit is marked as completed
  IF NEW.type = 'deposit' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.check_referral_eligibility(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS check_referral_on_deposit ON public.transactions;
CREATE TRIGGER check_referral_on_deposit
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_referral_on_deposit();

-- Trigger to check referral eligibility when bank card is added
CREATE OR REPLACE FUNCTION public.trigger_check_referral_on_bank_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check referral eligibility when bank card is added
  PERFORM public.check_referral_eligibility(NEW.user_id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS check_referral_on_bank_card ON public.user_bank_cards;
CREATE TRIGGER check_referral_on_bank_card
AFTER INSERT ON public.user_bank_cards
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_referral_on_bank_card();