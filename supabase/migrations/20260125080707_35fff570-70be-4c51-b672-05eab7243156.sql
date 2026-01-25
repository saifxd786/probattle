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
    IF referrer_user_id IS NOT NULL THEN
        -- Create referral record
        INSERT INTO public.referrals (referrer_id, referred_id, referral_code, reward_amount, is_rewarded)
        VALUES (referrer_user_id, NEW.id, upper(ref_code), 10, false);

        -- Credit referrer immediately with ₹10
        UPDATE public.profiles
        SET wallet_balance = COALESCE(wallet_balance, 0) + 10
        WHERE id = referrer_user_id;

        -- Mark referral as rewarded
        UPDATE public.referrals
        SET is_rewarded = true
        WHERE referrer_id = referrer_user_id AND referred_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$function$;