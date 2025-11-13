-- Create agent commission settings table
CREATE TABLE IF NOT EXISTS public.agent_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_rate NUMERIC NOT NULL DEFAULT 1.0,
  withdrawal_rate NUMERIC NOT NULL DEFAULT 0.5,
  min_transaction_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create agent commission earnings table
CREATE TABLE IF NOT EXISTS public.agent_commission_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  transaction_id UUID NOT NULL REFERENCES public.agent_transactions(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  transaction_amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commission_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_commission_settings
CREATE POLICY "Admins can manage commission settings"
ON public.agent_commission_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view commission settings"
ON public.agent_commission_settings
FOR SELECT
USING (is_active = true);

-- RLS Policies for agent_commission_earnings
CREATE POLICY "Admins can view all commission earnings"
ON public.agent_commission_earnings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view own commission earnings"
ON public.agent_commission_earnings
FOR SELECT
USING (auth.uid() = agent_id);

-- Insert default commission settings
INSERT INTO public.agent_commission_settings (deposit_rate, withdrawal_rate, min_transaction_amount, is_active)
VALUES (1.0, 0.5, 0, true);

-- Function to calculate and create commission
CREATE OR REPLACE FUNCTION public.calculate_agent_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_settings RECORD;
BEGIN
  -- Get active commission settings
  SELECT * INTO v_settings
  FROM public.agent_commission_settings
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Only process completed transactions
  IF NEW.status = 'completed' THEN
    -- Determine commission rate based on transaction type
    IF NEW.transaction_type = 'deposit' THEN
      v_commission_rate := COALESCE(v_settings.deposit_rate, 1.0);
    ELSIF NEW.transaction_type = 'withdrawal' THEN
      v_commission_rate := COALESCE(v_settings.withdrawal_rate, 0.5);
    ELSE
      v_commission_rate := 0;
    END IF;
    
    -- Calculate commission amount (rate is in percentage)
    v_commission_amount := (NEW.amount * v_commission_rate / 100);
    
    -- Only create commission if amount meets minimum threshold
    IF NEW.amount >= COALESCE(v_settings.min_transaction_amount, 0) AND v_commission_amount > 0 THEN
      -- Insert commission earning record
      INSERT INTO public.agent_commission_earnings (
        agent_id,
        transaction_id,
        transaction_type,
        transaction_amount,
        commission_rate,
        commission_amount
      ) VALUES (
        NEW.agent_id,
        NEW.id,
        NEW.transaction_type,
        NEW.amount,
        v_commission_rate,
        v_commission_amount
      );
      
      -- Credit commission to agent's wallet
      UPDATE public.wallets
      SET balance = balance + v_commission_amount,
          updated_at = now()
      WHERE user_id = NEW.agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic commission calculation
CREATE TRIGGER trigger_calculate_agent_commission
AFTER INSERT OR UPDATE OF status ON public.agent_transactions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_agent_commission();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_agent_commission_earnings_agent_id 
ON public.agent_commission_earnings(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_commission_earnings_created_at 
ON public.agent_commission_earnings(created_at DESC);