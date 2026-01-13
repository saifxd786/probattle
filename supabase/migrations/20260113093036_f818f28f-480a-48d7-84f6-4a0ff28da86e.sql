-- Add pending_rewards column to referrals for claimable rewards
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS pending_reward numeric DEFAULT 0;

-- Create a function to track referral commission on deposits
CREATE OR REPLACE FUNCTION public.track_referral_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id uuid;
  v_commission numeric;
BEGIN
  -- Only process completed deposits
  IF NEW.type = 'deposit' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Find the referrer of this user
    SELECT referrer_id INTO v_referrer_id
    FROM public.referrals
    WHERE referred_id = NEW.user_id
    LIMIT 1;
    
    IF v_referrer_id IS NOT NULL THEN
      -- Calculate 2.5% commission
      v_commission := NEW.amount * 0.025;
      
      -- Add to pending reward
      UPDATE public.referrals
      SET pending_reward = COALESCE(pending_reward, 0) + v_commission
      WHERE referred_id = NEW.user_id AND referrer_id = v_referrer_id;
      
      -- Create a notification for the referrer
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        v_referrer_id, 
        'referral_commission', 
        'Referral Commission!',
        'Your referral deposited ₹' || NEW.amount || '. You earned ₹' || v_commission || ' commission!',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for tracking deposits
DROP TRIGGER IF EXISTS on_deposit_completed ON public.transactions;
CREATE TRIGGER on_deposit_completed
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.track_referral_deposit();

-- Create function to claim referral rewards
CREATE OR REPLACE FUNCTION public.claim_referral_rewards()
RETURNS json AS $$
DECLARE
  v_total_pending numeric;
BEGIN
  -- Get total pending rewards for this user
  SELECT COALESCE(SUM(pending_reward), 0) INTO v_total_pending
  FROM public.referrals
  WHERE referrer_id = auth.uid();
  
  IF v_total_pending <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'No pending rewards to claim');
  END IF;
  
  -- Add to wallet balance
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_total_pending
  WHERE id = auth.uid();
  
  -- Update referrals - add to reward_amount and mark as rewarded, reset pending
  UPDATE public.referrals
  SET 
    reward_amount = COALESCE(reward_amount, 0) + pending_reward,
    pending_reward = 0,
    is_rewarded = true
  WHERE referrer_id = auth.uid() AND pending_reward > 0;
  
  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (
    auth.uid(),
    'prize',
    v_total_pending,
    'completed',
    'Referral commission claimed'
  );
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Rewards claimed successfully!',
    'amount', v_total_pending
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;