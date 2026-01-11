-- Update the user code generator to create format like #43838 (random 5 digits)
CREATE OR REPLACE FUNCTION public.generate_5digit_user_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_code text;
    code_exists boolean;
BEGIN
    LOOP
        -- Generate random 5 digit number between 10000 and 99999
        new_code := floor(random() * 90000 + 10000)::int::text;
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_code = new_code) INTO code_exists;
        
        -- Exit loop if code is unique
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$;

-- Update handle_new_user to use the new code format
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    
    -- Insert the new profile
    INSERT INTO public.profiles (id, phone, email, user_code, referral_code, referred_by)
    VALUES (
        NEW.id,
        NEW.phone,
        NEW.email,
        new_code,
        new_referral_code,
        ref_code
    );
    
    -- Process referral if there's a valid referral code
    IF ref_code IS NOT NULL AND ref_code != '' THEN
        -- Find the referrer by their referral_code
        SELECT id INTO referrer_user_id 
        FROM public.profiles 
        WHERE referral_code = ref_code;
        
        IF referrer_user_id IS NOT NULL THEN
            -- Create referral record
            INSERT INTO public.referrals (referrer_id, referred_id, referral_code, reward_amount, is_rewarded)
            VALUES (referrer_user_id, NEW.id, ref_code, 10, false);
            
            -- Credit referrer immediately with ₹10
            UPDATE public.profiles 
            SET wallet_balance = COALESCE(wallet_balance, 0) + 10
            WHERE id = referrer_user_id;
            
            -- Mark referral as rewarded
            UPDATE public.referrals 
            SET is_rewarded = true 
            WHERE referrer_id = referrer_user_id AND referred_id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;