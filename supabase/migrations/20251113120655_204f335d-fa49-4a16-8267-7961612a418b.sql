-- Add missing RLS policies for shop_qr_codes table
CREATE POLICY "Shop owners can view their QR codes"
ON public.shop_qr_codes
FOR SELECT
USING (
  shop_id IN (
    SELECT id FROM public.shop_settings 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all QR codes"
ON public.shop_qr_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Shop owners can create QR codes"
ON public.shop_qr_codes
FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT id FROM public.shop_settings 
    WHERE user_id = auth.uid()
  )
);

-- Add RLS policies for treasury_withdrawals table
CREATE POLICY "Admins can view all treasury withdrawals"
ON public.treasury_withdrawals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create treasury withdrawals"
ON public.treasury_withdrawals
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure all views have proper access control through base table RLS
-- Views inherit RLS from their underlying tables, so no additional policies needed

-- Add indexes for better RLS policy performance
CREATE INDEX IF NOT EXISTS idx_shop_qr_codes_shop_id 
ON public.shop_qr_codes(shop_id);

CREATE INDEX IF NOT EXISTS idx_agent_transactions_agent_status 
ON public.agent_transactions(agent_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_transactions_created_month 
ON public.agent_transactions(agent_id, created_at) 
WHERE status = 'completed';