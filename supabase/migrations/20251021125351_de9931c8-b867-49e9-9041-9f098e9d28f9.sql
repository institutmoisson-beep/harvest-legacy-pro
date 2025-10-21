-- Update handle_new_user to properly handle referrals
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_user_id UUID;
  current_referrer_id UUID;
  current_level INT := 1;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    public.generate_referral_code()
  );
  
  -- Create wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Handle referral if code was provided
  IF NEW.raw_user_meta_data->>'referred_by_code' IS NOT NULL THEN
    -- Find the referrer by their referral code
    SELECT id INTO referrer_user_id
    FROM public.profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referred_by_code'
    LIMIT 1;
    
    IF referrer_user_id IS NOT NULL THEN
      -- Update the new user's referred_by field
      UPDATE public.profiles
      SET referred_by = referrer_user_id
      WHERE id = NEW.id;
      
      -- Create referral entries for all levels up the chain
      current_referrer_id := referrer_user_id;
      
      WHILE current_referrer_id IS NOT NULL AND current_level <= 10 LOOP
        -- Insert referral entry
        INSERT INTO public.referrals (referrer_id, referred_id, level)
        VALUES (current_referrer_id, NEW.id, current_level);
        
        -- Get the next level referrer
        SELECT referred_by INTO current_referrer_id
        FROM public.profiles
        WHERE id = current_referrer_id;
        
        current_level := current_level + 1;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;