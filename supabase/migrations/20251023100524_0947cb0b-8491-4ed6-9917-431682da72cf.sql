-- Improve referral system to make it more robust and traceable
-- This ensures the referral chain is properly built from signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  referrer_user_id UUID;
  current_referrer_id UUID;
  current_level INT := 1;
  max_levels CONSTANT INT := 10;
BEGIN
  -- Create profile with generated referral code
  INSERT INTO public.profiles (id, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    public.generate_referral_code()
  );
  
  -- Create wallet for new user
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Handle referral if code was provided in signup metadata
  IF NEW.raw_user_meta_data->>'referred_by_code' IS NOT NULL THEN
    -- Find the referrer by their referral code (case-insensitive)
    SELECT id INTO referrer_user_id
    FROM public.profiles
    WHERE UPPER(referral_code) = UPPER(NEW.raw_user_meta_data->>'referred_by_code')
    LIMIT 1;
    
    IF referrer_user_id IS NOT NULL THEN
      -- Update the new user's referred_by field to establish direct link
      UPDATE public.profiles
      SET referred_by = referrer_user_id
      WHERE id = NEW.id;
      
      -- Build the full referral chain up to max_levels
      current_referrer_id := referrer_user_id;
      
      WHILE current_referrer_id IS NOT NULL AND current_level <= max_levels LOOP
        -- Insert referral entry for this level
        INSERT INTO public.referrals (referrer_id, referred_id, level)
        VALUES (current_referrer_id, NEW.id, current_level)
        ON CONFLICT DO NOTHING; -- Prevent duplicates
        
        -- Get the next level referrer (parent of current referrer)
        SELECT referred_by INTO current_referrer_id
        FROM public.profiles
        WHERE id = current_referrer_id;
        
        current_level := current_level + 1;
      END LOOP;
      
      -- Log successful referral creation
      RAISE NOTICE 'Referral chain created for user % with % levels', NEW.id, current_level - 1;
    ELSE
      -- Log when referral code is invalid
      RAISE WARNING 'Invalid referral code provided: %', NEW.raw_user_meta_data->>'referred_by_code';
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;